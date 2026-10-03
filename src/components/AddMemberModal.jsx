import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { formatDateForInput } from "../utils/dateUtils";
import UnsavedChangesModal from "./UnsavedChangesModal";

export default function AddMemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    enrolmentNumber: "",
    position: "Member",
    clusterName: "Core",
    joinedDate: formatDateForInput(new Date()),
    role: "MEMBER",
  });
  const [existingClusters, setExistingClusters] = useState(["Core", "Computer Cluster"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const isDirty = Boolean(form.name.trim() || form.email.trim() || form.enrolmentNumber.trim());

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      apiFetch("/clusters"),
      apiFetch("/users/dashboard"),
    ]).then(([clustersRes, dashRes]) => {
      if (!isMounted) return;

      const clusterSet = new Set(["Core", "Computer Cluster"]);

      if (clustersRes.status === "fulfilled" && Array.isArray(clustersRes.value?.clusters)) {
        clustersRes.value.clusters.forEach((c) => {
          if (c?.name) clusterSet.add(c.name.trim());
        });
      }

      if (dashRes.status === "fulfilled" && Array.isArray(dashRes.value?.users)) {
        dashRes.value.users.forEach((u) => {
          const cName = u.CLUSTER || u.clusterName;
          if (cName) clusterSet.add(cName.trim());
        });
      }

      const sortedList = Array.from(clusterSet).filter(Boolean).sort();
      setExistingClusters(sortedList);
      if (sortedList.length > 0 && !sortedList.includes(form.clusterName)) {
        setForm((prev) => ({ ...prev, clusterName: sortedList[0] }));
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      setError("Name and Email are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    background: "#ffffff",
    border: "1.5px solid #ede7dd",
    borderRadius: "8px",
    color: "#111827",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "4px",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px",
      }}
      onClick={handleRequestClose}
    >
      <div
        className="add-member-modal-box"
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#ffffff",
          border: "1.5px solid #ede7dd",
          borderRadius: "16px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.12)",
          padding: "28px",
          position: "relative",
          color: "#111827",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleRequestClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: "18px",
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", color: "#111827", fontWeight: "700" }}>
          ➕ Add New Member
        </h3>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-member-form-grid">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Full Name *</label>
            <input
              style={inputStyle}
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Email Address *</label>
            <input
              style={inputStyle}
              type="email"
              required
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="e.g. john.cs25@bitsathy.ac.in"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Enrolment Number</label>
            <input
              style={inputStyle}
              value={form.enrolmentNumber}
              onChange={(e) => handleChange("enrolmentNumber", e.target.value)}
              placeholder="e.g. 7376231CS199"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Joined Date</label>
            <input
              style={inputStyle}
              type="date"
              value={formatDateForInput(form.joinedDate)}
              onChange={(e) => handleChange("joinedDate", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Cluster Assignment</label>
            <select
              style={{
                ...inputStyle,
                background: "#ffffff",
                color: "#111827",
                cursor: "pointer",
              }}
              value={form.clusterName}
              onChange={(e) => handleChange("clusterName", e.target.value)}
            >
              {existingClusters.map((cName) => (
                <option key={cName} value={cName} style={{ background: "#ffffff", color: "#111827" }}>
                  {cName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <label style={labelStyle}>Position (e.g. Member 1, Team Lead)</label>
            <input
              style={inputStyle}
              value={form.position}
              onChange={(e) => handleChange("position", e.target.value)}
              placeholder="e.g. Member 1, Team Lead"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Platform Role</label>
            <select
              style={inputStyle}
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              <option value="MEMBER">🎓 Team Member</option>
              <option value="ADMIN">👑 System Admin</option>
            </select>
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              marginTop: "12px",
              paddingTop: "16px",
              borderTop: "1px solid #ede7dd",
            }}
          >
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={saving}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                background: "#fbf9f5",
                color: "#4b5563",
                border: "1.5px solid #ede7dd",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                color: "#ffffff",
                border: "none",
                fontSize: "14px",
                fontWeight: "700",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.25)",
                cursor: "pointer",
              }}
            >
              {saving ? "Creating…" : "Create Member"}
            </button>
          </div>
        </form>
      </div>

      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onKeepEditing={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          onClose();
        }}
        onSave={(e) => {
          setShowUnsavedModal(false);
          handleSubmit(e);
        }}
        saving={saving}
      />
    </div>
  );
}
