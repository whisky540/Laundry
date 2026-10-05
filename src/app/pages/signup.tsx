import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '@/config/firebase';

export default function SignupPage(): React.JSX.Element {
  const router = useRouter();

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  // Error states
  const [nameError, setNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<string>('');

  const validateForm = (): boolean => {
    let valid = true;

    // Reset errors
    setNameError('');
    setEmailError('');
    setPhoneError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate Name
    if (!name.trim()) {
      setNameError('Full name is required');
      valid = false;
    }

    // Validate Email
    if (!email.trim()) {
      setEmailError('Email address is required');
      valid = false;
    } else if (!email.includes('@')) {
      setEmailError('Enter a valid email address');
      valid = false;
    }

    // Validate Phone
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      valid = false;
    } else if (phone.length < 7) {
      setPhoneError('Enter a valid phone number');
      valid = false;
    }

    // Validate Password
    if (!password.trim()) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must contain at least 6 characters');
      valid = false;
    }

    // Validate Confirm Password
    if (!confirmPassword.trim()) {
      setConfirmPasswordError('Please confirm your password');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      valid = false;
    }

    return valid;
  };

  const handleSignup = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Account created',
        'Your account has been created successfully.',
        [
          {
            text: 'Continue to login',
            onPress: () => {
              router.replace({
                pathname: '/',
                params: { email: normalizedEmail }
              });
            },
          },
        ],
      );
    } catch {
      Alert.alert('Error', 'Unable to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginRedirect = (): void => {
    router.push('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>S</Text>
          </View>

          <Text style={styles.title}>Create account</Text>

          <Text style={styles.subtitle}>
            Join us and make laundry day easier
          </Text>

          <View style={styles.form}>
            {/* Full Name */}
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={[styles.input, nameError ? styles.inputError : undefined]}
              placeholder="Enter your full name"
              placeholderTextColor="#8A94A6"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

            {/* Email */}
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : undefined]}
              placeholder="customer@example.com"
              placeholderTextColor="#8A94A6"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Phone */}
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={[styles.input, phoneError ? styles.inputError : undefined]}
              placeholder="+260 97 000 0000"
              placeholderTextColor="#8A94A6"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  passwordError ? styles.inputError : undefined,
                ]}
                placeholder="Create a password"
                placeholderTextColor="#8A94A6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.showButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showButtonText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Confirm Password */}
            <Text style={styles.label}>Confirm password</Text>
            <View>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  confirmPasswordError ? styles.inputError : undefined,
                ]}
                placeholder="Repeat your password"
                placeholderTextColor="#8A94A6"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.showButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.showButtonText}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}

            {/* Signup Button */}
            <Pressable
              style={({ pressed }) => [
                styles.loginButton, // Reusing loginButton style for consistency
                pressed && styles.loginButtonPressed,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Create account</Text>
              )}
            </Pressable>

            {/* Redirect to Login */}
            <View style={styles.createAccountContainer}>
              <Text style={styles.createAccountText}>
                Already have an account?
              </Text>
              <Pressable onPress={handleLoginRedirect}>
                <Text style={styles.createAccountLink}>
                  {' '}Sign in
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reusing the exact same styles from your Login page for consistency
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
  },
  title: {
    color: '#172B4D',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  label: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    color: '#172B4D',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  passwordInput: {
    paddingRight: 70,
  },
  inputError: {
    borderColor: '#D93025',
  },
  errorText: {
    color: '#D93025',
    fontSize: 12,
    marginTop: 5,
  },
  showButton: {
    position: 'absolute',
    right: 16,
    top: 17,
  },
  showButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
  },
  loginButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginButtonPressed: {
    backgroundColor: '#125AA0',
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  createAccountText: {
    color: '#6B7280',
    fontSize: 14,
  },
  createAccountLink: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
  },
});