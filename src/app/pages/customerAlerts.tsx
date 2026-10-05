import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

type AlertItem = { id: string; serviceName: string; status: string; pickupDate: string; pickupTime: string; employeeName?: string; adminConfirmedAt?: string; paymentStatus?: string; total?: number };

export default function CustomerAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    const unsubscribe = onSnapshot(
      query(collection(db, 'orders'), where('customerId', '==', user.uid)),
      snapshot => {
        setAlerts(snapshot.docs.map(order => {
          const data = order.data();
          return { id: order.id, serviceName: (data.serviceName as string) || 'Laundry service', status: (data.status as string) || 'Pending', pickupDate: (data.pickupDate as string) || '', pickupTime: (data.pickupTime as string) || '', employeeName: data.employeeName as string | undefined, adminConfirmedAt: data.adminConfirmedAt as string | undefined, paymentStatus: data.paymentStatus as string | undefined, total: data.total as number | undefined };
        }));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.title}>Alerts</Text><View style={styles.spacer} /></View>
        <Text style={styles.subtitle}>Updates about your laundry orders</Text>
        {loading ? <ActivityIndicator color="#1976D2" style={styles.loader} /> : null}
        {!loading && alerts.length === 0 ? <Text style={styles.empty}>No order alerts yet.</Text> : null}
        {alerts.map(alert => {
          const confirmed = Boolean(alert.adminConfirmedAt);
          const paid = alert.paymentStatus === 'Paid';
          return <View key={alert.id} style={[styles.card, confirmed && styles.doneCard]}><Text style={styles.icon}>{confirmed ? '✓' : 'i'}</Text><View style={styles.body}><Text style={styles.cardTitle}>{confirmed ? 'Your order is ready' : 'Order update'}</Text><Text style={styles.cardText}>{alert.serviceName} · {confirmed ? 'Ready for collection' : alert.status}</Text><Text style={styles.meta}>{alert.id} · Pickup {alert.pickupDate} at {alert.pickupTime}</Text>{alert.employeeName ? <Text style={styles.meta}>Handled by {alert.employeeName}</Text> : null}{confirmed && !paid ? <Pressable style={styles.payButton} onPress={() => router.push({ pathname: '/pages/payment', params: { orderId: alert.id } } as never)}><Text style={styles.payText}>Pay K{(alert.total || 0).toLocaleString()}</Text></Pressable> : null}{paid ? <Text style={styles.paidText}>✓ Payment recorded</Text> : null}</View></View>;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#F7FAFC' }, content: { padding: 20, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, back: { color: '#1976D2', fontSize: 15, fontWeight: '700' }, title: { color: '#172B4D', fontSize: 22, fontWeight: '800' }, spacer: { width: 45 }, subtitle: { color: '#6B7280', fontSize: 13, marginBottom: 20 }, loader: { marginTop: 30 }, empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 }, card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E7EEF5' }, doneCard: { backgroundColor: '#E9F8EF', borderColor: '#B7E3C5' }, icon: { color: '#1976D2', fontSize: 20, fontWeight: '800', width: 28 }, body: { flex: 1 }, cardTitle: { color: '#172B4D', fontSize: 14, fontWeight: '800' }, cardText: { color: '#4B5563', fontSize: 13, marginTop: 4 }, meta: { color: '#6B7280', fontSize: 11, marginTop: 5 }, payButton: { backgroundColor: '#1976D2', borderRadius: 9, paddingVertical: 11, alignItems: 'center', marginTop: 10 }, payText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, paidText: { color: '#16803C', fontSize: 12, fontWeight: '800', marginTop: 9 } });
