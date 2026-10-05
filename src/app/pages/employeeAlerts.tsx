import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

type AlertItem = { id: string; serviceName: string; status: string; pickupDate: string; pickupTime: string; customerEmail: string };

export default function EmployeeAlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const unsubscribe = onSnapshot(
      query(collection(db, 'orders'), where('employeeId', '==', user.uid)),
      snapshot => {
        setAlerts(snapshot.docs.map(order => {
          const data = order.data();
          return {
            id: order.id,
            serviceName: (data.serviceName as string) || 'Laundry service',
            status: (data.status as string) || 'Processing',
            pickupDate: (data.pickupDate as string) || '',
            pickupTime: (data.pickupTime as string) || '',
            customerEmail: (data.customerEmail as string) || 'Customer',
          };
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
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
          <Text style={styles.title}>Alerts</Text>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.subtitle}>Updates about your assigned tasks</Text>
        {loading ? <ActivityIndicator color="#1976D2" style={styles.loader} /> : null}
        {!loading && alerts.length === 0 ? <Text style={styles.empty}>No task alerts yet.</Text> : null}
        {alerts.map(alert => {
          const done = ['Ready', 'Completed', 'Delivered'].includes(alert.status);
          return (
            <View key={alert.id} style={[styles.card, done && styles.doneCard]}>
              <Text style={styles.icon}>{done ? '✓' : '!'}</Text>
              <View style={styles.body}>
                <Text style={styles.cardTitle}>{done ? 'Task completed' : 'Task assigned'}</Text>
                <Text style={styles.cardText}>{alert.serviceName} for {alert.customerEmail}</Text>
                <Text style={styles.meta}>{alert.id} · {alert.pickupDate} at {alert.pickupTime}</Text>
                <Text style={[styles.status, done ? styles.doneText : styles.pendingText]}>{done ? 'Ready for customer' : alert.status}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFC' }, content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  back: { color: '#1976D2', fontSize: 15, fontWeight: '700' }, title: { color: '#172B4D', fontSize: 22, fontWeight: '800' }, spacer: { width: 45 },
  subtitle: { color: '#6B7280', fontSize: 13, marginBottom: 20 }, loader: { marginTop: 30 }, empty: { color: '#6B7280', textAlign: 'center', marginTop: 32 },
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#E7EEF5' },
  doneCard: { backgroundColor: '#E9F8EF', borderColor: '#B7E3C5' }, icon: { color: '#1976D2', fontSize: 20, fontWeight: '800', width: 28 }, body: { flex: 1 }, cardTitle: { color: '#172B4D', fontSize: 14, fontWeight: '800' }, cardText: { color: '#4B5563', fontSize: 13, marginTop: 4 }, meta: { color: '#6B7280', fontSize: 11, marginTop: 5 }, status: { fontSize: 12, fontWeight: '800', marginTop: 7 }, doneText: { color: '#16803C' }, pendingText: { color: '#B7791F' },
});
