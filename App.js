import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Image, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { ActionButtons } from './components/ActionButtons';
import KeyboardAccessory from './components/KeyboardAccessory';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthStack from './navigation/AuthStack';
import { ClickOutsideProvider } from 'react-native-click-outside';
import { initDatabase } from './db';
import colors from './theme/colors';

// Show auth flow (landing, login, signup) when Supabase URL is set.
// Anon key also required for sign up/login to work.
const showAuthFlow = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <Image source={require('./assets/logo-wd.png')} style={styles.loadingLogo} resizeMode="contain" />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
    </View>
  );
}

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('Database init timed out after 15s - rendering anyway');
      setIsReady(true);
    }, 15000);

    initDatabase()
      .then(() => {
        clearTimeout(timeout);
        setIsReady(true);
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('Failed to initialize database:', err);
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  // No Supabase URL: skip auth, go straight to main app
  if (!showAuthFlow) {
    return (
      <NavigationContainer>
        <ActionButtons />
      </NavigationContainer>
    );
  }

  // Auth loading: show spinner
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Not logged in: show auth flow
  if (!user) {
    return (
      <NavigationContainer>
        <AuthStack onAuthenticated={() => {}} />
      </NavigationContainer>
    );
  }

  // Logged in: main app
  return (
    <NavigationContainer>
      <ActionButtons />
    </NavigationContainer>
  );
}

const PENDING_SESSION_MAX_RETRIES = 10;

function SubscriptionDeepLinkHandler() {
  const { refreshTier, setTierFromSubscription, user, supabase } = useAuth();
  const pendingSessionId = useRef(null);
  const [pendingTrigger, setPendingTrigger] = useState(0);
  const retryCount = useRef(0);

  useEffect(() => {
    const processReturnFromCheckout = async (sessionId, accessToken) => {
      if (!sessionId || !accessToken) return;
      try {
        const { confirmCheckoutSession } = await import('./api/subscription');
        const tier = await confirmCheckoutSession(accessToken, sessionId);
        if (tier === 'premium') {
          setTierFromSubscription?.('premium');
        }
      } finally {
        refreshTier?.();
      }
    };

    const handleReturnFromCheckout = async (url) => {
      if (!url?.includes('subscribe-success')) return;
      const encoded = url.match(/session_id=([^&]+)/)?.[1];
      const sessionId = encoded ? decodeURIComponent(encoded) : null;
      if (!sessionId) {
        refreshTier?.();
        return;
      }
      if (user && supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await processReturnFromCheckout(sessionId, session.access_token);
        } else {
          pendingSessionId.current = sessionId;
          setPendingTrigger((t) => t + 1);
        }
      } else {
        pendingSessionId.current = sessionId;
        setPendingTrigger((t) => t + 1);
      }
    };

    const handleUrl = ({ url }) => handleReturnFromCheckout(url);
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(handleReturnFromCheckout);
    return () => sub.remove();
  }, [refreshTier, setTierFromSubscription, user, supabase]);

  // Process pending session when user becomes available (e.g. cold start from deep link)
  useEffect(() => {
    const sid = pendingSessionId.current;
    if (!sid || !user || !supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        pendingSessionId.current = null;
        retryCount.current = 0;
        import('./api/subscription').then(({ confirmCheckoutSession }) =>
          confirmCheckoutSession(session.access_token, sid).then((tier) => {
            if (tier === 'premium') setTierFromSubscription?.('premium');
          }).finally(() => refreshTier?.())
        );
      } else if (retryCount.current < PENDING_SESSION_MAX_RETRIES) {
        retryCount.current += 1;
        setTimeout(() => setPendingTrigger((t) => t + 1), 300);
      } else {
        pendingSessionId.current = null;
      }
    });
  }, [user, supabase, refreshTier, setTierFromSubscription, pendingTrigger]);

  return null;
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <KeyboardAccessory />
      <AuthProvider>
        <SubscriptionDeepLinkHandler />
        <ClickOutsideProvider>
          <AppContent />
        </ClickOutsideProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.screenBg,
  },
  loadingLogo: {
    height: 96,
    width: 360,
    marginBottom: 48,
  },
  spinner: {
    marginTop: 24,
  },
});

export default App;