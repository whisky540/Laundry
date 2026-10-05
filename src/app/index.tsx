import React, { useState } from 'react';
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
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
import { useRouter } from 'expo-router'; 
import { auth } from '@/config/firebase';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter(); 

  // Explicitly typing your state as strings and booleans
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');

  // Typing the return value as a boolean
  const validateForm = (): boolean => {
    let valid = true;

    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Email address is required');
      valid = false;
    } else if (!email.includes('@')) {
      setEmailError('Enter a valid email address');
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError('Password is required');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must contain at least 6 characters');
      valid = false;
    }

    return valid;
  };

  // Typing the async function return as a Promise<void>
  const handleLogin = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password,
      );
      const profileSnapshot = await getDoc(
        doc(db, 'users', userCredential.user.uid),
      );
      const profileName = profileSnapshot.data()?.name;
      const userName =
        typeof profileName === 'string' && profileName.trim()
          ? profileName.trim()
          : normalizedEmail.split('@')[0];

      if (normalizedEmail === 'admin@superkleen.com') {
        router.replace({ pathname: '/pages/adminHome', params: { name: userName } });
      } else if (normalizedEmail.endsWith('@superkleen.com')) {
        router.replace({ pathname: '/pages/employeeHome', params: { name: userName } });
      } else if (normalizedEmail.endsWith('@gmail.com')) {
        router.replace({ pathname: '/pages/customerHome', params: { name: userName } });
      } else {
        await auth.signOut();
        Alert.alert(
          'Unsupported account',
          'Use a Gmail account for customers or a Super Kleen account for employees.',
        );
      }
    } catch (error: unknown) {
      const errorCode = error instanceof Error && 'code' in error
        ? (error as { code: string }).code
        : '';

      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        Alert.alert('Login failed', 'The email or password is incorrect.');
      } else if (errorCode === 'auth/user-not-found') {
        Alert.alert('Login failed', 'No account exists for this email address.');
      } else {
        Alert.alert('Error', 'Unable to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError('Enter your email address first');
      return;
    }

    if (!normalizedEmail.includes('@')) {
      setEmailError('Enter a valid email address');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      Alert.alert(
        'Reset email sent',
        `Check ${normalizedEmail} for a link to create a new password.`,
      );
    } catch (error: unknown) {
      const errorCode =
        error instanceof Error && 'code' in error
          ? (error as { code: string }).code
          : '';

      if (errorCode === 'auth/user-not-found') {
        Alert.alert('Account not found', 'No account exists for that email address.');
      } else if (errorCode === 'auth/invalid-email') {
        setEmailError('Enter a valid email address');
      } else if (errorCode === 'auth/too-many-requests') {
        Alert.alert('Try again later', 'Too many reset attempts. Please wait and try again.');
      } else {
        Alert.alert('Reset failed', 'Unable to send the reset email. Please try again.');
      }
    }
  };

  // Typing the navigation function
  const handleCreateAccount = (): void => {
    router.push('/pages/signup');
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

          <Text style={styles.title}>Welcome</Text>

          <Text style={styles.subtitle}>
            Sign in to manage your laundry orders
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email address</Text>

            <TextInput
              style={[
                styles.input,
                emailError ? styles.inputError : undefined,
              ]}
              placeholder="customer@example.com"
              placeholderTextColor="#8A94A6"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}

            <Text style={styles.label}>Password</Text>

            <View>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  passwordError ? styles.inputError : undefined,
                ]}
                placeholder="Enter your password"
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

            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <Pressable
              style={styles.forgotButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.loginButtonPressed,
                loading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign in</Text>
              )}
            </Pressable>

            <View style={styles.createAccountContainer}>
              <Text style={styles.createAccountText}>
                Do not have an account?
              </Text>

              <Pressable onPress={handleCreateAccount}>
                <Text style={styles.createAccountLink}>
                  {' '}Create account
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 16,
  },
  forgotText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
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