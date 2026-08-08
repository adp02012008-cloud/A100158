// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  const cleanupKey = "bugSlayersDevServiceWorkerCleaned";

  const cleanDevServiceWorkers = async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const controlledByServiceWorker = Boolean(navigator.serviceWorker.controller);

    const cacheKeys = "caches" in window ? await caches.keys() : [];
    const workboxCacheKeys = cacheKeys.filter(
      (key) => key.includes("workbox") || key.includes("precache")
    );

    await Promise.all([
      ...registrations.map((registration) => registration.unregister()),
      ...workboxCacheKeys.map((key) => caches.delete(key)),
    ]);

    if (
      (registrations.length > 0 ||
        workboxCacheKeys.length > 0 ||
        controlledByServiceWorker) &&
      sessionStorage.getItem(cleanupKey) !== "true"
    ) {
      sessionStorage.setItem(cleanupKey, "true");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(cleanupKey);
  };

  cleanDevServiceWorkers().catch(() => {});
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);


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
