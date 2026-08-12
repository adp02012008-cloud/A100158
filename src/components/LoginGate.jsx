import { useCallback, useEffect, useState } from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth as firebaseAuth, googleProvider } from "../firebase";
import { fetchSheetData } from "../utils/api";
import { getUserRole, normalizeEmail, findStudentByEmail } from "../utils/roles";
import { useAuth } from "../context/AuthContext";

function getAuthErrorMessage(error, fallback = "Authentication failed. Please try again.") {
  const code = error?.code || "";

  if (
    code === "auth/invalid-credential" ||
    code === "auth/user-not-found" ||
    code === "auth/wrong-password"
  ) {
    return "Invalid email or password. Please check your credentials.";
  }

  if (code === "auth/invalid-email") {
    return "Please enter a valid email address.";
  }

  if (code === "auth/operation-not-allowed") {
    return "This sign-in method is disabled in your Firebase Console. Please enable Email/Password or Google sign-in under Authentication > Sign-in method.";
  }

  if (code === "auth/popup-closed-by-user") {
    return "Sign-in popup was closed before completing. Please try again.";
  }

  if (code === "auth/popup-blocked") {
    return "Sign-in popup was blocked by your browser. Please allow popups for this site.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many failed attempts. Please wait a few minutes and try again.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }

  if (code === "auth/unauthorized-domain") {
    return "This domain is not authorized for Firebase sign-in. Open http://localhost:5173 or add this domain in Firebase Authentication settings.";
  }

  return error?.message || fallback;
}

export default function LoginGate({ children }) {
  const { auth, login } = useAuth();

  const [typedEmail, setTypedEmail]       = useState("");
  const [password, setPassword]           = useState("");
  const [keepLoggedIn, setKeepLoggedIn]   = useState(true);
  const [students, setStudents]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authLoading, setAuthLoading]     = useState(false);
  const [error, setError]                 = useState("");

  const clearFirebaseSession = useCallback(async () => {
    const tasks = [firebaseSignOut(firebaseAuth).catch(() => {})];

    if (Capacitor.isNativePlatform()) {
      tasks.push(FirebaseAuthentication.signOut().catch(() => {}));
    }

    await Promise.all(tasks);
  }, []);

  const applyWebPersistence = useCallback(async () => {
    await setPersistence(
      firebaseAuth,
      keepLoggedIn ? browserLocalPersistence : browserSessionPersistence
    );
  }, [keepLoggedIn]);

  const completeRegisteredLogin = useCallback(
    async (email, { silentAccessDenied = false } = {}) => {
      const cleaned = normalizeEmail(email);

      if (!cleaned) {
        if (!silentAccessDenied) setError("Could not read your account email.");
        return false;
      }

      let currentRoster = students;
      let role = getUserRole(cleaned, currentRoster);

      if (role === "public") {
        try {
          const freshData = await fetchSheetData("Sheet1");
          if (Array.isArray(freshData) && freshData.length > 0) {
            currentRoster = freshData;
            setStudents(freshData);
            role = getUserRole(cleaned, freshData);
          }
        } catch {
          // Ignore fetch error
        }
      }

      const ownedStudent = findStudentByEmail(cleaned, currentRoster);
      const ownedEnrolment = ownedStudent?.["ENROLMENT NUMBER"] || null;

      if (role === "public") {
        await clearFirebaseSession();
        if (!silentAccessDenied) {
          setError(
            `Access Denied: "${cleaned}" is not registered as a team member or admin. Click "Continue as Public Viewer" below if you are a guest.`
          );
        }
        return false;
      }

      login(cleaned, role, ownedEnrolment);
      return true;
    },
    [clearFirebaseSession, login, students]
  );

  useEffect(() => {
    let cancelled = false;

    fetchSheetData("Sheet1")
      .then((data) => {
        if (!cancelled) setStudents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStudents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return undefined;

    if (auth.isLoggedIn && auth.role !== "public") {
      setCheckingSession(false);
      return undefined;
    }

    let cancelled = false;
    setCheckingSession(true);

    const finishSessionCheck = async (email) => {
      if (cancelled) return;

      const cleaned = normalizeEmail(email);
      if (cleaned) {
        await completeRegisteredLogin(cleaned, { silentAccessDenied: true });
      }

      if (!cancelled) setCheckingSession(false);
    };

    const getWebFirebaseEmail = async () => {
      try {
        const redirectResult = await getRedirectResult(firebaseAuth);
        if (redirectResult?.user?.email) {
          return redirectResult.user.email;
        }
      } catch (redirectError) {
        console.error("Firebase redirect result error:", redirectError);
      }

      return new Promise((resolve) => {
        let unsubscribe = () => {};
        unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
          unsubscribe();
          resolve(user?.email || "");
        });
      });
    };

    const getCurrentSessionEmail = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await FirebaseAuthentication.getCurrentUser();
          const nativeEmail = normalizeEmail(result.user?.email || "");
          if (nativeEmail) return nativeEmail;
        } catch {
          // Fall back to the Firebase JS SDK session below.
        }
      }

      return getWebFirebaseEmail();
    };

    getCurrentSessionEmail()
      .then(finishSessionCheck)
      .catch(() => finishSessionCheck(""));

    return () => {
      cancelled = true;
    };
  }, [auth.isLoggedIn, auth.role, completeRegisteredLogin, loading]);

  const handlePublicLogin = async () => {
    setError("");
    await clearFirebaseSession();
    login("public@viewer.com", "public", null);
  };

  const handleEmailPasswordLogin = async (event) => {
    if (event) event.preventDefault();
    setError("");

    const cleaned = normalizeEmail(typedEmail);
    if (!cleaned) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setAuthLoading(true);
      await applyWebPersistence();

      let signedInEmail = cleaned;

      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        cleaned,
        password
      );
      signedInEmail = normalizeEmail(credential.user?.email || cleaned);

      await completeRegisteredLogin(signedInEmail);
    } catch (authError) {
      console.error("Firebase auth error:", authError?.code, authError);
      await clearFirebaseSession();
      setError(getAuthErrorMessage(authError, "Sign-in failed. Please try again."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    if (authLoading) return;

    try {
      setAuthLoading(true);
      await applyWebPersistence();

      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const googleEmail = normalizeEmail(result.user?.email || "");
        if (!googleEmail) {
          await clearFirebaseSession();
          setError("Could not read your Google account email.");
          return;
        }
        await completeRegisteredLogin(googleEmail);
      } else {
        try {
          const result = await signInWithPopup(firebaseAuth, googleProvider);
          const googleEmail = normalizeEmail(result.user?.email || "");
          if (!googleEmail) {
            await clearFirebaseSession();
            setError("Could not read your Google account email.");
            return;
          }
          await completeRegisteredLogin(googleEmail);
        } catch (popupErr) {
          if (
            popupErr?.code === "auth/popup-blocked" ||
            popupErr?.code === "auth/popup-closed-by-user"
          ) {
            await signInWithRedirect(firebaseAuth, googleProvider);
          } else {
            throw popupErr;
          }
        }
      }
    } catch (authError) {
      await clearFirebaseSession();
      setError(getAuthErrorMessage(authError, "Google sign-in failed. Please try again."));
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");

    const cleaned = normalizeEmail(typedEmail);
    if (!cleaned) {
      setError("Please enter your email address to reset password.");
      return;
    }

    try {
      setAuthLoading(true);
      await sendPasswordResetEmail(firebaseAuth, cleaned);

      setError(`Password reset email sent to ${cleaned}.`);
    } catch (authError) {
      setError(getAuthErrorMessage(authError, "Could not send password reset email."));
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading || checkingSession) {
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

        <form onSubmit={handleEmailPasswordLogin}>
          <div className="login-form-group">
            <label className="login-form-label">Email</label>
            <input
              className="login-form-input"
              type="email"
              placeholder="Johndoe@gmail.com"
              value={typedEmail}
              onChange={(event) => {
                setTypedEmail(event.target.value);
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
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="login-options-row">
            <label className="login-keep-me">
              <input
                type="checkbox"
                checked={keepLoggedIn}
                onChange={(event) => setKeepLoggedIn(event.target.checked)}
              />
              <span>Keep me logged in</span>
            </label>

            <button
              type="button"
              className="login-forgot-link"
              disabled={authLoading}
              onClick={handlePasswordReset}
            >
              Forgot Password
            </button>
          </div>

          <button
            className="login-submit-btn"
            type="submit"
            disabled={authLoading}
          >
            {authLoading ? "Verifying…" : "Sign in"}
          </button>
        </form>

        <div className="login-social-container">
          <button
            type="button"
            className="google-circle-btn"
            onClick={handleGoogleLogin}
            disabled={authLoading}
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
            disabled={authLoading}
          >
            👀 Continue as Public Viewer
          </button>
        </div>
      </div>

      <footer className="login-footer-dock">
        <div className="login-footer-card-ref">
          {/* Top 3-Column Grid Area */}
          <div className="login-footer-grid">
            {/* Column 1: Brand & Connect */}
            <div className="footer-col-left">
              <div className="footer-brand-row">
                <span className="login-footer-badge">A#100158</span>
                <span className="login-footer-crafted">
                  Crafted &amp; Developed by <strong className="crafted-name">Dhashaprakash A</strong>
                </span>
              </div>
              <div className="footer-connect-row">
                <span className="connect-label">CONNECT</span>
                <div className="connect-pills">
                  <a
                    href="https://www.linkedin.com/in/dhashaprakash-a-245812380"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-pill-btn"
                    title="LinkedIn Profile"
                  >
                    <svg className="pill-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.66a1.4 1.4 0 1 0 1.4 1.4c0-.77-.63-1.4-1.4-1.4z" />
                    </svg>
                    <span>LinkedIn</span>
                  </a>
                  <a
                    href="https://github.com/adp02012008-cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-pill-btn"
                    title="GitHub Profile"
                  >
                    <svg className="pill-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                    <span>GitHub</span>
                  </a>
                  <a
                    href="tel:6380341239"
                    className="footer-pill-btn"
                    title="Call Dhashaprakash A"
                  >
                    <svg className="pill-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                    </svg>
                    <span>6380341239</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Vertical Divider Line 1 */}
            <div className="footer-vert-divider"></div>

            {/* Column 2: Feedback Box */}
            <div className="footer-col-center">
              <div className="feedback-inner-card">
                <span className="feedback-bulb">💡</span>
                <div className="feedback-text-block">
                  <div className="feedback-headline">Have a query? Found a bug? Have a suggestion?</div>
                  <div className="feedback-subline">
                    Let me know — your feedback helps improve <strong className="purple-txt">A#100158</strong>.
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Divider Line 2 */}
            <div className="footer-vert-divider"></div>

            {/* Column 3: Copyright Box */}
            <div className="footer-col-right">
              <div className="copyright-title">
                © 2026 <strong className="purple-txt">A#100158</strong>
              </div>
              <div className="copyright-sub">All Rights Reserved.</div>
            </div>
          </div>

          {/* Full-width Horizontal Divider Line */}
          <div className="footer-horiz-divider"></div>

          {/* Bottom Policy / Contact Links */}
          <div className="footer-bottom-links">
            <a href="#" onClick={(e) => e.preventDefault()} className="bottom-link">Privacy Policy</a>
            <span className="link-dot">·</span>
            <a href="#" onClick={(e) => e.preventDefault()} className="bottom-link">Terms of Service</a>
            <span className="link-dot">·</span>
            <a href="tel:6380341239" className="bottom-link">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
