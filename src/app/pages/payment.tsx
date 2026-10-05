import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

const API_URL = process.env.EXPO_PUBLIC_PAYCHANGU_API_URL ?? '';

type PaymentOrder = {
  id: string;
  serviceName: string;
  total: number;
  pickupDate: string;
  pickupTime: string;
  adminConfirmedAt?: string;
  paymentStatus?: string;
};

export default function CustomerPaymentScreen() {
  const router = useRouter();
  const { orderId: routeOrderId } = useLocalSearchParams<{ orderId?: string }>();
  const orderId = Array.isArray(routeOrderId) ? routeOrderId[0] : routeOrderId;

  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState<string | null>(null);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load order ──
  useEffect(() => {
    const loadOrder = async () => {
      const user = auth.currentUser;
      if (!user || !orderId) { setLoading(false); return; }

      try {
        const snapshot = await getDoc(doc(db, 'orders', orderId));
        const data = snapshot.data();
        if (!snapshot.exists() || data?.customerId !== user.uid) return;

        setOrder({
          id: snapshot.id,
          serviceName: (data.serviceName as string) || 'Laundry service',
          total: (data.total as number) || 0,
          pickupDate: (data.pickupDate as string) || '',
          pickupTime: (data.pickupTime as string) || '',
          adminConfirmedAt: data.adminConfirmedAt as string | undefined,
          paymentStatus: data.paymentStatus as string | undefined,
        });
      } finally {
        setLoading(false);
      }
    };
    void loadOrder();
  }, [orderId]);

  // ── Cleanup polling on unmount ──
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Initiate PayChangu checkout ──
  const handlePay = async () => {
    if (!order || !auth.currentUser) return;
    if (!API_URL) {
      Alert.alert('Not configured', 'Set EXPO_PUBLIC_PAYCHANGU_API_URL in your .env.');
      return;
    }

    setProcessing(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create checkout session');
      }

      const { checkoutUrl: url, txRef } = await response.json();
      if (!url || !txRef) throw new Error('Checkout response was incomplete.');
      setTransactionRef(txRef);
      setCheckoutUrl(url);
      setWebViewVisible(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      const isConnectionError =
        err instanceof TypeError ||
        /fetch failed|network request failed|connect|failed to connect/i.test(message);

      Alert.alert(
        'Payment error',
        isConnectionError
          ? `Cannot reach the payment server at ${API_URL}. Make sure the server is running and this device is on the same Wi-Fi network.`
          : message,
      );
    } finally {
      setProcessing(false);
    }
  };

  // ── Poll order status while WebView is open ──
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      if (!orderId || !auth.currentUser) return;
      try {
        const idToken = await auth.currentUser.getIdToken();

        if (transactionRef) {
          await fetch(
            `${API_URL}/verify-payment/${encodeURIComponent(transactionRef)}`,
            { headers: { Authorization: `Bearer ${idToken}` } },
          );
        }

        const res = await fetch(`${API_URL}/order-status/${orderId}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();

        if (data.paymentStatus === 'Paid') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setWebViewVisible(false);
          Alert.alert('Payment successful', 'Your payment has been recorded.', [
            { text: 'Done', onPress: () => router.back() },
          ]);
        }
      } catch {
        // silently ignore; will retry on next tick
      }
    }, 3000); // poll every 3 seconds
  }, [orderId, router, transactionRef]);

  // ── WebView navigation handler ──
  const handleWebViewNavigation = (navState: any) => {
    const { url } = navState;

    // Detect the return_url redirect (payment cancelled or completed)
    if (url.includes('/payment-return')) {
      const urlObj = new URL(url);
      const status = urlObj.searchParams.get('status');

      if (status === 'failed' || status === 'cancelled') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setWebViewVisible(false);
        Alert.alert('Payment cancelled', 'You cancelled the payment.');
      }
      // If success, polling will pick it up; keep WebView open until then
    }
  };

  // ── Loading / error states ──
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#1976D2" size="large" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Order unavailable</Text>
        <Text style={styles.errorText}>This order could not be found.</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const paid = order.paymentStatus === 'Paid';
  const canPay = Boolean(order.adminConfirmedAt) && !paid;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Payment for</Text>
        <Text style={styles.serviceName}>{order.serviceName}</Text>
        <Text style={styles.meta}>{order.id}</Text>
        <Text style={styles.meta}>
          Pickup: {order.pickupDate} at {order.pickupTime}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.total}>K{order.total.toLocaleString()}</Text>
      </View>

      {paid ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Payment complete</Text>
          <Text style={styles.successText}>This order has already been paid.</Text>
        </View>
      ) : !canPay ? (
        <View style={styles.pendingCard}>
          <Text style={styles.pendingTitle}>Payment not available yet</Text>
          <Text style={styles.pendingText}>
            The administrator must confirm this order first.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.methodsRow}>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>Airtel Money</Text>
            </View>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>Mpamba</Text>
            </View>
            <View style={styles.methodBadge}>
              <Text style={styles.methodBadgeText}>Card</Text>
            </View>
          </View>

          <Text style={styles.notice}>
            You&apos;ll be redirected to PayChangu&apos;s secure checkout to complete your
            payment.
          </Text>

          <Pressable
            style={[styles.payButton, processing && styles.disabled]}
            onPress={() => void handlePay()}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payButtonText}>
                Pay K{order.total.toLocaleString()}
              </Text>
            )}
          </Pressable>
        </>
      )}

      {/* ── WebView Modal ── */}
      <Modal visible={webViewVisible} animationType="slide">
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Complete payment</Text>
            <Pressable
              onPress={() => {
                if (pollingRef.current) clearInterval(pollingRef.current);
                setWebViewVisible(false);
              }}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          {checkoutUrl ? (
            <WebView
              source={{ uri: checkoutUrl }}
              onLoad={() => startPolling()}
              onNavigationStateChange={handleWebViewNavigation}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator color="#1976D2" size="large" />
                  <Text style={styles.webViewLoadingText}>
                    Loading secure checkout…
                  </Text>
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAFC' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 0,
  },
  backText: { color: '#1976D2', fontSize: 15, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 22, fontWeight: '800' },
  headerSpacer: { width: 45 },
  summaryCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  summaryLabel: { color: '#6B7280', fontSize: 12 },
  serviceName: {
    color: '#172B4D',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 5,
  },
  meta: { color: '#6B7280', fontSize: 12, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#E7EEF5', marginVertical: 15 },
  totalLabel: { color: '#6B7280', fontSize: 13 },
  total: { color: '#1976D2', fontSize: 26, fontWeight: '800', marginTop: 3 },
  methodsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  methodBadge: {
    backgroundColor: '#E8F2FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  methodBadgeText: { color: '#1976D2', fontSize: 11, fontWeight: '700' },
  notice: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  payButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 22,
  },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  successCard: {
    backgroundColor: '#E9F8EF',
    borderRadius: 14,
    padding: 16,
    margin: 20,
  },
  successTitle: { color: '#16803C', fontSize: 16, fontWeight: '800' },
  successText: { color: '#356B45', fontSize: 13, marginTop: 5 },
  pendingCard: {
    backgroundColor: '#FFF8E6',
    borderRadius: 14,
    padding: 16,
    margin: 20,
  },
  pendingTitle: { color: '#7C5A13', fontSize: 16, fontWeight: '800' },
  pendingText: { color: '#6B5A2A', fontSize: 13, lineHeight: 18, marginTop: 5 },
  errorTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800' },
  errorText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  backButton: {
    backgroundColor: '#1976D2',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  backButtonText: { color: '#FFFFFF', fontWeight: '800' },

  // WebView
  webViewContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  webViewHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E7EEF5',
  },
  webViewTitle: { color: '#172B4D', fontSize: 16, fontWeight: '800' },
  closeText: { color: '#6B7280', fontSize: 20, fontWeight: '700' },
  webViewLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  webViewLoadingText: { color: '#6B7280', fontSize: 13, marginTop: 12 },
});