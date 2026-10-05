import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useTimeGreeting } from '@/hooks/use-time-greeting';
import { useAttendance } from '@/hooks/use-attendance';

const colors = {
  primary: '#1976D2',
  background: '#F7FAFC',
  white: '#FFFFFF',
  text: '#172B4D',
  secondaryText: '#6B7280',
  border: '#E7EEF5',
  green: '#16803C',
  orange: '#B7791F',
  red: '#C53030',
};

type EmployeeOrder = {
  id: string;
  customer: string;
  service: string;
  deadline: string;
  status: 'To process' | 'Washing' | 'Drying' | 'Ready';
};

const employeeOrders: EmployeeOrder[] = [
  {
    id: '#ORD-1024',
    customer: 'Mary Banda',
    service: 'Wash & Fold',
    deadline: 'Due today, 14:00',
    status: 'Washing',
  },
  {
    id: '#ORD-1023',
    customer: 'John Phiri',
    service: 'Dry Cleaning',
    deadline: 'Due today, 16:00',
    status: 'Drying',
  },
  {
    id: '#ORD-1022',
    customer: 'Grace Mwansa',
    service: 'Ironing',
    deadline: 'Due tomorrow',
    status: 'To process',
  },
];

export default function EmployeeHomeScreen() {
  const router = useRouter();
  const { name: routeName } = useLocalSearchParams<{ name?: string }>();
  const [profileName, setProfileName] = useState(routeName?.trim() || '');

  useEffect(() => {
    const loadEmployeeName = async () => {
      if (!auth.currentUser) {
        return;
      }

      const profileSnapshot = await getDoc(
        doc(db, 'users', auth.currentUser.uid),
      );
      const savedName = profileSnapshot.data()?.name;

      if (typeof savedName === 'string' && savedName.trim()) {
        setProfileName(savedName.trim());
      }
    };

    void loadEmployeeName();
  }, []);

  const userName =
    profileName || auth.currentUser?.email?.split('@')[0] || 'Employee';
  const initials = userName.charAt(0).toUpperCase();
  const greeting = useTimeGreeting();
  const { loading: attendanceLoading, hasMarkedToday } = useAttendance();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.title}>{userName}</Text>
          </View>

          <Pressable
            style={styles.avatar}
            onPress={() =>
              Alert.alert('Profile', 'Employee profile will be added later.')
            }
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        {!attendanceLoading && !hasMarkedToday ? (
          <Pressable
            style={styles.attendanceWarning}
            onPress={() => router.push('/pages/employeeAttendance' as never)}
          >
            <View style={styles.warningIcon}>
              <Text style={styles.warningIconText}>!</Text>
            </View>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Attendance not recorded</Text>
              <Text style={styles.warningText}>
                Check in with your fingerprint to record today&apos;s attendance.
              </Text>
            </View>
            <Text style={styles.warningArrow}>›</Text>
          </Pressable>
        ) : null}

        <View style={styles.shiftCard}>
          <View style={styles.shiftTopRow}>
            <View>
              <Text style={styles.shiftLabel}>Current shift</Text>
              <Text style={styles.shiftTime}>08:00 - 17:00</Text>
            </View>

            <View style={styles.activeShiftBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeShiftText}>On duty</Text>
            </View>
          </View>

          <Text style={styles.shiftDescription}>
            Keep orders moving and update each order as work is completed.
          </Text>

          <Pressable
            style={styles.breakButton}
            onPress={() =>
              Alert.alert('Break', 'Break management will be added later.')
            }
          >
            <Text style={styles.breakButtonText}>Start break</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Today’s tasks</Text>

        <View style={styles.statsRow}>
          <View style={styles.taskCard}>
            <Text style={styles.taskValue}>12</Text>
            <Text style={styles.taskLabel}>Assigned</Text>
          </View>

          <View style={styles.taskCard}>
            <Text style={styles.taskValue}>7</Text>
            <Text style={styles.taskLabel}>Completed</Text>
          </View>

          <View style={styles.taskCard}>
            <Text style={styles.taskValue}>5</Text>
            <Text style={styles.taskLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My assigned orders</Text>

          <Pressable
            onPress={() => router.push('/pages/employeeTasks' as never)}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.ordersCard}>
          {employeeOrders.map((order, index) => (
            <Pressable
              key={order.id}
              style={[
                styles.orderRow,
                index !== employeeOrders.length - 1 && styles.orderBorder,
              ]}
              onPress={() =>
                Alert.alert(
                  order.id,
                  `${order.customer}\n${order.service}\n${order.deadline}`,
                )
              }
            >
              <View style={styles.orderIcon}>
                <Text style={styles.orderIconText}>L</Text>
              </View>

              <View style={styles.orderDetails}>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.customerName}>{order.customer}</Text>
                <Text style={styles.serviceName}>{order.service}</Text>
                <Text style={styles.deadline}>{order.deadline}</Text>
              </View>

              <View style={styles.orderRight}>
                <Text
                  style={[
                    styles.statusText,
                    order.status === 'Washing' && styles.washingStatus,
                    order.status === 'Drying' && styles.dryingStatus,
                    order.status === 'To process' && styles.processStatus,
                    order.status === 'Ready' && styles.readyStatus,
                  ]}
                >
                  {order.status}
                </Text>

                <Text style={styles.openText}>Open</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>

        <View style={styles.quickActions}>
          <Pressable
            style={styles.quickAction}
            onPress={() => router.push('/pages/employeeAttendance' as never)}
          >
            <Text style={styles.quickActionIcon}>☝</Text>
            <Text style={styles.quickActionTitle}>Attendance</Text>
            <Text style={styles.quickActionSubtitle}>Check in with fingerprint</Text>
          </Pressable>

          <Pressable
            style={styles.quickAction}
            onPress={() =>
              Alert.alert(
                'Report issue',
                'Issue reporting will be added later.',
              )
            }
          >
            <Text style={styles.quickActionIcon}>!</Text>
            <Text style={styles.quickActionTitle}>Report issue</Text>
            <Text style={styles.quickActionSubtitle}>Notify your supervisor</Text>
          </Pressable>
        </View>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeIcon}>i</Text>

          <View style={styles.noticeContent}>
            <Text style={styles.noticeTitle}>Remember</Text>
            <Text style={styles.noticeText}>
              Check garment labels before washing and update the order status
              after every stage.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNavigation}>
        <Pressable style={styles.navItem}>
          <Text style={styles.activeNavIcon}>⌂</Text>
          <Text style={styles.activeNavText}>Home</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/pages/employeeTasks' as never)}
        >
          <Text style={styles.navIcon}>✓</Text>
          <Text style={styles.navText}>Tasks</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/pages/employeeAlerts' as never)}
        >
          <Text style={styles.navIcon}>♢</Text>
          <Text style={styles.navText}>Alerts</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() =>
            Alert.alert('Profile', 'Profile page will be added later.')
          }
        >
          <Text style={styles.navIcon}>♙</Text>
          <Text style={styles.navText}>Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  attendanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEA',
    borderWidth: 1,
    borderColor: '#F3B5AE',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  warningIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#C53030',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  warningIconText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  warningText: {
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  warningArrow: {
    color: '#C53030',
    fontSize: 26,
    marginLeft: 8,
  },
  greeting: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  title: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '800',
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  shiftCard: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 20,
    marginBottom: 26,
  },
  shiftTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  shiftLabel: {
    color: '#DDEEFF',
    fontSize: 13,
  },
  shiftTime: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 4,
  },
  activeShiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8FF0A4',
    marginRight: 6,
  },
  activeShiftText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  shiftDescription: {
    color: '#DDEEFF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 16,
  },
  breakButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 18,
  },
  breakButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  taskCard: {
    width: '31.5%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskValue: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
  },
  taskLabel: {
    color: colors.secondaryText,
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
  ordersCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  orderBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F5',
  },
  orderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderIconText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  orderDetails: {
    flex: 1,
  },
  orderId: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  customerName: {
    color: '#4B5563',
    fontSize: 13,
    marginTop: 3,
  },
  serviceName: {
    color: colors.secondaryText,
    fontSize: 12,
    marginTop: 2,
  },
  deadline: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  washingStatus: {
    color: colors.primary,
  },
  dryingStatus: {
    color: colors.orange,
  },
  processStatus: {
    color: colors.red,
  },
  readyStatus: {
    color: colors.green,
  },
  openText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickAction: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionIcon: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },
  quickActionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  quickActionSubtitle: {
    color: colors.secondaryText,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E6',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  noticeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    color: colors.orange,
    borderWidth: 1,
    borderColor: colors.orange,
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '800',
    marginRight: 10,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  noticeText: {
    color: '#6B5A2A',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  navIcon: {
    color: '#8A94A6',
    fontSize: 22,
  },
  activeNavIcon: {
    color: colors.primary,
    fontSize: 22,
  },
  navText: {
    color: '#8A94A6',
    fontSize: 11,
    marginTop: 4,
  },
  activeNavText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});