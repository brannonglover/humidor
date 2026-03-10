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

function SubscriptionDeepLinkHandler() {
  const { refreshTier, user, supabase } = useAuth();
  const pendingSessionId = useRef(null);

  useEffect(() => {
    const processReturnFromCheckout = async (sessionId, accessToken) => {
      if (!sessionId || !accessToken) return;
      try {
        const { confirmCheckoutSession } = await import('./api/subscription');
        await confirmCheckoutSession(accessToken, sessionId);
      } finally {
        refreshTier?.();
      }
    };

    const handleReturnFromCheckout = async (url) => {
      if (!url?.includes('subscribe-success')) return;
      const sessionId = url.match(/session_id=([^&]+)/)?.[1];
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
        }
      } else {
        pendingSessionId.current = sessionId;
      }
    };

    const handleUrl = ({ url }) => handleReturnFromCheckout(url);
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(handleReturnFromCheckout);
    return () => sub.remove();
  }, [refreshTier, user, supabase]);

  // Process pending session when user becomes available (e.g. cold start from deep link)
  useEffect(() => {
    const sid = pendingSessionId.current;
    if (!sid || !user || !supabase) return;
    pendingSessionId.current = null;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        import('./api/subscription').then(({ confirmCheckoutSession }) =>
          confirmCheckoutSession(session.access_token, sid).finally(() => refreshTier?.())
        );
      }
    });
  }, [user, supabase, refreshTier]);

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
    height: 48,
    width: 180,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});

export default App;