/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth as firebaseAuth } from "../firebase";
import { clearUserCache } from "../utils/taskStorage";
import { fetchMyProfile } from "../utils/api";

const AuthContext = createContext();

const DEFAULT_AUTH = {
  isLoggedIn: false,
  email: "",
  role: "public",
  viewMode: "public",
  ownedEnrolment: null,
};

function loadSavedPublicAuth() {
  try {
    const saved = JSON.parse(localStorage.getItem("bugSlayersAuth") || "null");
    if (saved?.isLoggedIn && saved.role === "public") {
      return {
        ...DEFAULT_AUTH,
        isLoggedIn: true,
        email: saved.email || "public@viewer.com",
        role: "public",
        viewMode: "public",
      };
    }
  } catch {
    // Ignore corrupted storage and start signed out.
  }

  return DEFAULT_AUTH;
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadSavedPublicAuth);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (auth.isLoggedIn && auth.role !== "public") {
      fetchMyProfile()
        .then((res) => {
          if (res?.user) {
            setCurrentUser(res.user);
            const serverRole = String(res.user.role || "").toUpperCase() === "ADMIN" ? "admin" : "student";
            setAuth((prev) => {
              if (
                prev.role === serverRole &&
                prev.viewMode === (serverRole === "admin" ? (prev.viewMode || "admin") : serverRole)
              ) {
                return prev;
              }
              return {
                ...prev,
                role: serverRole,
                viewMode: serverRole === "admin" ? (prev.viewMode || "admin") : serverRole,
              };
            });
          }
        })
        .catch(() => setCurrentUser(null));
    } else {
      setCurrentUser(null);
    }
  }, [auth.isLoggedIn, auth.email]);

  useEffect(() => {
    if (auth.isLoggedIn && auth.role === "public") {
      localStorage.setItem("bugSlayersAuth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("bugSlayersAuth");
    }
  }, [auth]);

  // Subscribe to Firebase Auth state changes to wipe private local cache on account switch
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      if (!user) {
        clearUserCache();
      } else {
        // If logged-in user email changed, clear cache to prevent cross-user leakage
        const cleanCurrent = (user.email || "").trim().toLowerCase();
        const cleanAuth = (auth.email || "").trim().toLowerCase();
        if (cleanAuth && cleanCurrent !== cleanAuth) {
          clearUserCache();
        }
      }
    });

    return () => unsubscribe();
  }, [auth.email]);

  const login = useCallback((email, role, ownedEnrolment = null) => {
    setAuth({
      isLoggedIn: true,
      email,
      role,
      viewMode: role === "admin" ? "admin" : role,
      ownedEnrolment,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      clearUserCache();
      const signOutTasks = [signOut(firebaseAuth)];
      if (Capacitor.isNativePlatform()) {
        signOutTasks.push(FirebaseAuthentication.signOut());
      }

      const results = await Promise.allSettled(signOutTasks);
      results.forEach((result) => {
        if (result.status === "rejected") {
          console.warn("Firebase logout warning:", result.reason?.message || result.reason);
        }
      });
    } catch (error) {
      console.warn("Firebase logout warning:", error.message);
    } finally {
      clearUserCache();
      setAuth(DEFAULT_AUTH);
      setCurrentUser(null);
      localStorage.removeItem("bugSlayersAuth");
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setAuth((previous) => {
      if (previous.role !== "admin") return previous;
      return {
        ...previous,
        viewMode: previous.viewMode === "admin" ? "student" : "admin",
      };
    });
  }, []);

  const effectiveRole =
    auth.role === "admin" && auth.viewMode === "student" ? "student" : auth.role;

  const isTeamMember = auth.role === "student" || auth.role === "admin";
  const isAdmin = auth.role === "admin";

  const value = useMemo(
    () => ({
      auth,
      currentUser,
      effectiveRole,
      isTeamMember,
      isAdmin,
      login,
      logout,
      toggleViewMode,
    }),
    [auth, currentUser, effectiveRole, isTeamMember, isAdmin, login, logout, toggleViewMode]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
