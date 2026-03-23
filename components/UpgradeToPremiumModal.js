import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Animated, Dimensions, ActivityIndicator, Alert, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { subscribeOrManage, createPortalSession, restoreSubscription } from '../api/subscription';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Cavaro-styled Upgrade to Premium modal matching ConfirmModal/AddToFavoritesModal theming.
 * @param {boolean} visible
 * @param {string} message - Custom message to display
 * @param {function} onClose - Called when user cancels or overlay is tapped
 * @param {string} accessToken - Supabase session access token
 * @param {string} tier - Current tier ('free' | 'premium')
 * @param {function} refreshTier - Callback to refresh tier after subscribe/restore
 */
export default function UpgradeToPremiumModal({
  visible,
  message = 'Subscribe to Premium for $2.99/mo to unlock this feature.',
  onClose,
  accessToken,
  tier,
  refreshTier,
}) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      overlayOpacity.setValue(0);
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
      ]).start();
    }
  }, [visible, overlayOpacity, sheetTranslateY]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleRestore = async () => {
    if (!accessToken || restoreLoading) return;
    setRestoreLoading(true);
    try {
      const { tier: newTier, restored } = await restoreSubscription(accessToken);
      refreshTier?.();
      handleClose();
      if (restored) {
        Alert.alert('Subscription restored', 'Welcome back! Your Premium features are now active.');
      } else if (newTier === 'premium') {
        Alert.alert('Already active', 'Your subscription is already active.');
      } else {
        Alert.alert('No subscription found', "We couldn't find an active subscription for this account.");
      }
    } catch (e) {
      Alert.alert('Restore failed', e.message || 'Could not restore subscription.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!accessToken || subscribeLoading) return;
    setSubscribeLoading(true);
    try {
      const result = await subscribeOrManage(accessToken, tier);
      if (result?.alreadySubscribed) {
        Alert.alert(
          "You're already subscribed",
          'Would you like to manage your subscription?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Manage subscription',
              onPress: async () => {
                try {
                  const url = await createPortalSession(accessToken);
                  if (url) await Linking.openURL(url);
                  refreshTier?.();
                } catch (e) {
                  Alert.alert('Error', e.message || 'Could not open subscription management');
                }
              },
            },
          ]
        );
      } else if (typeof result === 'string') {
        await Linking.openURL(result);
        refreshTier?.();
        handleClose();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not open checkout');
    } finally {
      setSubscribeLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents="none"
        />
      </Pressable>
      <View style={styles.centered} pointerEvents="box-none">
        <Pressable onPress={() => {}}>
          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetTranslateY }], borderColor: colors.primary },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + '22' }]}>
              <MaterialCommunityIcons name="crown" size={32} color={colors.primary} />
            </View>
            <Text style={styles.title}>Upgrade to Premium</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.cancelBtn]}
                onPress={handleClose}
                disabled={restoreLoading || subscribeLoading}
              >
                <Text style={[styles.btnText, styles.cancelText]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.secondaryBtn]}
                onPress={handleRestore}
                disabled={restoreLoading || subscribeLoading}
              >
                {restoreLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.btnText, styles.secondaryBtnText]}>Restore subscription</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.primaryBtn]}
                onPress={handleSubscribe}
                disabled={restoreLoading || subscribeLoading}
              >
                {subscribeLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[styles.btnText, styles.primaryBtnText]}>Subscribe</Text>
                )}
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 2,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'column',
    gap: 10,
  },
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cancelBtn: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  secondaryBtn: {
    borderColor: colors.primary,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  btnText: {
    fontSize: 17,
    color: colors.textPrimary,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  secondaryBtnText: {
    color: colors.primary,
    fontWeight: '600',
  },
  primaryBtnText: {
    color: colors.screenBg,
    fontWeight: '600',
  },
});
