/* eslint-disable react-refresh/only-export-components */
// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth as firebaseAuth } from "../firebase";

const AuthContext = createContext();

const DEFAULT_AUTH = {
  isLoggedIn: false,
  email: "",
  role: "public",
  viewMode: "admin",
  ownedEnrolment: null,
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem("bugSlayersAuth");
      return saved ? JSON.parse(saved) : DEFAULT_AUTH;
    } catch {
      return DEFAULT_AUTH;
    }
  });

  useEffect(() => {
    localStorage.setItem("bugSlayersAuth", JSON.stringify(auth));
  }, [auth]);

  const login = (email, role, ownedEnrolment = null) => {
    setAuth({
      isLoggedIn: true,
      email,
      role,
      viewMode: role === "admin" ? "admin" : role,
      ownedEnrolment,
    });
  };

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      console.warn("Firebase logout warning:", error.message);
    } finally {
      setAuth(DEFAULT_AUTH);
      localStorage.removeItem("bugSlayersAuth");
    }
  };

  const toggleViewMode = () => {
    if (auth.role !== "admin") return;
    setAuth((previous) => ({
      ...previous,
      viewMode: previous.viewMode === "admin" ? "student" : "admin",
    }));
  };

  const effectiveRole =
    auth.role === "admin" && auth.viewMode === "student" ? "student" : auth.role;

  const isTeamMember = auth.role === "student" || auth.role === "admin";
  const isAdmin = auth.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        auth,
        effectiveRole,
        isTeamMember,
        isAdmin,
        login,
        logout,
        toggleViewMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
