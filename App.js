import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { ActionButtons } from './components/ActionButtons';
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
      <Text style={styles.loadingTitle}>Cavaro</Text>
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
  const { refreshTier } = useAuth();
  useEffect(() => {
    const handleUrl = ({ url }) => {
      if (url?.includes('subscribe-success')) {
        refreshTier?.();
      }
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then((url) => {
      if (url?.includes('subscribe-success')) refreshTier?.();
    });
    return () => sub.remove();
  }, [refreshTier]);
  return null;
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
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
  loadingTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.primary,
    letterSpacing: 2,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
});

export default App;