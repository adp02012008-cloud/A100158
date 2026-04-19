// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import { getAnalytics } from "firebase/analytics";


// Replace these with your actual Firebase project values
const firebaseConfig = {
  apiKey: "AIzaSyA-IZJElov16omfcApWpfWEVNA-F8ILX78",
  authDomain: "a100158.firebaseapp.com",
  projectId: "a100158",
  storageBucket: "a100158.firebasestorage.app",
  messagingSenderId: "749340432600",
  appId: "1:749340432600:web:a4d32833a0c79142915fad",
  measurementId: "G-BDHHSF3M43"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// const analytics = getAnalytics(app);
