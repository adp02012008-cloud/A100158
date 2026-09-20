import { useState, useEffect } from "react";

const DISMISS_KEY = "bugslayers_pwa_dismissed";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // If running in standalone mode (already installed as PWA), do nothing
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone || isDismissed) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Store event without preventing default so native banner is allowed and no console warning is triggered
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setDeferredPrompt(null);
        try {
          localStorage.setItem(DISMISS_KEY, "true");
        } catch {}
      }
    } catch {
      // User cancelled or prompt error
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {}
  };

  if (!deferredPrompt || isDismissed) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <div style={styles.textContainer}>
        <span style={styles.icon}>📱</span>
        <div>
          <strong style={styles.title}>Install Bug Slayers App</strong>
          <div style={styles.subtitle}>Get faster access & quick launcher on your device</div>
        </div>
      </div>
      <div style={styles.btnGroup}>
        <button onClick={handleInstallClick} style={styles.installBtn}>
          Install App
        </button>
        <button onClick={handleDismiss} style={styles.closeBtn} title="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: "fixed",
    bottom: "calc(20px + env(safe-area-inset-bottom, 16px))",
    right: "20px",
    left: "20px",
    maxWidth: "480px",
    margin: "0 auto",
    zIndex: 9999,
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "12px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
    color: "#f0f6fc",
    fontFamily: "Inter, sans-serif"
  },
  textContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  icon: {
    fontSize: "24px"
  },
  title: {
    fontSize: "14px",
    fontWeight: "600",
    display: "block"
  },
  subtitle: {
    fontSize: "12px",
    color: "#8b949e",
    marginTop: "2px"
  },
  btnGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  installBtn: {
    backgroundColor: "#007aff",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#8b949e",
    fontSize: "16px",
    cursor: "pointer",
    padding: "4px"
  }
};
