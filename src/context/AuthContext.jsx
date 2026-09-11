// src/context/AuthContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { signOut } from "firebase/auth";
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

function loadInTabSessionAuth() {
  try {
    const isTabActive = sessionStorage.getItem("bugslayers_tab_active") === "true";
    if (isTabActive) {
      const saved = JSON.parse(sessionStorage.getItem("bugSlayersAuth") || "null");
      if (saved?.isLoggedIn && saved.role === "public") {
        return {
          ...DEFAULT_AUTH,
          isLoggedIn: true,
          email: saved.email || "public@viewer.com",
          role: "public",
          viewMode: "public",
        };
      }
    }
  } catch {
    // Ignore corrupted storage and start signed out.
  }

  return DEFAULT_AUTH;
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadInTabSessionAuth);
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
  }, [auth.isLoggedIn, auth.email, auth.role]);

  useEffect(() => {
    // Always clear legacy persistent localStorage remember-me items
    try {
      localStorage.removeItem("bugSlayersAuth");
    } catch {
      // Ignore
    }

    if (auth.isLoggedIn && auth.role === "public") {
      sessionStorage.setItem("bugSlayersAuth", JSON.stringify(auth));
    } else {
      sessionStorage.removeItem("bugSlayersAuth");
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
    sessionStorage.setItem("bugslayers_tab_active", "true");
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
      sessionStorage.removeItem("bugslayers_tab_active");
      sessionStorage.removeItem("bugSlayersAuth");
      await signOut(firebaseAuth);
    } catch (error) {
      console.warn("Firebase logout warning:", error.message);
    } finally {
      clearUserCache();
      sessionStorage.removeItem("bugslayers_tab_active");
      sessionStorage.removeItem("bugSlayersAuth");
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
