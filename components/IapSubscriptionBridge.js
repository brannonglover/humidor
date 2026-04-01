import { useEffect, useRef } from 'react';
import { Platform, AppState, DeviceEventEmitter } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { IOS_PREMIUM_PRODUCT_ID } from '../constants/iap';
import { verifyAppleTransaction, initIapConnection } from '../lib/iap';

function getIapModule() {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('react-native-iap');
  } catch {
    return null;
  }
}

/**
 * Initializes StoreKit and verifies purchases when the user completes checkout.
 */
export default function IapSubscriptionBridge() {
  const { user, supabase, refreshTier, setTierFromSubscription } = useAuth();
  const handlersRef = useRef({ inFlight: false });

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const iap = getIapModule();
    if (!iap) return undefined;

    let purchaseSub;
    let errorSub;

    (async () => {
      await initIapConnection();
      purchaseSub = iap.purchaseUpdatedListener(async (purchase) => {
        if (purchase.productId !== IOS_PREMIUM_PRODUCT_ID) return;
        if (handlersRef.current.inFlight) return;
        handlersRef.current.inFlight = true;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            DeviceEventEmitter.emit('iapPurchaseFailed', { message: 'Sign in required' });
            return;
          }
          const tid = purchase.transactionId || purchase.id;
          if (!tid) {
            DeviceEventEmitter.emit('iapPurchaseFailed', { message: 'Missing transaction' });
            return;
          }
          await verifyAppleTransaction(session.access_token, tid);
          try {
            await iap.finishTransaction({ purchase });
          } catch (fe) {
            DeviceEventEmitter.emit('iapPurchaseFailed', {
              message: fe?.message || 'Could not finish transaction with App Store',
            });
            return;
          }
          setTierFromSubscription?.('premium');
          await refreshTier?.();
          DeviceEventEmitter.emit('iapPurchaseCompleted');
        } catch (e) {
          const message = e?.message || String(e);
          console.warn('IAP verify:', message);
          DeviceEventEmitter.emit('iapPurchaseFailed', { message });
        } finally {
          handlersRef.current.inFlight = false;
        }
      });

      errorSub = iap.purchaseErrorListener((err) => {
        if (__DEV__) console.warn('IAP purchase error:', err);
        const code = err?.code;
        if (code === 'E_USER_CANCELLED' || code === 'user-cancelled') {
          DeviceEventEmitter.emit('iapPurchaseCancelled');
        } else {
          DeviceEventEmitter.emit('iapPurchaseFailed', { message: err?.message || 'Purchase failed' });
        }
      });
    })();

    return () => {
      purchaseSub?.remove();
      errorSub?.remove();
    };
  }, [supabase, refreshTier, setTierFromSubscription]);

  // Refresh tier when returning from App Store subscription management
  useEffect(() => {
    if (!user || !supabase) return undefined;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshTier?.();
    });
    return () => sub.remove();
  }, [user, supabase, refreshTier]);

  return null;
}
