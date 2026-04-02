import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD6fCguQf1PfW6n0hXwffslYoKqW7etLH0",
  authDomain: "iron-log-b7f71.firebaseapp.com",
  projectId: "iron-log-b7f71",
  storageBucket: "iron-log-b7f71.firebasestorage.app",
  messagingSenderId: "327011491449",
  appId: "1:327011491449:web:e3a157846fd2c855a73ea8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
