// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

const DEFAULT_AUTH = {
  isLoggedIn: false,
  email: "",
  role: "public",        // "admin" | "student" | "public"
  viewMode: "admin",     // "admin" | "student" — only relevant for admins
  ownedEnrolment: null,  // enrolment number of the logged-in student
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

  const logout = () => {
    setAuth(DEFAULT_AUTH);
    localStorage.removeItem("bugSlayersAuth");
  };

  // Toggle admin's view between "admin" and "student"
  const toggleViewMode = () => {
    if (auth.role !== "admin") return;
    setAuth((prev) => ({
      ...prev,
      viewMode: prev.viewMode === "admin" ? "student" : "admin",
    }));
  };

  // Effective role taking view-mode into account
  const effectiveRole =
    auth.role === "admin" && auth.viewMode === "student" ? "student" : auth.role;

  return (
    <AuthContext.Provider value={{ auth, effectiveRole, login, logout, toggleViewMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
