import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

type AlertItem = { id: string; customerEmail: string; serviceName: string; status: string; pickupDate: string; pickupTime: string; employeeName?: string; completedBy?: string; completedAt?: string; adminConfirmedAt?: string };

export default function AdminAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) { setLoading(false); return; }
    const unsubscribe = onSnapshot(collection(db, 'orders'), snapshot => {
      setAlerts(snapshot.docs.map(order => {
        const data = order.data();
        return { id: order.id, customerEmail: (data.customerEmail as string) || 'Customer', serviceName: (data.serviceName as string) || 'Laundry service', status: (data.status as string) || 'Pending', pickupDate: (data.pickupDate as string) || '', pickupTime: (data.pickupTime as string) || '', employeeName: data.employeeName as string | undefined, completedBy: data.completedBy as string | undefined, completedAt: data.completedAt as string | undefined, adminConfirmedAt: data.adminConfirmedAt as string | undefined };
      }));
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, []);

  const confirmReady = async (alert: AlertItem) => {
    try {
      setConfirmingId(alert.id);
      await updateDoc(doc(db, 'orders', alert.id), {
        status: 'Ready',
        adminConfirmedBy: auth.currentUser?.uid,
        adminConfirmedAt: new Date().toISOString(),
      });
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}><Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable><Text style={styles.title}>Alerts</Text><View style={styles.spacer} /></View>
        <Text style={styles.subtitle}>All order and task activity</Text>
        {loading ? <ActivityIndicator color="#1976D2" style={styles.loader} /> : null}
        {!loading && alerts.length === 0 ? <Text style={styles.empty}>No order activity yet.</Text> : null}
        {alerts.map(alert => {
          const ready = ['Ready', 'Completed', 'Delivered'].includes(alert.status);
          const needsConfirmation = ready && !alert.adminConfirmedAt;
          return <View key={alert.id} style={[styles.card, ready && styles.readyCard]}><Text style={styles.icon}>{ready ? '✓' : '!'}</Text><View style={styles.body}><Text style={styles.cardTitle}>{needsConfirmation ? 'Employee marked order ready' : ready ? 'Order confirmed ready' : 'Order update'}</Text><Text style={styles.cardText}>{alert.id} · {alert.serviceName} for {alert.customerEmail}</Text><Text style={styles.meta}>Status: {alert.status} · Pickup {alert.pickupDate} at {alert.pickupTime}</Text>{alert.employeeName ? <Text style={styles.meta}>Assigned to {alert.employeeName}</Text> : <Text style={styles.meta}>Not assigned</Text>}{ready ? <Text style={styles.proof}>✓ Employee completion{alert.completedAt ? ` at ${new Date(alert.completedAt).toLocaleString()}` : ''}</Text> : null}{needsConfirmation ? <Pressable style={styles.confirmButton} onPress={() => void confirmReady(alert)} disabled={confirmingId === alert.id}>{<Text style={styles.confirmText}>{confirmingId === alert.id ? 'Confirming...' : 'Confirm ready for customer'}</Text>}</Pressable> : null}{alert.adminConfirmedAt ? <Text style={styles.confirmed}>✓ Customer notified and payment enabled</Text> : null}</View></View>;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: '#F7FAFC' }, content: { padding: 20, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, back: { color: '#1976D2', fontSize: 15, fontWeight: '700' }, title: { color: '#172B4D', fontSize: 22, fontWeight: '800' }, spacer: { width: 45 }, subtitle: { color: '#6B7280', fontSize: 13, marginBottom: 20 }, loader: { marginTop: 30 }, empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 }, card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E7EEF5' }, readyCard: { backgroundColor: '#E9F8EF', borderColor: '#B7E3C5' }, icon: { color: '#1976D2', fontSize: 20, fontWeight: '800', width: 28 }, body: { flex: 1 }, cardTitle: { color: '#172B4D', fontSize: 14, fontWeight: '800' }, cardText: { color: '#4B5563', fontSize: 13, marginTop: 4 }, meta: { color: '#6B7280', fontSize: 11, marginTop: 5 }, proof: { color: '#16803C', fontSize: 12, fontWeight: '800', marginTop: 8 }, confirmButton: { backgroundColor: '#1976D2', borderRadius: 9, paddingVertical: 11, alignItems: 'center', marginTop: 10 }, confirmText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, confirmed: { color: '#16803C', fontSize: 12, fontWeight: '800', marginTop: 9 } });
