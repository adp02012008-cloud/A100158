// src/components/LoginGate.jsx
import { useEffect, useState } from "react";
import { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { auth as firebaseAuth, googleProvider } from "../firebase";
import { STUDENT_URL } from "../utils/api";
import { getUserRole, normalizeEmail, findStudentByEmail } from "../utils/roles";
import { useAuth } from "../context/AuthContext";

export default function LoginGate({ children }) {
  const { auth, login } = useAuth();

  const [typedEmail, setTypedEmail]       = useState("");
  const [password, setPassword]           = useState("");
  const [keepLoggedIn, setKeepLoggedIn]   = useState(true);
  const [students, setStudents]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]                 = useState("");

  // Set persistence and check for redirect result on mount
  useEffect(() => {
    setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});

    getRedirectResult(firebaseAuth)
      .then((result) => {
        if (result && result.user) {
          const googleEmail = normalizeEmail(result.user.email || "");
          if (googleEmail) {
            const role = getUserRole(googleEmail, students);
            const ownedStudent = findStudentByEmail(googleEmail, students);
            const ownedEnrolment = ownedStudent?.["ENROLMENT NUMBER"] || null;
            if (role !== "public") {
              login(googleEmail, role, ownedEnrolment);
            }
          }
        }
      })
      .catch((err) => {
        if (err.code !== "auth/credential-already-in-use") {
          console.warn("Redirect sign-in error:", err.message);
        }
      });
  }, [students]);

  useEffect(() => {
    fetch(STUDENT_URL)
      .then((r) => r.json())
      .then((data) => setStudents(data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Public viewer sign-in ───────────────────────────────────
  const handlePublicLogin = () => {
    login("public@viewer.com", "public", null);
  };

  // ── Secure Sign-In for Admin & Members (Google OAuth + Roster Check) ──
  const handleAuthLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");
    if (googleLoading) return;

    const cleaned = normalizeEmail(typedEmail);

    try {
      setGoogleLoading(true);
      let result;
      try {
        result = await signInWithPopup(firebaseAuth, googleProvider);
      } catch (popupErr) {
        if (
          popupErr.code === "auth/popup-blocked" || 
          popupErr.code === "auth/operation-not-supported-in-this-environment"
        ) {
          // Fallback to redirect mode on mobile webviews/browsers that block popups
          await signInWithRedirect(firebaseAuth, googleProvider);
          return;
        }
        throw popupErr;
      }

      const googleEmail = normalizeEmail(result.user?.email || "");

      if (!googleEmail) {
        setError("Could not read your Google account email.");
        return;
      }

      // ── Verify email match if user typed an email address ──────
      if (cleaned && cleaned !== googleEmail) {
        setError(
          `Email mismatch: You entered "${cleaned}" but signed in with Google as "${googleEmail}". Please sign in with the matching Google account.`
        );
        return;
      }

      const role           = getUserRole(googleEmail, students);
      const ownedStudent   = findStudentByEmail(googleEmail, students);
      const ownedEnrolment = ownedStudent?.["ENROLMENT NUMBER"] || null;

      if (role === "public") {
        setError(
          `Access Denied: "${googleEmail}" is not registered as a team member or admin. Click "Continue as Public Viewer" below if you are a guest.`
        );
        return;
      }

      login(googleEmail, role, ownedEnrolment);
    } catch (err) {
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in popup was closed. Please try again.");
      } else if (err.code === "auth/cancelled-popup-request") {
        setError("Multiple sign-in attempts detected. Please try once.");
      } else {
        setError(`Sign-in failed: ${err.message}`);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="login-bg">
        <div className="login-loading">Loading portal…</div>
      </div>
    );
  }

  if (auth.isLoggedIn) return children;

  return (
    <div className="login-bg">
      <div className="login-container">
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">Please Enter your Account details</p>

        {error && <div className="login-error-banner">{error}</div>}

        <form onSubmit={handleAuthLogin}>
          <div className="login-form-group">
            <label className="login-form-label">Email</label>
            <input
              className="login-form-input"
              type="email"
              placeholder="Johndoe@gmail.com"
              value={typedEmail}
              onChange={(e) => {
                setTypedEmail(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="login-form-group">
            <label className="login-form-label">Password</label>
            <input
              className="login-form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="login-options-row">
            <label className="login-keep-me">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(e) => setKeepLoggedIn(e.target.checked)}
              />
              <span>Keep me logged in</span>
            </label>

            <button
              type="button"
              className="login-forgot-link"
              onClick={() => {
                if (typedEmail) {
                  setError("Password reset request sent to " + typedEmail);
                } else {
                  setError("Please enter your email address to reset password.");
                }
              }}
            >
              Forgot Password
            </button>
          </div>

          <button
            className="login-submit-btn"
            type="submit"
            disabled={googleLoading}
          >
            {googleLoading ? "Verifying…" : "Sign in"}
          </button>
        </form>

        <div className="login-social-container">
          <button
            type="button"
            className="google-circle-btn"
            onClick={handleAuthLogin}
            disabled={googleLoading}
            title="Sign in with Google"
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </button>

          <button
            type="button"
            className="public-viewer-link"
            onClick={handlePublicLogin}
          >
            👀 Continue as Public Viewer
          </button>
        </div>
      </div>
    </div>
  );
}