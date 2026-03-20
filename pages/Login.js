import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import colors from '../theme/colors';
import { KEYBOARD_ACCESSORY_ID } from '../components/KeyboardAccessory';
import { restoreSubscription } from '../api/subscription';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

export default function Login({ supabase, onSuccess, onBack, restoreAfterSignIn }) {
  const { refreshTier } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw error;
      trackEvent('login_success');
      if (restoreAfterSignIn) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          try {
            const { restored } = await restoreSubscription(session.access_token);
            refreshTier?.();
            if (restored) {
              Alert.alert('Subscription restored', 'Welcome back! Your Premium features are now active.');
            }
          } catch (err) {
            Alert.alert('Restore failed', err.message || 'Could not restore subscription.');
          }
        }
      }
      onSuccess?.();
    } catch (err) {
      Alert.alert('Sign in failed', err.message || 'Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={40}
        >
          <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Welcome back</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.placeholderText}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
            inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
            returnKeyType="done"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.placeholderText}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            inputAccessoryViewID={KEYBOARD_ACCESSORY_ID}
            returnKeyType="done"
          />

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
