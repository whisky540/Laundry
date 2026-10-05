import React from 'react';
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
import { useTimeGreeting } from '@/hooks/use-time-greeting';

const colors = {
  primary: '#1976D2',
  primaryDark: '#125AA0',
  background: '#F7FAFC',
  white: '#FFFFFF',
  text: '#172B4D',
  secondaryText: '#6B7280',
  border: '#E7EEF5',
  green: '#16803C',
  orange: '#B7791F',
};

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { name: routeName } = useLocalSearchParams<{ name?: string }>();
  const userName = routeName?.trim() || 'Customer';
  const initials = userName.charAt(0).toUpperCase();
  const greeting = useTimeGreeting();

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
            <Text style={styles.name}>{userName}</Text>
          </View>

          <Pressable
            style={styles.avatar}
            onPress={() =>
              Alert.alert('Profile', 'Profile page will be added later.')
            }
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </Pressable>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>Fresh clothes, less stress</Text>

            <Text style={styles.welcomeDescription}>
              Let us take care of your laundry while you focus on what matters.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.orderButton,
                pressed && styles.orderButtonPressed,
              ]}
              onPress={() => router.push('/pages/createOrders' as never)}
            >
              <Text style={styles.orderButtonText}>Place an order</Text>
            </Pressable>
          </View>

          <Text style={styles.welcomeIcon}>洗</Text>
        </View>

        <Text style={styles.sectionTitle}>Our services</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          <Pressable
            style={styles.serviceCard}
            onPress={() =>
              Alert.alert('Wash and fold', 'Service details will be added.')
            }
          >
            <Text style={styles.serviceIcon}>◉</Text>
            <Text style={styles.serviceTitle}>Wash & Fold</Text>
            <Text style={styles.serviceDescription}>
              Clean, dry and neatly folded
            </Text>
            <Text style={styles.servicePrice}>From K50</Text>
          </Pressable>

          <Pressable
            style={styles.serviceCard}
            onPress={() =>
              Alert.alert('Dry cleaning', 'Service details will be added.')
            }
          >
            <Text style={styles.serviceIcon}>◇</Text>
            <Text style={styles.serviceTitle}>Dry Cleaning</Text>
            <Text style={styles.serviceDescription}>
              Professional garment care
            </Text>
            <Text style={styles.servicePrice}>From K80</Text>
          </Pressable>

          <Pressable
            style={styles.serviceCard}
            onPress={() =>
              Alert.alert('Ironing', 'Service details will be added.')
            }
          >
            <Text style={styles.serviceIcon}>▱</Text>
            <Text style={styles.serviceTitle}>Ironing</Text>
            <Text style={styles.serviceDescription}>
              Crisp and ready to wear
            </Text>
            <Text style={styles.servicePrice}>From K30</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active order</Text>

          <Pressable
            onPress={() => router.push('/pages/customerOrders' as never)}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.orderCard}>
          <View style={styles.orderTopRow}>
            <View>
              <Text style={styles.orderNumber}>Order #ORD-1024</Text>
              <Text style={styles.orderDate}>Placed today at 08:45</Text>
            </View>

            <Text style={styles.processingBadge}>Processing</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={styles.completedCircle}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
              <Text style={styles.progressLabel}>Received</Text>
            </View>

            <View style={styles.progressLineActive} />

            <View style={styles.progressStep}>
              <View style={styles.activeCircle}>
                <Text style={styles.activeCircleDot}>•</Text>
              </View>
              <Text style={styles.progressLabel}>Washing</Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressStep}>
              <View style={styles.inactiveCircle} />
              <Text style={styles.progressLabel}>Ready</Text>
            </View>

            <View style={styles.progressLine} />

            <View style={styles.progressStep}>
              <View style={styles.inactiveCircle} />
              <Text style={styles.progressLabel}>Delivered</Text>
            </View>
          </View>

          <Pressable
            style={styles.trackButton}
            onPress={() =>
              Alert.alert(
                'Track order',
                'Detailed order tracking will be added.',
              )
            }
          >
            <Text style={styles.trackButtonText}>Track order</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent orders</Text>

          <Pressable
            onPress={() => router.push('/pages/customerOrders' as never)}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.historyIcon}>
            <Text style={styles.historyIconText}>L</Text>
          </View>

          <View style={styles.historyDetails}>
            <Text style={styles.historyTitle}>Order #ORD-1019</Text>
            <Text style={styles.historySubtitle}>Wash & Fold</Text>
            <Text style={styles.historyDate}>Completed 12 Sep 2026</Text>
          </View>

          <View style={styles.historyRight}>
            <Text style={styles.historyAmount}>K180</Text>
            <Text style={styles.completedText}>Completed</Text>
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
          onPress={() => router.push('/pages/customerOrders' as never)}
        >
          <Text style={styles.navIcon}>▣</Text>
          <Text style={styles.navText}>Orders</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() =>
            router.push('/pages/customerAlerts' as never)
          }
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: colors.secondaryText,
    fontSize: 14,
  },
  name: {
    color: colors.text,
    fontSize: 26,
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
  welcomeCard: {
    minHeight: 190,
    borderRadius: 20,
    backgroundColor: colors.primary,
    padding: 20,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 26,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    color: colors.white,
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 30,
  },
  welcomeDescription: {
    color: '#DDEEFF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 230,
  },
  welcomeIcon: {
    position: 'absolute',
    right: 12,
    top: 14,
    color: 'rgba(255,255,255,0.25)',
    fontSize: 90,
    fontWeight: '800',
  },
  orderButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 18,
  },
  orderButtonPressed: {
    backgroundColor: '#E6F1FF',
  },
  orderButtonText: {
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
  horizontalList: {
    paddingBottom: 24,
    paddingRight: 10,
  },
  serviceCard: {
    width: 170,
    minHeight: 160,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceIcon: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  serviceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  serviceDescription: {
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  servicePrice: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
  },
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  orderTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderNumber: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  orderDate: {
    color: colors.secondaryText,
    fontSize: 12,
    marginTop: 4,
  },
  processingBadge: {
    color: colors.primary,
    backgroundColor: '#E8F2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 26,
  },
  progressStep: {
    alignItems: 'center',
    width: 58,
  },
  completedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  activeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircleDot: {
    color: colors.white,
    fontSize: 20,
    lineHeight: 19,
  },
  inactiveCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D9E2EC',
    backgroundColor: colors.white,
  },
  progressLineActive: {
    flex: 1,
    height: 3,
    backgroundColor: colors.green,
    marginTop: 11,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#D9E2EC',
    marginTop: 11,
  },
  progressLabel: {
    color: colors.secondaryText,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 7,
  },
  trackButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  trackButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
  },
  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyIconText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  historySubtitle: {
    color: colors.secondaryText,
    fontSize: 12,
    marginTop: 3,
  },
  historyDate: {
    color: '#8A94A6',
    fontSize: 11,
    marginTop: 3,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  completedText: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
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