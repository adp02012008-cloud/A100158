// src/components/LoginGate.jsx
import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth as firebaseAuth, googleProvider } from "../firebase";
import { STUDENT_URL } from "../utils/api";
import { getUserRole, normalizeEmail, findStudentByEmail } from "../utils/roles";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function LoginGate({ children }) {
  const { auth, login } = useAuth();

  const [typedEmail, setTypedEmail]     = useState("");
  const [students, setStudents]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]               = useState("");

  useEffect(() => {
    fetch(STUDENT_URL)
      .then((r) => r.json())
      .then((data) => setStudents(data || []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Public viewer — no verification needed ──────────────────
  const handlePublicLogin = () => {
    login("public@viewer.com", "public", null);
  };

  // ── Google Sign-In — email field is now optional ────────────
  const handleGoogleLogin = async () => {
    setError("");
    if (googleLoading) return;

    const cleaned = normalizeEmail(typedEmail);

    try {
      setGoogleLoading(true);
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const googleEmail = normalizeEmail(result.user?.email || "");

      if (!googleEmail) {
        setError("Could not read your Google account email.");
        return;
      }

      // ── If user typed an email, it must match the Google email ──
      if (cleaned && cleaned !== googleEmail) {
        setError(
          `Email mismatch. You typed "${cleaned}" but signed in as "${googleEmail}". Please use the same email or leave the field empty.`
        );
        return;
      }

      // Use googleEmail for role detection (typed email is optional)
      const role           = getUserRole(googleEmail, students);
      const ownedStudent   = findStudentByEmail(googleEmail, students);
      const ownedEnrolment = ownedStudent?.["ENROLMENT NUMBER"] || null;

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
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Bug Slayers Logo" className="login-logo" />
          <h2>PCDP Portal</h2>
        </div>

        <h3 className="welcome">Hi, Welcome Back!</h3>

        {error && <div className="login-error">{error}</div>}

        <label>Your Email <span className="optional-label">(optional)</span></label>
        <input
          type="email"
          placeholder="Enter your registered email (optional)"
          value={typedEmail}
          onChange={(e) => { setTypedEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleGoogleLogin()}
        />

        <p className="login-hint">
          You can sign in directly with Google — your role will be detected automatically. Typing your email first is optional but adds an extra verification step.
        </p>

        <button
          className="google-btn"
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
          />
          {googleLoading ? "Verifying…" : "Sign in with Google"}
        </button>

        <div className="or">or</div>

        <button className="public-btn" type="button" onClick={handlePublicLogin}>
          👀 Continue as Public Viewer
        </button>
      </div>
    </div>
  );
}