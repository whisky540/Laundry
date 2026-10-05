import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, employeeAuth } from '@/config/firebase';
import { useTimeGreeting } from '@/hooks/use-time-greeting';

type Page = 'login' | 'signup' | 'adminHome';

type AdminTab =
  | 'home'
  | 'orders'
  | 'customers'
  | 'employees'
  | 'settings'
  | 'alerts';

type OrderStatus = 'Pending' | 'Processing' | 'Ready' | 'Delivered';

type Order = {
  id: string;
  customer: string;
  service: string;
  amount: string;
  status: OrderStatus;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

type AdminOrder = {
  id: string;
  customerEmail: string;
  serviceName: string;
  quantity: number;
  pickupDate: string;
  pickupTime: string;
  pickupMethod: string;
  pickupAddress: string | null;
  total: number;
  status: string;
  employeeId?: string;
  employeeName?: string;
};

const orders: Order[] = [
  {
    id: '#ORD-1024',
    customer: 'Mary Banda',
    service: 'Wash and Fold',
    amount: 'K180',
    status: 'Processing',
  },
  {
    id: '#ORD-1023',
    customer: 'John Phiri',
    service: 'Dry Cleaning',
    amount: 'K250',
    status: 'Ready',
  },
  {
    id: '#ORD-1022',
    customer: 'Grace Mwansa',
    service: 'Ironing',
    amount: 'K120',
    status: 'Pending',
  },
];

const initialEmployees: Employee[] = [
  {
    id: 'EMP-001',
    name: 'Peter Zulu',
    email: 'peter.zulu@laundry.com',
    phone: '+260 97 111 2222',
    role: 'Attendant',
  },
  {
    id: 'EMP-002',
    name: 'Chanda Mulenga',
    email: 'chanda.m@laundry.com',
    phone: '+260 96 333 4444',
    role: 'Washer',
  },
];

const EMPLOYEE_ROLES = ['Attendant', 'Washer', 'Ironer', 'Cashier', 'Manager'];

export default function App() {
  const router = useRouter();
  const { name: routeName } = useLocalSearchParams<{ name?: string }>();
  const adminName = routeName?.trim() || 'Admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const greeting = useTimeGreeting();

  const [page, setPage] = useState<Page>('adminHome');
  const [adminTab, setAdminTab] = useState<AdminTab>('home');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ---- Employee management state ----
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [employeeCounter, setEmployeeCounter] = useState(
    initialEmployees.length + 1,
  );
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePhone, setNewEmployeePhone] = useState('');
  const [newEmployeePassword, setNewEmployeePassword] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState(EMPLOYEE_ROLES[0]);
  const [employeeErrors, setEmployeeErrors] = useState<Record<string, string>>(
    {},
  );
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState<string | null>(
    null,
  );

  const loadAdminWorkspace = async () => {
    setOrdersLoading(true);

    try {
      const [ordersSnapshot, employeesSnapshot] = await Promise.all([
        getDocs(collection(db, 'orders')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'employee'))),
      ]);

      const loadedOrders = ordersSnapshot.docs.map(orderDocument => {
        const data = orderDocument.data();

        return {
          id: orderDocument.id,
          customerEmail: (data.customerEmail as string) || 'Customer',
          serviceName: (data.serviceName as string) || 'Laundry service',
          quantity: (data.quantity as number) || 0,
          pickupDate: (data.pickupDate as string) || '',
          pickupTime: (data.pickupTime as string) || '',
          pickupMethod: (data.pickupMethod as string) || 'Pickup',
          pickupAddress: (data.pickupAddress as string | null) || null,
          total: (data.total as number) || 0,
          status: (data.status as string) || 'Pending',
          employeeId: data.employeeId as string | undefined,
          employeeName: data.employeeName as string | undefined,
        };
      });

      const loadedEmployees = employeesSnapshot.docs.map(employeeDocument => {
        const data = employeeDocument.data();

        return {
          id: employeeDocument.id,
          name: (data.name as string) || 'Employee',
          email: (data.email as string) || '',
          phone: (data.phone as string) || '',
          role: (data.employeeRole as string) || 'Employee',
        };
      });

      setAdminOrders(loadedOrders);
      setEmployees(loadedEmployees);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminWorkspace();
  }, []);

  const assignOrder = async (order: AdminOrder, employee: Employee) => {
    try {
      setAssignmentLoading(order.id);
      await updateDoc(doc(db, 'orders', order.id), {
        employeeId: employee.id,
        employeeName: employee.name,
        assignedAt: serverTimestamp(),
        status: order.status === 'Pending' ? 'Processing' : order.status,
      });

      setAdminOrders(currentOrders =>
        currentOrders.map(currentOrder =>
          currentOrder.id === order.id
            ? {
                ...currentOrder,
                employeeId: employee.id,
                employeeName: employee.name,
                status:
                  currentOrder.status === 'Pending'
                    ? 'Processing'
                    : currentOrder.status,
              }
            : currentOrder,
        ),
      );
    } catch {
      Alert.alert('Assignment failed', 'The order could not be assigned.');
    } finally {
      setAssignmentLoading(null);
    }
  };

  const clearErrors = () => {
    setErrors({});
  };

  const validateLogin = () => {
    const nextErrors: Record<string, string> = {};

    if (!loginEmail.trim()) {
      nextErrors.loginEmail = 'Email address is required';
    } else if (!loginEmail.includes('@')) {
      nextErrors.loginEmail = 'Enter a valid email address';
    }

    if (!loginPassword.trim()) {
      nextErrors.loginPassword = 'Password is required';
    } else if (loginPassword.length < 6) {
      nextErrors.loginPassword =
        'Password must contain at least 6 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSignup = () => {
    const nextErrors: Record<string, string> = {};

    if (!signupName.trim()) {
      nextErrors.signupName = 'Full name is required';
    }

    if (!signupEmail.trim()) {
      nextErrors.signupEmail = 'Email address is required';
    } else if (!signupEmail.includes('@')) {
      nextErrors.signupEmail = 'Enter a valid email address';
    }

    if (!signupPhone.trim()) {
      nextErrors.signupPhone = 'Phone number is required';
    }

    if (!signupPassword.trim()) {
      nextErrors.signupPassword = 'Password is required';
    } else if (signupPassword.length < 6) {
      nextErrors.signupPassword =
        'Password must contain at least 6 characters';
    }

    if (!signupConfirmPassword.trim()) {
      nextErrors.signupConfirmPassword = 'Please confirm your password';
    } else if (signupPassword !== signupConfirmPassword) {
      nextErrors.signupConfirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLogin()) {
      return;
    }

    try {
      setLoginLoading(true);

      // Temporary login simulation.
      await new Promise(resolve => setTimeout(resolve, 1000));

      setPage('adminHome');
      setAdminTab('home');
      clearErrors();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) {
      return;
    }

    try {
      setSignupLoading(true);

      // Temporary signup simulation.
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert(
        'Account created',
        'Your account has been created successfully.',
        [
          {
            text: 'Continue to login',
            onPress: () => {
              setPage('login');
              setLoginEmail(signupEmail);
              setLoginPassword('');
              clearErrors();
            },
          },
        ],
      );
    } finally {
      setSignupLoading(false);
    }
  };

  // ---------------- EMPLOYEE MANAGEMENT ----------------

  const openAddEmployeeModal = () => {
    setNewEmployeeName('');
    setNewEmployeeEmail('');
    setNewEmployeePhone('');
    setNewEmployeePassword('');
    setNewEmployeeRole(EMPLOYEE_ROLES[0]);
    setEmployeeErrors({});
    setShowAddEmployee(true);
  };

  const closeAddEmployeeModal = () => {
    if (employeeLoading) {
      return;
    }
    setShowAddEmployee(false);
  };

  const validateNewEmployee = () => {
    const nextErrors: Record<string, string> = {};
    const employeeEmail = `${newEmployeeEmail.trim().toLowerCase()}@superkleen.com`;

    if (!newEmployeeName.trim()) {
      nextErrors.name = 'Full name is required';
    }

    if (!newEmployeeEmail.trim()) {
      nextErrors.email = 'Email address is required';
    } else if (
      employees.some(
        e => e.email.toLowerCase() === employeeEmail,
      )
    ) {
      nextErrors.email = 'An employee with this email already exists';
    }

    if (!newEmployeePhone.trim()) {
      nextErrors.phone = 'Phone number is required';
    }

    if (!newEmployeeRole.trim()) {
      nextErrors.role = 'Please select a role';
    }

    if (!newEmployeePassword.trim()) {
      nextErrors.password = 'Temporary password is required';
    } else if (newEmployeePassword.length < 6) {
      nextErrors.password = 'Password must contain at least 6 characters';
    }

    setEmployeeErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleAddEmployee = async () => {
    if (!validateNewEmployee()) {
      return;
    }

    try {
      setEmployeeLoading(true);

      const employeeEmail = `${newEmployeeEmail.trim().toLowerCase()}@superkleen.com`;
      const userCredential = await createUserWithEmailAndPassword(
        employeeAuth,
        employeeEmail,
        newEmployeePassword,
      );

      const newEmployee: Employee = {
        id: userCredential.user.uid,
        name: newEmployeeName.trim(),
        email: employeeEmail,
        phone: newEmployeePhone.trim(),
        role: newEmployeeRole,
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: 'employee',
        employeeRole: newEmployee.role,
        createdAt: serverTimestamp(),
      });
      await signOut(employeeAuth);

      setEmployees(prev => [...prev, newEmployee]);
      setEmployeeCounter(prev => prev + 1);
      setShowAddEmployee(false);
      setEmployeeErrors({});

      Alert.alert(
        'Employee added',
        `${newEmployee.name} has been added to your team.`,
      );
    } catch (error: unknown) {
      const errorCode = error instanceof Error && 'code' in error
        ? (error as { code: string }).code
        : '';

      if (errorCode === 'auth/email-already-in-use') {
        Alert.alert('Employee not added', 'That employee email is already in use.');
      } else {
        Alert.alert('Employee not added', 'Unable to create the employee account. Please try again.');
      }
    } finally {
      setEmployeeLoading(false);
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    Alert.alert(
      'Delete employee',
      `Are you sure you want to remove ${employee.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setEmployees(prev => prev.filter(e => e.id !== employee.id));
          },
        },
      ],
    );
  };

  // ---------------- AUTH SCREENS ----------------

  const renderLoginPage = () => (
    <View style={styles.authContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>L</Text>
      </View>

      <Text style={styles.authTitle}>Welcome back</Text>

      <Text style={styles.authSubtitle}>
        Sign in to manage your laundry shop
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email address</Text>

        <TextInput
          style={[
            styles.input,
            errors.loginEmail ? styles.inputError : undefined,
          ]}
          placeholder="admin@example.com"
          placeholderTextColor="#8A94A6"
          value={loginEmail}
          onChangeText={setLoginEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {errors.loginEmail ? (
          <Text style={styles.errorText}>{errors.loginEmail}</Text>
        ) : null}

        <Text style={styles.label}>Password</Text>

        <View>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              errors.loginPassword ? styles.inputError : undefined,
            ]}
            placeholder="Enter your password"
            placeholderTextColor="#8A94A6"
            value={loginPassword}
            onChangeText={setLoginPassword}
            secureTextEntry={!showLoginPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={styles.showButton}
            onPress={() => setShowLoginPassword(!showLoginPassword)}
          >
            <Text style={styles.showButtonText}>
              {showLoginPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </View>

        {errors.loginPassword ? (
          <Text style={styles.errorText}>{errors.loginPassword}</Text>
        ) : null}

        <Pressable
          style={styles.forgotButton}
          onPress={() =>
            Alert.alert(
              'Forgot password',
              'Password recovery will be added later.',
            )
          }
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            loginLoading && styles.disabledButton,
          ]}
          onPress={handleLogin}
          disabled={loginLoading}
        >
          {loginLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Sign in</Text>
          )}
        </Pressable>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>New administrator?</Text>

          <Pressable
            onPress={() => {
              setPage('signup');
              clearErrors();
            }}
          >
            <Text style={styles.switchLink}> Create account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderSignupPage = () => (
    <View style={styles.authContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>L</Text>
      </View>

      <Text style={styles.authTitle}>Create admin account</Text>

      <Text style={styles.authSubtitle}>
        Set up your laundry shop administrator account
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Full name</Text>

        <TextInput
          style={[
            styles.input,
            errors.signupName ? styles.inputError : undefined,
          ]}
          placeholder="Enter your full name"
          placeholderTextColor="#8A94A6"
          value={signupName}
          onChangeText={setSignupName}
          autoCapitalize="words"
        />

        {errors.signupName ? (
          <Text style={styles.errorText}>{errors.signupName}</Text>
        ) : null}

        <Text style={styles.label}>Email address</Text>

        <TextInput
          style={[
            styles.input,
            errors.signupEmail ? styles.inputError : undefined,
          ]}
          placeholder="admin@example.com"
          placeholderTextColor="#8A94A6"
          value={signupEmail}
          onChangeText={setSignupEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {errors.signupEmail ? (
          <Text style={styles.errorText}>{errors.signupEmail}</Text>
        ) : null}

        <Text style={styles.label}>Phone number</Text>

        <TextInput
          style={[
            styles.input,
            errors.signupPhone ? styles.inputError : undefined,
          ]}
          placeholder="+260 97 000 0000"
          placeholderTextColor="#8A94A6"
          value={signupPhone}
          onChangeText={setSignupPhone}
          keyboardType="phone-pad"
        />

        {errors.signupPhone ? (
          <Text style={styles.errorText}>{errors.signupPhone}</Text>
        ) : null}

        <Text style={styles.label}>Password</Text>

        <View>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              errors.signupPassword ? styles.inputError : undefined,
            ]}
            placeholder="Create a password"
            placeholderTextColor="#8A94A6"
            value={signupPassword}
            onChangeText={setSignupPassword}
            secureTextEntry={!showSignupPassword}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Pressable
            style={styles.showButton}
            onPress={() => setShowSignupPassword(!showSignupPassword)}
          >
            <Text style={styles.showButtonText}>
              {showSignupPassword ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        </View>

        {errors.signupPassword ? (
          <Text style={styles.errorText}>{errors.signupPassword}</Text>
        ) : null}

        <Text style={styles.label}>Confirm password</Text>

        <View>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              errors.signupConfirmPassword
                ? styles.inputError
                : undefined,
            ]}
            placeholder="Repeat your password"
            placeholderTextColor="#8A94A6"
            value={signupConfirmPassword}
            onChangeText={setSignupConfirmPassword}
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

        {errors.signupConfirmPassword ? (
          <Text style={styles.errorText}>
            {errors.signupConfirmPassword}
          </Text>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
            signupLoading && styles.disabledButton,
          ]}
          onPress={handleSignup}
          disabled={signupLoading}
        >
          {signupLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Create account</Text>
          )}
        </Pressable>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>Already have an account?</Text>

          <Pressable
            onPress={() => {
              setPage('login');
              clearErrors();
            }}
          >
            <Text style={styles.switchLink}> Sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  // ---------------- ADMIN: HOME TAB ----------------

  const renderHomeTab = () => (
    <>
      <View style={styles.adminHeader}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.adminName}>{adminName}</Text>
        </View>

        <Pressable
          style={styles.profileButton}
          onPress={() =>
            Alert.alert('Profile', 'Profile settings will be added later.')
          }
        >
          <Text style={styles.profileText}>{adminInitial}</Text>
        </Pressable>
      </View>

      <View style={styles.shopStatus}>
        <View style={styles.statusDot} />
        <Text style={styles.shopStatusText}>Shop is open</Text>

        <Pressable
          onPress={() =>
            Alert.alert(
              'Shop status',
              'Shop status management will be added later.',
            )
          }
        >
          <Text style={styles.manageText}>Manage</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Overview</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>₭</Text>
          <Text style={styles.statValue}>K4,850</Text>
          <Text style={styles.statLabel}>Today’s revenue</Text>
          <Text style={styles.statChange}>+12.5%</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>▣</Text>
          <Text style={styles.statValue}>24</Text>
          <Text style={styles.statLabel}>New orders</Text>
          <Text style={styles.statChange}>+8 today</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>◉</Text>
          <Text style={styles.statValue}>18</Text>
          <Text style={styles.statLabel}>In progress</Text>
          <Text style={styles.statNeutral}>Currently active</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>✓</Text>
          <Text style={styles.statValue}>32</Text>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statChange}>This week</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>

      <View style={styles.actionsGrid}>
        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() =>
            Alert.alert('New order', 'New order screen will be added later.')
          }
        >
          <Text style={styles.actionIcon}>＋</Text>
          <Text style={styles.actionTitle}>New order</Text>
          <Text style={styles.actionSubtitle}>Create an order</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() =>
            Alert.alert(
              'Services',
              'Service management will be added later.',
            )
          }
        >
          <Text style={styles.actionIcon}>▤</Text>
          <Text style={styles.actionTitle}>Services</Text>
          <Text style={styles.actionSubtitle}>Manage pricing</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() => setAdminTab('employees')}
        >
          <Text style={styles.actionIcon}>♙</Text>
          <Text style={styles.actionTitle}>Employees</Text>
          <Text style={styles.actionSubtitle}>
            {employees.length} on team
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionCard,
            pressed && styles.actionCardPressed,
          ]}
          onPress={() =>
            router.push('/pages/adminReports' as never)
          }
        >
          <Text style={styles.actionIcon}>▥</Text>
          <Text style={styles.actionTitle}>Reports</Text>
          <Text style={styles.actionSubtitle}>View analytics</Text>
        </Pressable>
      </View>

      <View style={styles.ordersHeader}>
        <Text style={styles.sectionTitle}>Recent orders</Text>

        <Pressable
          onPress={() =>
            Alert.alert(
              'All orders',
              'The complete orders list will be added later.',
            )
          }
        >
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      <View style={styles.ordersCard}>
        {orders.map((order, index) => (
          <Pressable
            key={order.id}
            style={[
              styles.orderRow,
              index !== orders.length - 1 && styles.orderBorder,
            ]}
            onPress={() =>
              Alert.alert(
                order.id,
                `${order.customer}\n${order.service}\n${order.amount}`,
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
            </View>

            <View style={styles.orderRight}>
              <Text style={styles.orderAmount}>{order.amount}</Text>
              <Text
                style={[
                  styles.orderStatus,
                  order.status === 'Processing' &&
                    styles.processingStatus,
                  order.status === 'Ready' && styles.readyStatus,
                  order.status === 'Pending' && styles.pendingStatus,
                  order.status === 'Delivered' && styles.deliveredStatus,
                ]}
              >
                {order.status}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );

  // ---------------- ADMIN: EMPLOYEES TAB ----------------

  const renderEmployeesTab = () => (
    <>
      <View style={styles.adminHeader}>
        <View>
          <Text style={styles.greeting}>Manage team</Text>
          <Text style={styles.adminName}>Employees</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.addEmployeeHeaderButton,
            pressed && styles.addEmployeeHeaderButtonPressed,
          ]}
          onPress={openAddEmployeeModal}
        >
          <Text style={styles.addEmployeeHeaderText}>＋ Add</Text>
        </Pressable>
      </View>

      <View style={styles.employeeSummaryCard}>
        <Text style={styles.employeeSummaryValue}>{employees.length}</Text>
        <Text style={styles.employeeSummaryLabel}>
          {employees.length === 1 ? 'Employee' : 'Employees'} on your team
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Team members</Text>

      {employees.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>♙</Text>
          <Text style={styles.emptyStateTitle}>No employees yet</Text>
          <Text style={styles.emptyStateText}>
            Tap “Add” to create your first employee account.
          </Text>
        </View>
      ) : (
        <View style={styles.employeesList}>
          {employees.map(employee => (
            <View key={employee.id} style={styles.employeeCard}>
              <View style={styles.employeeAvatar}>
                <Text style={styles.employeeAvatarText}>
                  {employee.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{employee.name}</Text>
                <Text style={styles.employeeMeta}>{employee.email}</Text>
                <Text style={styles.employeeMeta}>{employee.phone}</Text>

                <View style={styles.employeeRoleBadge}>
                  <Text style={styles.employeeRoleText}>
                    {employee.role}
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.deleteButtonPressed,
                ]}
                onPress={() => handleDeleteEmployee(employee)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.primaryButtonPressed,
        ]}
        onPress={openAddEmployeeModal}
      >
        <Text style={styles.primaryButtonText}>＋ Add employee</Text>
      </Pressable>
    </>
  );

  const renderOrdersTab = () => {
    const assignedOrdersByEmployee = employees.map(employee => ({
      employee,
      orders: adminOrders.filter(order => order.employeeId === employee.id),
    }));

    return (
      <>
        <View style={styles.adminHeader}>
          <View>
            <Text style={styles.greeting}>Operations</Text>
            <Text style={styles.adminName}>Orders & tasks</Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => void loadAdminWorkspace()}
            disabled={ordersLoading}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>All customer orders</Text>

        {ordersLoading ? (
          <ActivityIndicator color="#1976D2" style={styles.ordersLoader} />
        ) : adminOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No orders yet</Text>
            <Text style={styles.emptyStateText}>
              New customer orders will appear here.
            </Text>
          </View>
        ) : (
          adminOrders.map(order => (
            <View key={order.id} style={styles.adminOrderCard}>
              <View style={styles.adminOrderHeader}>
                <View style={styles.adminOrderInfo}>
                  <Text style={styles.adminOrderId}>{order.id}</Text>
                  <Text style={styles.adminOrderCustomer}>
                    {order.customerEmail}
                  </Text>
                </View>
                <Text style={styles.adminOrderStatus}>{order.status}</Text>
              </View>

              <Text style={styles.adminOrderService}>
                {order.serviceName} · {order.quantity} · K{order.total}
              </Text>
              <Text style={styles.adminOrderPickup}>
                {order.pickupMethod}: {order.pickupDate} at {order.pickupTime}
              </Text>
              {order.pickupAddress ? (
                <Text style={styles.adminOrderPickup}>
                  Address: {order.pickupAddress}
                </Text>
              ) : null}

              <Text style={styles.assignLabel}>
                {order.employeeName
                  ? `Assigned to ${order.employeeName}`
                  : 'Assign to an employee'}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.employeeChoices}
              >
                {employees.map(employee => (
                  <Pressable
                    key={employee.id}
                    style={[
                      styles.employeeChoice,
                      order.employeeId === employee.id &&
                        styles.employeeChoiceSelected,
                    ]}
                    onPress={() => void assignOrder(order, employee)}
                    disabled={assignmentLoading === order.id}
                  >
                    <Text
                      style={[
                        styles.employeeChoiceText,
                        order.employeeId === employee.id &&
                          styles.employeeChoiceTextSelected,
                      ]}
                    >
                      {employee.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Employee tasks</Text>
        {assignedOrdersByEmployee.map(({ employee, orders: employeeTasks }) => (
          <View key={employee.id} style={styles.taskGroupCard}>
            <View style={styles.taskGroupHeader}>
              <View>
                <Text style={styles.taskGroupName}>{employee.name}</Text>
                <Text style={styles.taskGroupRole}>{employee.role}</Text>
              </View>
              <Text style={styles.taskCount}>
                {employeeTasks.length}{' '}
                {employeeTasks.length === 1 ? 'task' : 'tasks'}
              </Text>
            </View>
            {employeeTasks.length === 0 ? (
              <Text style={styles.noTasksText}>No assigned tasks</Text>
            ) : (
              employeeTasks.map(task => (
                <View key={task.id} style={styles.taskRow}>
                  <Text style={styles.taskRowTitle}>{task.serviceName}</Text>
                  <Text style={styles.taskRowMeta}>
                    {task.id} · {task.pickupDate} at {task.pickupTime}
                  </Text>
                </View>
              ))
            )}
          </View>
        ))}
      </>
    );
  };

  // ---------------- ADMIN: PLACEHOLDER TABS ----------------

  const renderPlaceholderTab = (title: string, message: string) => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderIcon}>◌</Text>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>{message}</Text>
    </View>
  );

  // ---------------- ADMIN: SHELL + BOTTOM NAV ----------------

  const renderAdminHome = () => {
    const navItems: {
      key: AdminTab;
      icon: string;
      label: string;
    }[] = [
      { key: 'home', icon: '⌂', label: 'Home' },
      { key: 'orders', icon: '▣', label: 'Orders' },
      { key: 'customers', icon: '♙', label: 'Customers' },
      { key: 'employees', icon: '♙', label: 'Employees' },
      { key: 'settings', icon: '⚙', label: 'Settings' },
      { key: 'alerts', icon: '♢', label: 'Alerts' },
    ];

    return (
      <SafeAreaView style={styles.adminSafeArea}>
        <ScrollView
          style={styles.adminScroll}
          contentContainerStyle={styles.adminContent}
          showsVerticalScrollIndicator={false}
        >
          {adminTab === 'home' && renderHomeTab()}

          {adminTab === 'employees' && renderEmployeesTab()}

          {adminTab === 'orders' && renderOrdersTab()}

          {adminTab === 'customers' &&
            renderPlaceholderTab(
              'Customers',
              'The customers management screen will be added later.',
            )}

          {adminTab === 'settings' &&
            renderPlaceholderTab(
              'Settings',
              'Shop settings will be added later.',
            )}
        </ScrollView>

        <View style={styles.bottomNavigation}>
          {navItems.map(item => {
            const active = adminTab === item.key;
            return (
              <Pressable
                key={item.key}
                style={styles.navItem}
                onPress={() => {
                  if (item.key === 'alerts') {
                    router.push('/pages/adminAlerts' as never);
                    return;
                  }

                  setAdminTab(item.key);
                }}
              >
                <Text
                  style={active ? styles.navIconActive : styles.navIcon}
                >
                  {item.icon}
                </Text>
                <Text
                  style={active ? styles.navTextActive : styles.navText}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Add Employee Modal */}
        <Modal
          visible={showAddEmployee}
          animationType="slide"
          transparent
          onRequestClose={closeAddEmployeeModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add employee</Text>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={closeAddEmployeeModal}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={[
                    styles.input,
                    employeeErrors.name ? styles.inputError : undefined,
                  ]}
                  placeholder="e.g. Peter Zulu"
                  placeholderTextColor="#8A94A6"
                  value={newEmployeeName}
                  onChangeText={setNewEmployeeName}
                  autoCapitalize="words"
                />
                {employeeErrors.name ? (
                  <Text style={styles.errorText}>
                    {employeeErrors.name}
                  </Text>
                ) : null}

                <Text style={styles.label}>Email address</Text>
                <TextInput
                  style={[
                    styles.input,
                    employeeErrors.email ? styles.inputError : undefined,
                  ]}
                  placeholder="employee@superkleen.com"
                  placeholderTextColor="#8A94A6"
                  value={newEmployeeEmail}
                  onChangeText={value =>
                    setNewEmployeeEmail(
                      value.toLowerCase().replace(/\s/g, '').split('@')[0],
                    )
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.emailSuffix}>@superkleen.com</Text>
                {employeeErrors.email ? (
                  <Text style={styles.errorText}>
                    {employeeErrors.email}
                  </Text>
                ) : null}

                <Text style={styles.label}>Temporary password</Text>
                <TextInput
                  style={[
                    styles.input,
                    employeeErrors.password ? styles.inputError : undefined,
                  ]}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#8A94A6"
                  value={newEmployeePassword}
                  onChangeText={setNewEmployeePassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {employeeErrors.password ? (
                  <Text style={styles.errorText}>
                    {employeeErrors.password}
                  </Text>
                ) : null}

                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={[
                    styles.input,
                    employeeErrors.phone ? styles.inputError : undefined,
                  ]}
                  placeholder="+260 97 000 0000"
                  placeholderTextColor="#8A94A6"
                  value={newEmployeePhone}
                  onChangeText={setNewEmployeePhone}
                  keyboardType="phone-pad"
                />
                {employeeErrors.phone ? (
                  <Text style={styles.errorText}>
                    {employeeErrors.phone}
                  </Text>
                ) : null}

                

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    employeeLoading && styles.disabledButton,
                  ]}
                  onPress={handleAddEmployee}
                  disabled={employeeLoading}
                >
                  {employeeLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Save employee
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.cancelButton}
                  onPress={closeAddEmployeeModal}
                  disabled={employeeLoading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    );
  };

  if (page === 'adminHome') {
    return renderAdminHome();
  }

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
          {page === 'login' ? renderLoginPage() : renderSignupPage()}
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
  authContainer: {
    width: '100%',
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
  authTitle: {
    color: '#172B4D',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  authSubtitle: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
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
  emailSuffix: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 6,
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
    top: 43,
  },
  showButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
  },
  primaryButton: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  primaryButtonPressed: {
    backgroundColor: '#125AA0',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 26,
  },
  switchText: {
    color: '#6B7280',
    fontSize: 14,
  },
  switchLink: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
  },

  // ---- Admin shell ----
  adminSafeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  adminScroll: {
    flex: 1,
  },
  adminContent: {
    padding: 20,
    paddingBottom: 110,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  greeting: {
    color: '#6B7280',
    fontSize: 14,
  },
  adminName: {
    color: '#172B4D',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },

  // ---- Home tab ----
  shopStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9F8EF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#16803C',
    marginRight: 8,
  },
  shopStatusText: {
    color: '#16803C',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  manageText: {
    color: '#16803C',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#172B4D',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#172B4D',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statIcon: {
    color: '#1976D2',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  statValue: {
    color: '#172B4D',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
  },
  statChange: {
    color: '#16803C',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  statNeutral: {
    color: '#8A94A6',
    fontSize: 11,
    marginTop: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  actionCardPressed: {
    backgroundColor: '#EEF6FF',
  },
  actionIcon: {
    color: '#1976D2',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 10,
  },
  actionTitle: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: '800',
  },
  actionSubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  ordersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
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
    color: '#1976D2',
    fontSize: 20,
    fontWeight: '800',
  },
  orderDetails: {
    flex: 1,
  },
  orderId: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '800',
  },
  customerName: {
    color: '#4B5563',
    fontSize: 13,
    marginTop: 3,
  },
  serviceName: {
    color: '#8A94A6',
    fontSize: 12,
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '800',
  },
  orderStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  processingStatus: {
    color: '#1976D2',
  },
  readyStatus: {
    color: '#16803C',
  },
  pendingStatus: {
    color: '#B7791F',
  },
  deliveredStatus: {
    color: '#16803C',
  },

  // ---- Employees tab ----
  addEmployeeHeaderButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEmployeeHeaderButtonPressed: {
    backgroundColor: '#125AA0',
  },
  addEmployeeHeaderText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  employeeSummaryCard: {
    backgroundColor: '#E8F2FF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
  },
  employeeSummaryValue: {
    color: '#1976D2',
    fontSize: 30,
    fontWeight: '800',
  },
  employeeSummaryLabel: {
    color: '#125AA0',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  employeesList: {
    marginBottom: 4,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  employeeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  employeeAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: '800',
  },
  employeeMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  employeeRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E9F8EF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  employeeRoleText: {
    color: '#16803C',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FDECEA',
    marginLeft: 8,
  },
  deleteButtonPressed: {
    backgroundColor: '#F9D6D2',
  },
  deleteButtonText: {
    color: '#D93025',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7EEF5',
    marginBottom: 8,
  },
  emptyStateIcon: {
    fontSize: 36,
    color: '#8A94A6',
    marginBottom: 10,
  },
  emptyStateTitle: {
    color: '#172B4D',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyStateText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },

  // ---- Orders and tasks tab ----
  refreshButton: {
    backgroundColor: '#E8F2FF',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  refreshButtonText: {
    color: '#1976D2',
    fontSize: 13,
    fontWeight: '800',
  },
  ordersLoader: {
    marginVertical: 30,
  },
  adminOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  adminOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adminOrderInfo: {
    flex: 1,
  },
  adminOrderId: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: '800',
  },
  adminOrderCustomer: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 3,
  },
  adminOrderStatus: {
    color: '#B7791F',
    fontSize: 12,
    fontWeight: '800',
  },
  adminOrderService: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
  },
  adminOrderPickup: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 5,
  },
  assignLabel: {
    color: '#172B4D',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  employeeChoices: {
    gap: 8,
  },
  employeeChoice: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  employeeChoiceSelected: {
    backgroundColor: '#E8F2FF',
    borderColor: '#1976D2',
  },
  employeeChoiceText: {
    color: '#172B4D',
    fontSize: 12,
    fontWeight: '700',
  },
  employeeChoiceTextSelected: {
    color: '#1976D2',
  },
  taskGroupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E7EEF5',
  },
  taskGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskGroupName: {
    color: '#172B4D',
    fontSize: 15,
    fontWeight: '800',
  },
  taskGroupRole: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 3,
  },
  taskCount: {
    color: '#1976D2',
    fontSize: 13,
    fontWeight: '800',
  },
  noTasksText: {
    color: '#8A94A6',
    fontSize: 12,
  },
  taskRow: {
    borderTopWidth: 1,
    borderTopColor: '#EDF1F5',
    paddingTop: 10,
    marginTop: 8,
  },
  taskRowTitle: {
    color: '#172B4D',
    fontSize: 13,
    fontWeight: '700',
  },
  taskRowMeta: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 3,
  },

  // ---- Placeholder tabs ----
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  placeholderIcon: {
    fontSize: 40,
    color: '#8A94A6',
    marginBottom: 12,
  },
  placeholderTitle: {
    color: '#172B4D',
    fontSize: 20,
    fontWeight: '800',
  },
  placeholderText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 24,
  },

  // ---- Bottom navigation ----
  bottomNavigation: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E7EEF5',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    flex: 1,
  },
  navIcon: {
    color: '#8A94A6',
    fontSize: 20,
  },
  navIconActive: {
    color: '#1976D2',
    fontSize: 20,
  },
  navText: {
    color: '#8A94A6',
    fontSize: 10,
    marginTop: 4,
  },
  navTextActive: {
    color: '#1976D2',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  // ---- Add Employee modal ----
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 43, 77, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 26,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    color: '#172B4D',
    fontSize: 20,
    fontWeight: '800',
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: '#172B4D',
    fontSize: 16,
    fontWeight: '800',
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    marginBottom: 8,
  },
  roleChipSelected: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  roleChipText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  cancelButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
  },
});