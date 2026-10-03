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
        background: "rgba(15, 23, 42, 0.45)",
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
          background: "#ffffff",
          border: "1.5px solid #ede7dd",
          borderRadius: "16px",
          padding: "24px 26px",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 20px 50px -12px rgba(0, 0, 0, 0.15), 0 0 30px rgba(234, 88, 12, 0.08)",
          color: "#111827",
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
              background: "#fff7ed",
              border: "1px solid #fed7aa",
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
            <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#111827" }}>
              {title}
            </h3>
            <span style={{ fontSize: "12px", color: "#ea580c", fontWeight: "600" }}>
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
            color: "#4b5563",
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
              background: "#fbf9f5",
              border: "1.5px solid #ede7dd",
              color: "#4b5563",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#ede7dd";
              e.currentTarget.style.color = "#111827";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#fbf9f5";
              e.currentTarget.style.color = "#4b5563";
            }}
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
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#fee2e2")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#fef2f2")}
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
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                border: "none",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(234, 88, 12, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                if (!saving) e.currentTarget.style.filter = "brightness(1.05)";
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
