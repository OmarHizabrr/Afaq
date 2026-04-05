import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Afaq Foundation Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBG8_7vI_tKujbJ_tpcaPL6NGNwCygC4hU",
  authDomain: "afaq-foundation.firebaseapp.com",
  projectId: "afaq-foundation",
  storageBucket: "afaq-foundation.firebasestorage.app",
  messagingSenderId: "790510406588",
  appId: "1:790510406588:web:95b0b3aacf224913d6b9b9",
  measurementId: "G-9EPNBT3VZ6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

export { app, analytics, auth, googleProvider, db };
