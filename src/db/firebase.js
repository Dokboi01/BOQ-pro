import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAuTB4STtOhff4ZZrjTy_iw-Z19Ij_hrLg",
    authDomain: "boq-pro-72332.firebaseapp.com",
    projectId: "boq-pro-72332",
    storageBucket: "boq-pro-72332.firebasestorage.app",
    messagingSenderId: "609638637070",
    appId: "1:609638637070:web:2a1c25fcc2862a3df9665f",
    measurementId: "G-H5W3B28SEM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore instead of getFirestore for advanced configuration
// experimentalAutoDetectLongPolling: true helps with stable connections in restrictive networks
export const db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
});

export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
