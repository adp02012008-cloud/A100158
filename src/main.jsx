// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { initChunkRecovery } from "./utils/chunkRecovery.js";
import "./index.css";

// Activate automatic stale chunk recovery immediately
initChunkRecovery();

// Clean up any lingering service workers or stale workbox caches safely
if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

if (typeof window !== "undefined" && "caches" in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name.includes("workbox") || name.includes("precache") || name.includes("bug-slayers")) {
        caches.delete(name).catch(() => {});
      }
    });
  }).catch(() => {});
}

if (!window.location.pathname.startsWith("/__/")) {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}


// // Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyA-IZJElov16omfcApWpfWEVNA-F8ILX78",
//   authDomain: "a100158.firebaseapp.com",
//   projectId: "a100158",
//   storageBucket: "a100158.firebasestorage.app",
//   messagingSenderId: "749340432600",
//   appId: "1:749340432600:web:a4d32833a0c79142915fad",
//   measurementId: "G-BDHHSF3M43"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
