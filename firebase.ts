
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1jRYePU98X-bbBxZUpoks5lV4lGPPE24",
  authDomain: "urbanprime-eb918.firebaseapp.com",
  projectId: "urbanprime-eb918",
  storageBucket: "urbanprime-eb918.appspot.com",
  messagingSenderId: "616449055186",
  appId: "1:616449055186:web:a3aa281ee86011c314100b",
  measurementId: "G-M7WGG2TY12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Analytics can fail in dev/offline; guard to prevent startup crash.
try {
  if (typeof window !== 'undefined') {
    getAnalytics(app);
  }
} catch (error) {
  console.warn('Firebase analytics disabled:', error);
}

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
