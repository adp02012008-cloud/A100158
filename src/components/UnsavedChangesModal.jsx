// src/components/UnsavedChangesModal.jsx - Professional Confirmation Dialog for Unsaved Changes
import React from "react";

export default function UnsavedChangesModal({
  isOpen,
  title = "Unsaved Changes",
  message = "You have unsaved changes in this form. Do you want to save them before leaving?",
  onKeepEditing,
  onDiscard,
  onSave,
  saving = false,
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(3, 1, 10, 0.82)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: "16px",
        boxSizing: "border-box",
        animation: "fadeIn 0.2s ease",
      }}
      onClick={(e) => {
        e.stopPropagation();
        onKeepEditing();
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg, rgba(22, 14, 45, 0.98), rgba(12, 7, 28, 0.99))",
          border: "1px solid rgba(245, 158, 11, 0.35)",
          borderRadius: "16px",
          padding: "24px 26px",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(245, 158, 11, 0.15)",
          color: "#f8fafc",
          fontFamily: "inherit",
          animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Warning Shield Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#fef3c7" }}>
              {title}
            </h3>
            <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "500" }}>
              Action Required
            </span>
          </div>
        </div>

        {/* Message */}
        <p
          style={{
            margin: "0 0 22px 0",
            fontSize: "14px",
            lineHeight: "1.55",
            color: "#cbd5e1",
          }}
        >
          {message}
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            disabled={saving}
            onClick={onKeepEditing}
            style={{
              padding: "9px 15px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              color: "#e2e8f0",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)")}
          >
            Keep Editing
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={onDiscard}
            style={{
              padding: "9px 15px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#f87171",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)")}
          >
            Discard Changes
          </button>

          {onSave && (
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              style={{
                padding: "9px 18px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(139, 92, 246, 0.35)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                if (!saving) e.currentTarget.style.filter = "brightness(1.1)";
              }}
              onMouseOut={(e) => (e.currentTarget.style.filter = "none")}
            >
              {saving ? "Saving…" : "Save & Close"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
