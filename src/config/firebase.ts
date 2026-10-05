import { initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "laundryapp-99ae2.firebaseapp.com",
  projectId: "laundryapp-99ae2",
  storageBucket: "laundryapp-99ae2.firebasestorage.app",
  messagingSenderId: "371180427963",
  appId: "1:371180427963:web:76ec3bfa4a6736479f679e",
  measurementId: "G-W5RCXRS5G8"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
const employeeApp = initializeApp(firebaseConfig, 'employee');
export const auth = getAuth(app);
export const employeeAuth = initializeAuth(employeeApp, {
  persistence: inMemoryPersistence,
});