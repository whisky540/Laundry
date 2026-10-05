import { auth, db } from '@/config/firebase';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const colors = {
  primary: '#1976D2',
  primaryDark: '#125AA0',
  background: '#F7FAFC',
  white: '#FFFFFF',
  text: '#172B4D',
  secondaryText: '#6B7280',
  border: '#D9E2EC',
  error: '#D93025',
  green: '#16803C',
};

// Working hours in 24-hour format.
const WORK_START_HOUR = 8; // 08:00
const WORK_END_HOUR = 17; // 17:00
const SLOT_MINUTES = 30; // 30-minute slots

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
};

const services: Service[] = [
  {
    id: 'wash-fold',
    name: 'Wash & Fold',
    description: 'Professional washing, drying and folding',
    price: 5000,
    unit: 'per kg',
  },
  {
    id: 'dry-cleaning',
    name: 'Dry Cleaning',
    description: 'Special care for delicate garments',
    price: 8000,
    unit: 'per item',
  },
  {
    id: 'ironing',
    name: 'Ironing',
    description: 'Clean, crisp and ready-to-wear clothes',
    price: 3000,
    unit: 'per item',
  },
];

type PickupMethod = 'Pickup' | 'Drop-off';

export default function CreateOrderScreen() {
  const router = useRouter();

  const [selectedService, setSelectedService] = useState<Service | null>(
    null,
  );
  const [quantity, setQuantity] = useState('1');
  const [pickupMethod, setPickupMethod] =
    useState<PickupMethod>('Pickup');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const today = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
  }, []);

  const defaultTime = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const minutes = d.getMinutes();
    d.setMinutes(minutes < 30 ? 30 : 0);
    if (minutes >= 30) d.setHours(d.getHours() + 1);
    if (d.getHours() < WORK_START_HOUR) {
      d.setHours(WORK_START_HOUR, 0, 0, 0);
    }
    if (d.getHours() >= WORK_END_HOUR) {
      d.setHours(WORK_END_HOUR - 1, 0, 0, 0);
    }
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedTime, setSelectedTime] = useState<Date>(defaultTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const loadCustomerPhone = async () => {
      const user = auth.currentUser;

      if (!user) {
        return;
      }

      const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
      const savedPhone = profileSnapshot.data()?.phone;

      if (typeof savedPhone === 'string' && savedPhone.trim()) {
        setPhone(savedPhone.trim());
      }
    };

    void loadCustomerPhone();
  }, []);

  const total = useMemo(() => {
    if (!selectedService) {
      return 0;
    }

    const numericQuantity = Number(quantity) || 0;
    return selectedService.price * numericQuantity;
  }, [selectedService, quantity]);

  const formatDateLabel = (date: Date): string =>
    date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  const formatTimeLabel = (date: Date): string =>
    date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

  const to12Hour = (hour24: number): string => {
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:00 ${period}`;
  };

  const workingHoursLabel = `${to12Hour(WORK_START_HOUR)} – ${to12Hour(
    WORK_END_HOUR,
  )}`;

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!selectedService) {
      nextErrors.service = 'Please select a laundry service';
    }

    const numericQuantity = Number(quantity);

    if (!quantity.trim()) {
      nextErrors.quantity = 'Quantity is required';
    } else if (!Number.isInteger(numericQuantity) || numericQuantity < 1) {
      nextErrors.quantity = 'Enter a valid quantity';
    }

    if (pickupMethod === 'Pickup' && !address.trim()) {
      nextErrors.address = 'Pickup address is required';
    }

    if (!phone.trim()) {
      nextErrors.phone = 'Phone number is required';
    }

    const selectedHour = selectedTime.getHours();

    if (selectedHour < WORK_START_HOUR || selectedHour >= WORK_END_HOUR) {
      nextErrors.time = `Pickup time must be between ${workingHoursLabel}`;
    }

    const isToday =
      selectedDate.toDateString() === new Date().toDateString();

    if (isToday && selectedTime <= new Date()) {
      nextErrors.time = 'Pickup time must be in the future';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const increaseQuantity = () => {
    const currentQuantity = Number(quantity) || 1;
    setQuantity(String(currentQuantity + 1));
  };

  const decreaseQuantity = () => {
    const currentQuantity = Number(quantity) || 1;

    if (currentQuantity > 1) {
      setQuantity(String(currentQuantity - 1));
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed' || !date) return;

    setSelectedDate(date);

    const now = new Date();
    const pickedIsToday = date.toDateString() === now.toDateString();

    if (pickedIsToday && selectedTime <= now) {
      const next = new Date(date);
      next.setHours(now.getHours(), now.getMinutes() < 30 ? 30 : 0, 0, 0);
      if (now.getMinutes() >= 30) next.setHours(now.getHours() + 1, 0, 0, 0);

      if (next.getHours() < WORK_START_HOUR) {
        next.setHours(WORK_START_HOUR, 0, 0, 0);
      }
      if (next.getHours() >= WORK_END_HOUR) {
        next.setHours(WORK_END_HOUR - 1, 0, 0, 0);
      }

      setSelectedTime(next);
    }

    setErrors(prev => ({ ...prev, date: '', time: '' }));
  };

  const handleTimeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed' || !date) return;

    const rounded = new Date(date);
    const m = rounded.getMinutes();
    rounded.setMinutes(m < 30 ? 0 : 30, 0, 0);

    setSelectedTime(rounded);
    setErrors(prev => ({ ...prev, time: '' }));
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user || !selectedService) {
        throw new Error('You must be signed in to place an order.');
      }

      const pickupAt = new Date(selectedDate);
      pickupAt.setHours(
        selectedTime.getHours(),
        selectedTime.getMinutes(),
        0,
        0,
      );

      await addDoc(collection(db, 'orders'), {
        customerId: user.uid,
        customerEmail: user.email,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        quantity: Number(quantity),
        unit: selectedService.unit,
        pickupMethod,
        pickupAddress: pickupMethod === 'Pickup' ? address.trim() : null,
        phone: phone.trim(),
        notes: notes.trim(),
        pickupDate: formatDateLabel(selectedDate),
        pickupTime: formatTimeLabel(selectedTime),
        pickupAt: pickupAt.toISOString(),
        total,
        status: 'Pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Order submitted',
        `Your ${selectedService?.name} order has been scheduled for ${formatDateLabel(
          selectedDate,
        )} at ${formatTimeLabel(selectedTime)}.`,
        [
          {
            text: 'View my orders',
            onPress: () => router.replace('/pages/customerOrders' as never),
          },
        ],
      );
    } catch {
      Alert.alert('Order failed', 'Your order could not be submitted. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <Text style={styles.headerTitle}>Place an order</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionTitle}>Choose a service</Text>

          {services.map(service => {
            const isSelected = selectedService?.id === service.id;

            return (
              <Pressable
                key={service.id}
                style={[
                  styles.serviceCard,
                  isSelected && styles.selectedServiceCard,
                ]}
                onPress={() => {
                  setSelectedService(service);
                  setErrors(currentErrors => ({
                    ...currentErrors,
                    service: '',
                  }));
                }}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    isSelected && styles.selectedServiceIcon,
                  ]}
                >
                  <Text
                    style={[
                      styles.serviceIconText,
                      isSelected && styles.selectedServiceIconText,
                    ]}
                  >
                    S
                  </Text>
                </View>

                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>
                    {service.description}
                  </Text>
                  <Text style={styles.servicePrice}>
                    K{service.price} {service.unit}
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    isSelected && styles.radioOuterSelected,
                  ]}
                >
                  {isSelected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}

          {errors.service ? (
            <Text style={styles.errorText}>{errors.service}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>Quantity</Text>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityDescription}>
              {selectedService
                ? `Quantity ${selectedService.unit}`
                : 'Select a service first'}
            </Text>

            <View style={styles.quantityControls}>
              <Pressable
                style={styles.quantityButton}
                onPress={decreaseQuantity}
              >
                <Text style={styles.quantityButtonText}>−</Text>
              </Pressable>

              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                textAlign="center"
              />

              <Pressable
                style={styles.quantityButton}
                onPress={increaseQuantity}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {errors.quantity ? (
            <Text style={styles.errorText}>{errors.quantity}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>Order method</Text>

          <View style={styles.methodContainer}>
            <Pressable
              style={[
                styles.methodButton,
                pickupMethod === 'Pickup' && styles.selectedMethodButton,
              ]}
              onPress={() => setPickupMethod('Pickup')}
            >
              <Text style={styles.methodIcon}>⌂</Text>
              <Text
                style={[
                  styles.methodText,
                  pickupMethod === 'Pickup' && styles.selectedMethodText,
                ]}
              >
                Pickup
              </Text>
              <Text style={styles.methodDescription}>
                We collect from you
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.methodButton,
                pickupMethod === 'Drop-off' && styles.selectedMethodButton,
              ]}
              onPress={() => setPickupMethod('Drop-off')}
            >
              <Text style={styles.methodIcon}>→</Text>
              <Text
                style={[
                  styles.methodText,
                  pickupMethod === 'Drop-off' &&
                    styles.selectedMethodText,
                ]}
              >
                Drop-off
              </Text>
              <Text style={styles.methodDescription}>
                Bring clothes to us
              </Text>
            </Pressable>
          </View>

          {pickupMethod === 'Pickup' ? (
            <>
              <Text style={styles.sectionTitle}>Pickup address</Text>

              <TextInput
                style={[
                  styles.textInput,
                  styles.multilineInput,
                  errors.address && styles.inputError,
                ]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your pickup address"
                placeholderTextColor="#8A94A6"
                multiline
                textAlignVertical="top"
              />

              {errors.address ? (
                <Text style={styles.errorText}>{errors.address}</Text>
              ) : null}
            </>
          ) : (
            <View style={styles.dropOffNotice}>
              <Text style={styles.noticeIcon}>i</Text>
              <Text style={styles.noticeText}>
                You can drop off your clothes at our laundry shop during
                opening hours.
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Contact number</Text>

          <TextInput
            style={[styles.textInput, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+260 97 000 0000"
            placeholderTextColor="#8A94A6"
            keyboardType="phone-pad"
          />

          {errors.phone ? (
            <Text style={styles.errorText}>{errors.phone}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>
            Preferred pickup date & time
          </Text>

          <View style={styles.dateTimeRow}>
            <Pressable
              style={[styles.pickerCard, errors.date && styles.inputError]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.pickerLabel}>Date</Text>
              <Text style={styles.pickerValue}>
                {formatDateLabel(selectedDate)}
              </Text>
              <Text style={styles.pickerHint}>Tap to change</Text>
            </Pressable>

            <Pressable
              style={[styles.pickerCard, errors.time && styles.inputError]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.pickerLabel}>Time</Text>
              <Text style={styles.pickerValue}>
                {formatTimeLabel(selectedTime)}
              </Text>
              <Text style={styles.pickerHint}>Tap to change</Text>
            </Pressable>
          </View>

          <View style={styles.workingHoursNotice}>
            <Text style={styles.noticeIcon}>i</Text>
            <Text style={styles.noticeText}>
              We operate between {workingHoursLabel}. Slots are every{' '}
              {SLOT_MINUTES} minutes.
            </Text>
          </View>

          {errors.date ? (
            <Text style={styles.errorText}>{errors.date}</Text>
          ) : null}
          {errors.time ? (
            <Text style={styles.errorText}>{errors.time}</Text>
          ) : null}

          {showDatePicker ? (
            Platform.OS === 'ios' ? (
              <Modal
                transparent
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerModal}>
                    <Text style={styles.pickerModalTitle}>Choose pickup date</Text>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      maximumDate={
                        new Date(new Date().setDate(new Date().getDate() + 30))
                      }
                      onChange={handleDateChange}
                      themeVariant="light"
                    />
                    <Pressable
                      style={styles.pickerDoneButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                maximumDate={
                  new Date(new Date().setDate(new Date().getDate() + 30))
                }
                onChange={handleDateChange}
                themeVariant="light"
              />
            )
          ) : null}

          {showTimePicker ? (
            Platform.OS === 'ios' ? (
              <Modal
                transparent
                animationType="slide"
                visible={showTimePicker}
                onRequestClose={() => setShowTimePicker(false)}
              >
                <View style={styles.pickerOverlay}>
                  <View style={styles.pickerModal}>
                    <Text style={styles.pickerModalTitle}>Choose pickup time</Text>
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      display="spinner"
                      is24Hour={false}
                      minuteInterval={
                        SLOT_MINUTES as
                          | 1
                          | 2
                          | 3
                          | 4
                          | 5
                          | 6
                          | 10
                          | 12
                          | 15
                          | 20
                          | 30
                      }
                      onChange={handleTimeChange}
                      themeVariant="light"
                    />
                    <Pressable
                      style={styles.pickerDoneButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.pickerDoneText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="default"
                is24Hour={false}
                minuteInterval={
                  SLOT_MINUTES as
                    | 1
                    | 2
                    | 3
                    | 4
                    | 5
                    | 6
                    | 10
                    | 12
                    | 15
                    | 20
                    | 30
                }
                onChange={handleTimeChange}
                themeVariant="light"
              />
            )
          ) : null}

          <Text style={styles.sectionTitle}>Additional notes</Text>

          <TextInput
            style={[styles.textInput, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Example: Separate white clothes"
            placeholderTextColor="#8A94A6"
            multiline
            textAlignVertical="top"
          />

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service</Text>
              <Text style={styles.summaryValue}>
                {selectedService?.name ?? 'Not selected'}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Quantity</Text>
              <Text style={styles.summaryValue}>{quantity}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Method</Text>
              <Text style={styles.summaryValue}>{pickupMethod}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pickup</Text>
              <Text style={styles.summaryValue}>
                {formatDateLabel(selectedDate)} ·{' '}
                {formatTimeLabel(selectedTime)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Estimated total</Text>
              <Text style={styles.totalValue}>K{total}</Text>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
              loading && styles.disabledButton,
            ]}
            onPress={handleSubmitOrder}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting order...' : 'Submit order'}
            </Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            The final price may change after our team checks the clothes and
            confirms the order.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.text,
    fontSize: 38,
    lineHeight: 38,
    fontWeight: '300',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 38,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 12,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  selectedServiceCard: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedServiceIcon: {
    backgroundColor: colors.primary,
  },
  serviceIconText: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '800',
  },
  selectedServiceIconText: {
    color: colors.white,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  serviceDescription: {
    color: colors.secondaryText,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  servicePrice: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  quantityDescription: {
    color: colors.secondaryText,
    fontSize: 13,
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  quantityInput: {
    width: 42,
    height: 36,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  methodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    width: '48%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 15,
  },
  selectedMethodButton: {
    borderColor: colors.primary,
    backgroundColor: '#F0F7FF',
  },
  methodIcon: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 8,
  },
  methodText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  selectedMethodText: {
    color: colors.primary,
  },
  methodDescription: {
    color: colors.secondaryText,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  textInput: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 15,
  },
  multilineInput: {
    minHeight: 84,
    paddingTop: 14,
  },
  notesInput: {
    minHeight: 90,
    paddingTop: 14,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 5,
  },
  dropOffNotice: {
    flexDirection: 'row',
    backgroundColor: '#E8F2FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 22,
  },
  noticeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.primary,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '800',
    marginRight: 9,
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 18,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  pickerLabel: {
    color: colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  pickerHint: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  pickerModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  pickerModalTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  pickerDoneButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  pickerDoneText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  workingHoursNotice: {
    flexDirection: 'row',
    backgroundColor: '#E8F2FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  summaryLabel: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  totalLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  totalValue: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '800',
  },
  submitButton: {
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  submitButtonPressed: {
    backgroundColor: colors.primaryDark,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  disclaimer: {
    color: colors.secondaryText,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 12,
  },
});