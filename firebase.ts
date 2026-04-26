
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, setLogLevel as setFirestoreLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const toBool = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
};

export const isFirebaseDisabled = () =>
  toBool(import.meta.env.VITE_DISABLE_FIREBASE as string | undefined, false);

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || "AIzaSyA1jRYePU98X-bbBxZUpoks5lV4lGPPE24",
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined) || "urbanprime-eb918.firebaseapp.com",
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined) || "urbanprime-eb918",
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined) || "urbanprime-eb918.appspot.com",
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined) || "616449055186",
  appId: (import.meta.env.VITE_FIREBASE_APP_ID as string | undefined) || "1:616449055186:web:a3aa281ee86011c314100b",
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string | undefined) || "G-M7WGG2TY12"
};

const isConfigValid = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
let app: ReturnType<typeof initializeApp> | null = null;
let analyticsInitializationPromise: Promise<void> | null = null;

if (!isFirebaseDisabled() && isConfigValid) {
  app = initializeApp(firebaseConfig);
  try {
    setFirestoreLogLevel('silent');
  } catch (error) {
    console.warn('Failed to configure Firestore log level:', error);
  }
} else {
  console.warn('Firebase disabled or not configured.');
}

export const initializeFirebaseAnalytics = async () => {
  if (!app || typeof window === 'undefined') return;
  if (analyticsInitializationPromise) return analyticsInitializationPromise;

  analyticsInitializationPromise = import('firebase/analytics')
    .then(({ getAnalytics }) => {
      getAnalytics(app!);
    })
    .catch((error) => {
      console.warn('Firebase analytics disabled:', error);
    });

  return analyticsInitializationPromise;
};

// Export services
export const auth = app ? getAuth(app) : ({ currentUser: null } as any);
export const db = app ? getFirestore(app) : (null as any);
export const storage = app ? getStorage(app) : (null as any);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
