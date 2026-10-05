import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAttendance } from '@/hooks/use-attendance';

const colors = {
  primary: '#1976D2',
  background: '#F7FAFC',
  white: '#FFFFFF',
  text: '#172B4D',
  secondaryText: '#6B7280',
  border: '#E7EEF5',
  green: '#16803C',
  greenSoft: '#E9F8EF',
  orange: '#B7791F',
  orangeSoft: '#FFF8E6',
  red: '#C53030',
  redSoft: '#FDECEA',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AttendanceScreen() {
  const router = useRouter();
  const {
    loading,
    record,
    hasMarkedToday,
    isCheckedIn,
    isCheckedOut,
    checkIn,
    checkOut,
  } = useAttendance();
  const [busy, setBusy] = useState(false);

  const verifyFingerprint = async (promptMessage: string): Promise<boolean> => {
    if (!(await LocalAuthentication.hasHardwareAsync())) {
      Alert.alert('Fingerprint unavailable', 'This device does not have biometric hardware.');
      return false;
    }

    if (!(await LocalAuthentication.isEnrolledAsync())) {
      Alert.alert('No fingerprint enrolled', 'Set up a fingerprint in your device settings first.');
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Use device passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  };

  const handleCheckIn = async () => {
    try {
      setBusy(true);
      if (!(await verifyFingerprint('Confirm check-in'))) {
        return;
      }
      await checkIn();
      Alert.alert('Checked in', 'Your attendance has been recorded.');
    } catch {
      Alert.alert('Error', 'Could not record check-in. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setBusy(true);
      if (!(await verifyFingerprint('Confirm check-out'))) {
        return;
      }
      await checkOut();
      Alert.alert('Checked out', 'Have a great rest of your day.');
    } catch {
      Alert.alert('Error', 'Could not record check-out. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = isCheckedOut
    ? 'Shift complete'
    : isCheckedIn
      ? 'On duty'
      : 'Not checked in';
  const statusColor = isCheckedOut
    ? colors.green
    : isCheckedIn
      ? colors.primary
      : colors.red;
  const statusBackground = isCheckedOut
    ? colors.greenSoft
    : isCheckedIn
      ? '#E8F2FF'
      : colors.redSoft;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.topTitle}>Attendance</Text>
          <View style={styles.topSpacer} />
        </View>

        <Text style={styles.todayLabel}>Today</Text>
        <Text style={styles.todayDate}>{formatDateLong(new Date())}</Text>

        <View style={[styles.statusCard, { backgroundColor: statusBackground }]}>
          <Text style={[styles.statusValue, { color: statusColor }]}>{statusLabel}</Text>
          <Text style={styles.statusHint}>
            {isCheckedOut
              ? 'You have completed your shift for today.'
              : isCheckedIn
                ? 'Remember to check out at the end of your shift.'
                : 'Use your fingerprint to check in.'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.timeRow}>
              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>Checked in</Text>
                <Text style={styles.timeValue}>{formatTime(record?.checkInAt ?? null)}</Text>
              </View>
              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>Checked out</Text>
                <Text style={styles.timeValue}>{formatTime(record?.checkOutAt ?? null)}</Text>
              </View>
            </View>

            <Pressable
              style={[styles.fingerprintButton, (busy || hasMarkedToday) && styles.disabled]}
              onPress={handleCheckIn}
              disabled={busy || hasMarkedToday}
            >
              {busy && !isCheckedIn ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.fingerprintIcon}>☝</Text>
                  <Text style={styles.fingerprintTitle}>
                    {isCheckedOut || hasMarkedToday ? 'Checked in' : 'Check in with fingerprint'}
                  </Text>
                  <Text style={styles.fingerprintSubtitle}>
                    {hasMarkedToday ? 'You have already checked in today.' : 'Verify your fingerprint to record attendance.'}
                  </Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.checkoutCard, (!isCheckedIn || isCheckedOut || busy) && styles.disabled]}
              onPress={handleCheckOut}
              disabled={!isCheckedIn || isCheckedOut || busy}
            >
              {busy && isCheckedIn && !isCheckedOut ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Text style={styles.checkoutIcon}>⎋</Text>
                  <View style={styles.checkoutContent}>
                    <Text style={styles.checkoutTitle}>Check out</Text>
                    <Text style={styles.checkoutSubtitle}>End your shift for today</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </>
              )}
            </Pressable>

            <View style={styles.noticeCard}>
              <Text style={styles.noticeIcon}>i</Text>
              <Text style={styles.noticeText}>Fingerprint verification ensures only you can record your attendance.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 60 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  topTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  topSpacer: { width: 45 },
  todayLabel: { color: colors.secondaryText, fontSize: 13 },
  todayDate: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 4, marginBottom: 22 },
  statusCard: { borderRadius: 16, padding: 18, marginBottom: 20 },
  statusValue: { fontSize: 20, fontWeight: '800' },
  statusHint: { color: colors.secondaryText, fontSize: 13, marginTop: 6, lineHeight: 18 },
  loader: { marginTop: 24 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  timeCard: { width: '48%', backgroundColor: colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border },
  timeLabel: { color: colors.secondaryText, fontSize: 12 },
  timeValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 5 },
  fingerprintButton: { backgroundColor: colors.primary, borderRadius: 16, padding: 22, alignItems: 'center', marginBottom: 14 },
  fingerprintIcon: { color: colors.white, fontSize: 32, marginBottom: 8 },
  fingerprintTitle: { color: colors.white, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  fingerprintSubtitle: { color: '#DDEEFF', fontSize: 12, marginTop: 5, textAlign: 'center' },
  checkoutCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
  checkoutIcon: { color: colors.primary, fontSize: 24, marginRight: 12 },
  checkoutContent: { flex: 1 },
  checkoutTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  checkoutSubtitle: { color: colors.secondaryText, fontSize: 12, marginTop: 3 },
  chevron: { color: colors.primary, fontSize: 26 },
  disabled: { opacity: 0.55 },
  noticeCard: { flexDirection: 'row', backgroundColor: colors.orangeSoft, borderRadius: 14, padding: 15 },
  noticeIcon: { width: 24, height: 24, borderRadius: 12, color: colors.orange, borderWidth: 1, borderColor: colors.orange, textAlign: 'center', lineHeight: 21, fontWeight: '800', marginRight: 10 },
  noticeText: { flex: 1, color: '#6B5A2A', fontSize: 12, lineHeight: 17 },
});
