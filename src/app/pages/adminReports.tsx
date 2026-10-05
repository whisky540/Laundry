import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';

type ReportOrder = {
  id: string;
  customerId: string;
  customerEmail: string;
  serviceName: string;
  total: number;
  quantity: number;
  status: string;
  employeeName?: string;
  completedAt?: string;
  createdAt?: string;
  pickupDate: string;
  pickupTime: string;
};

type ReportEmployee = {
  id: string;
  name: string;
  role: string;
  assigned: number;
  completed: number;
  hourlyRate?: number;
  hoursWorked: number;
  estimatedPay: number;
};

type AttendanceReport = {
  id: string;
  employeeId: string;
  employeeEmail: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: string;
};

type BookingReport = ReportOrder & {
  createdAtLabel: string;
};

type ReportMetrics = {
  orders: number;
  pending: number;
  completed: number;
  attendanceRecords: number;
};

const isComplete = (status: string): boolean =>
  ['Ready', 'Completed', 'Delivered'].includes(status);

export default function AdminReportsScreen() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [orders, setOrders] = useState<ReportOrder[]>([]);
  const [employees, setEmployees] = useState<ReportEmployee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadReports = async () => {
    setLoading(true);
    setError(false);

    try {
      const [ordersSnapshot, usersSnapshot, attendanceSnapshot] =
        await Promise.all([
          getDocs(collection(db, 'orders')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'attendance')),
        ]);

      const reportOrders = ordersSnapshot.docs.map(orderDocument => {
        const data = orderDocument.data();

        return {
          id: orderDocument.id,
          customerId: (data.customerId as string) || '',
          customerEmail: (data.customerEmail as string) || 'Customer',
          serviceName: (data.serviceName as string) || 'Laundry service',
          total: (data.total as number) || 0,
          quantity: (data.quantity as number) || 0,
          status: (data.status as string) || 'Pending',
          employeeName: data.employeeName as string | undefined,
          completedAt: data.completedAt as string | undefined,
          createdAt:
            typeof data.createdAt?.toDate === 'function'
              ? data.createdAt.toDate().toISOString()
              : (data.createdAt as string | undefined),
          pickupDate: (data.pickupDate as string) || '',
          pickupTime: (data.pickupTime as string) || '',
        };
      });

      const employeeReports = usersSnapshot.docs
        .filter(userDocument => userDocument.data().role === 'employee')
        .map(userDocument => {
          const data = userDocument.data();
          const assignedOrders = reportOrders.filter(
            order => order.employeeName === data.name,
          );
          const employeeAttendance = attendanceSnapshot.docs
            .map(document => document.data())
            .filter(record => record.employeeId === userDocument.id);
          const hoursWorked = employeeAttendance.reduce((hours, record) => {
            if (!record.checkInAt || !record.checkOutAt) return hours;
            const duration =
              new Date(record.checkOutAt).getTime() -
              new Date(record.checkInAt).getTime();
            return hours + Math.max(0, duration / 3_600_000);
          }, 0);
          const hourlyRate =
            typeof data.hourlyRate === 'number' ? data.hourlyRate : undefined;

          return {
            id: userDocument.id,
            name: (data.name as string) || 'Employee',
            role: (data.employeeRole as string) || 'Employee',
            assigned: assignedOrders.length,
            completed: assignedOrders.filter(order => isComplete(order.status))
              .length,
            hourlyRate,
            hoursWorked,
            estimatedPay: hourlyRate ? hoursWorked * hourlyRate : 0,
          };
        });

      const attendanceReports = attendanceSnapshot.docs.map(document => {
        const data = document.data();
        return {
          id: document.id,
          employeeId: (data.employeeId as string) || '',
          employeeEmail: (data.employeeEmail as string) || '',
          date: (data.date as string) || '',
          checkInAt: (data.checkInAt as string | null) || null,
          checkOutAt: (data.checkOutAt as string | null) || null,
          status: (data.status as string) || 'checked-in',
        };
      });

      setOrders(reportOrders);
      setEmployees(employeeReports);
      setAttendance(attendanceReports);
      setMetrics({
        orders: reportOrders.length,
        pending: reportOrders.filter(order => order.status === 'Pending')
          .length,
        completed: reportOrders.filter(order => isComplete(order.status)).length,
        attendanceRecords: attendanceSnapshot.size,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      void loadReports();
    } else {
      setLoading(false);
    }
  }, []);

  const formatDateTime = (value?: string): string =>
    value ? new Date(value).toLocaleString() : 'Not recorded';

  const bookingReports: BookingReport[] = orders.map(order => ({
    ...order,
    createdAtLabel: formatDateTime(order.createdAt),
  }));
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.title}>System reports</Text>
          <Pressable onPress={() => void loadReports()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color="#1976D2" style={styles.loader} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Reports unavailable</Text>
            <Text style={styles.emptyText}>Could not load system reports.</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadReports()}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : metrics ? (
          <>
            <Text style={styles.subtitle}>Overview of orders, tasks, and attendance</Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.orders}</Text>
                <Text style={styles.metricLabel}>Total orders</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.pending}</Text>
                <Text style={styles.metricLabel}>Pending orders</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.completed}</Text>
                <Text style={styles.metricLabel}>Completed tasks</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{metrics.attendanceRecords}</Text>
                <Text style={styles.metricLabel}>Attendance records</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Employee performance</Text>
            {employees.length === 0 ? (
              <Text style={styles.emptyText}>No employee reports yet.</Text>
            ) : (
              employees.map(employee => (
                <View key={employee.id} style={styles.employeeCard}>
                  <View>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text style={styles.employeeRole}>{employee.role}</Text>
                  </View>
                  <View style={styles.employeeStats}>
                    <Text style={styles.employeeStat}>{employee.assigned} assigned</Text>
                    <Text style={styles.employeeCompleted}>{employee.completed} completed</Text>
                  </View>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Attendance report</Text>
            {attendance.length === 0 ? (
              <Text style={styles.emptyText}>No attendance records yet.</Text>
            ) : (
              attendance.map(record => (
                <View key={record.id} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportPrimary}>{record.employeeEmail}</Text>
                    <Text style={record.status === 'checked-out' ? styles.successText : styles.warningText}>
                      {record.status === 'checked-out' ? 'Complete' : 'Checked in'}
                    </Text>
                  </View>
                  <Text style={styles.reportMeta}>Date: {record.date}</Text>
                  <Text style={styles.reportMeta}>Check in: {formatDateTime(record.checkInAt || undefined)}</Text>
                  <Text style={styles.reportMeta}>Check out: {formatDateTime(record.checkOutAt || undefined)}</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Payroll report</Text>
            <Text style={styles.sectionNote}>
              Payroll is estimated from completed attendance hours and each employee&apos;s configured hourly rate.
            </Text>
            {employees.length === 0 ? (
              <Text style={styles.emptyText}>No payroll records yet.</Text>
            ) : (
              employees.map(employee => (
                <View key={employee.id} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportPrimary}>{employee.name}</Text>
                    <Text style={styles.reportAmount}>
                      {employee.hourlyRate ? `K${employee.estimatedPay.toFixed(2)}` : 'Rate not configured'}
                    </Text>
                  </View>
                  <Text style={styles.reportMeta}>{employee.hoursWorked.toFixed(2)} hours worked</Text>
                  <Text style={styles.reportMeta}>
                    {employee.hourlyRate ? `Rate: K${employee.hourlyRate}/hour` : 'Add hourlyRate to the employee profile to calculate pay'}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Customer booking report</Text>
            {bookingReports.length === 0 ? (
              <Text style={styles.emptyText}>No customer bookings yet.</Text>
            ) : (
              bookingReports.map(booking => (
                <View key={booking.id} style={styles.reportCard}>
                  <View style={styles.reportCardHeader}>
                    <Text style={styles.reportPrimary}>{booking.customerEmail}</Text>
                    <Text style={styles.reportAmount}>K{booking.total}</Text>
                  </View>
                  <Text style={styles.reportMeta}>{booking.serviceName} · {booking.quantity} · {booking.status}</Text>
                  <Text style={styles.reportMeta}>Booked: {booking.createdAtLabel}</Text>
                  <Text style={styles.reportMeta}>Pickup: {booking.pickupDate} at {booking.pickupTime}</Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>Order activity</Text>
            {orders.length === 0 ? (
              <Text style={styles.emptyText}>No order reports yet.</Text>
            ) : (
              orders.map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <View style={styles.orderHeading}>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <Text style={styles.orderService}>{order.serviceName}</Text>
                    </View>
                    <Text style={styles.orderStatus}>{order.status}</Text>
                  </View>
                  <Text style={styles.orderMeta}>{order.customerEmail} · {order.pickupDate}</Text>
                  <Text style={styles.orderMeta}>Employee: {order.employeeName || 'Unassigned'}</Text>
                  {order.completedAt ? (
                    <Text style={styles.completedText}>
                      Completed {new Date(order.completedAt).toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7FAFC' },
  content: { padding: 20, paddingBottom: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backText: { color: '#1976D2', fontSize: 15, fontWeight: '700' },
  title: { color: '#172B4D', fontSize: 22, fontWeight: '800' },
  refreshText: { color: '#1976D2', fontSize: 13, fontWeight: '800' },
  subtitle: { color: '#6B7280', fontSize: 13, marginBottom: 20 },
  loader: { marginTop: 30 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E7EEF5' },
  metricValue: { color: '#1976D2', fontSize: 22, fontWeight: '800' },
  metricLabel: { color: '#6B7280', fontSize: 11, marginTop: 5 },
  sectionTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  sectionNote: { color: '#6B7280', fontSize: 12, lineHeight: 17, marginTop: -5, marginBottom: 12 },
  reportCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E7EEF5' },
  reportCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reportPrimary: { color: '#172B4D', fontSize: 14, fontWeight: '800', flex: 1 },
  reportMeta: { color: '#6B7280', fontSize: 11, marginTop: 5 },
  reportAmount: { color: '#1976D2', fontSize: 13, fontWeight: '800', marginLeft: 8 },
  successText: { color: '#16803C', fontSize: 12, fontWeight: '800' },
  warningText: { color: '#B7791F', fontSize: 12, fontWeight: '800' },
  receiptCard: { backgroundColor: '#E9F8EF', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#B7E3C5' },
  receiptAmount: { color: '#16803C', fontSize: 18, fontWeight: '800', marginTop: 8 },
  employeeCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E7EEF5' },
  employeeName: { color: '#172B4D', fontSize: 14, fontWeight: '800' },
  employeeRole: { color: '#6B7280', fontSize: 12, marginTop: 3 },
  employeeStats: { alignItems: 'flex-end' },
  employeeStat: { color: '#1976D2', fontSize: 12, fontWeight: '700' },
  employeeCompleted: { color: '#16803C', fontSize: 12, fontWeight: '700', marginTop: 4 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E7EEF5' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderHeading: { flex: 1 },
  orderId: { color: '#6B7280', fontSize: 11, fontWeight: '700' },
  orderService: { color: '#172B4D', fontSize: 14, fontWeight: '800', marginTop: 3 },
  orderStatus: { color: '#B7791F', fontSize: 12, fontWeight: '800', marginLeft: 8 },
  orderMeta: { color: '#6B7280', fontSize: 11, marginTop: 5 },
  completedText: { color: '#16803C', fontSize: 11, fontWeight: '700', marginTop: 7 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, alignItems: 'center' },
  emptyTitle: { color: '#172B4D', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 6 },
  retryButton: { backgroundColor: '#1976D2', borderRadius: 9, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
