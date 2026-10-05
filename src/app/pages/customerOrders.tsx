import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const colors = {
  primary: '#1976D2',
  background: '#F7FAFC',
  white: '#FFFFFF',
  text: '#172B4D',
  secondaryText: '#6B7280',
  border: '#E7EEF5',
  green: '#16803C',
  orange: '#B7791F',
};

const orders = [
  {
    id: '#ORD-1024',
    service: 'Wash & Fold',
    date: 'Today, 08:45',
    amount: 'K180',
    status: 'Processing',
  },
  {
    id: '#ORD-1019',
    service: 'Wash & Fold',
    date: '12 Sep 2026',
    amount: 'K180',
    status: 'Completed',
  },
];

export default function CustomerOrdersScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>My orders</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Pressable
          style={styles.newOrderButton}
          onPress={() => router.push('/pages/createOrders' as never)}
        >
          <Text style={styles.newOrderText}>+ Place an order</Text>
        </Pressable>

        {orders.map(order => (
          <Pressable key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.orderDate}>{order.date}</Text>
              </View>
              <Text
                style={[
                  styles.status,
                  order.status === 'Completed'
                    ? styles.completedStatus
                    : styles.processingStatus,
                ]}
              >
                {order.status}
              </Text>
            </View>

            <View style={styles.orderDetails}>
              <Text style={styles.service}>{order.service}</Text>
              <Text style={styles.amount}>{order.amount}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  headerSpacer: { width: 45 },
  newOrderButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 18,
  },
  newOrderText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderId: { color: colors.text, fontSize: 15, fontWeight: '800' },
  orderDate: { color: colors.secondaryText, fontSize: 12, marginTop: 4 },
  status: { fontSize: 12, fontWeight: '800' },
  processingStatus: { color: colors.orange },
  completedStatus: { color: colors.green },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  service: { color: colors.secondaryText, fontSize: 14 },
  amount: { color: colors.text, fontSize: 15, fontWeight: '800' },
});
