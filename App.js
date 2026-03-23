import { useEffect, useState, useRef } from 'react';
import { Linking, View, StyleSheet, Text, Image, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainerWithAnalytics } from './components/NavigationAnalytics';
import { ActionButtons } from './components/ActionButtons';
import KeyboardAccessory from './components/KeyboardAccessory';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthStack from './navigation/AuthStack';
import { ClickOutsideProvider } from 'react-native-click-outside';
import { initDatabase } from './db';

SplashScreen.preventAutoHideAsync().catch(() => {});

const FADE_DURATION = 500;
SplashScreen.setOptions({ fade: true, duration: FADE_DURATION });

// Show auth flow (landing, login, signup) when Supabase URL is set.
// Anon key also required for sign up/login to work.
const showAuthFlow = !!process.env.EXPO_PUBLIC_SUPABASE_URL;

const SLOW_LOAD_THRESHOLD_MS = 1500;

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const [showLoadingMessage, setShowLoadingMessage] = useState(false);
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

  const isLoading = !isReady || (showAuthFlow && authLoading);

  // After a delay, show "Loading..." for slow connections (keeps native splash for fast loads)
  useEffect(() => {
    if (!isLoading) {
      setShowLoadingMessage(false);
      return;
    }
    const t = setTimeout(() => setShowLoadingMessage(true), SLOW_LOAD_THRESHOLD_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  // Hide native splash when app is ready, or when we show our custom loading screen
  useEffect(() => {
    if (!isLoading || showLoadingMessage) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading, showLoadingMessage]);

  const renderAppContent = () => {
    if (!showAuthFlow) {
      return (
        <View style={styles.appRoot}>
          <NavigationContainerWithAnalytics>
            <ActionButtons />
          </NavigationContainerWithAnalytics>
        </View>
      );
    }
    if (!user) {
      return (
        <NavigationContainerWithAnalytics>
          <AuthStack onAuthenticated={() => {}} />
        </NavigationContainerWithAnalytics>
      );
    }
    return (
      <View style={styles.appRoot}>
        <NavigationContainerWithAnalytics>
          <ActionButtons />
        </NavigationContainerWithAnalytics>
      </View>
    );
  };

  if (isLoading && showLoadingMessage) {
    return (
      <View style={styles.loadingScreen}>
        <Image
          source={require('./assets/logo-wd.png')}
          style={styles.loadingLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#c4a574" style={styles.loadingSpinner} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isLoading) {
    return null;
  }

  return <View style={styles.appRoot}>{renderAppContent()}</View>;
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#1a1512',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLogo: {
    width: 200,
    height: 200,
  },
  loadingSpinner: {
    marginTop: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});

const PENDING_SESSION_MAX_RETRIES = 10;

function createSessionFromAuthUrl(url, supabase) {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.substring(hashIndex + 1) : '';
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !supabase) return null;
  return supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token || '',
  });
}

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

    const handleIncomingUrl = async (url) => {
      if (!url) return;
      // Auth callback from email confirmation (cavaro://auth/callback#access_token=...)
      if (url.includes('access_token') && supabase) {
        try {
          await createSessionFromAuthUrl(url, supabase);
        } catch (e) {
          console.warn('Auth callback error:', e);
        }
        return;
      }
      if (!url.includes('subscribe-success')) return;
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

    const handleUrl = ({ url }) => handleIncomingUrl(url);
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(handleIncomingUrl);
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

export default App;