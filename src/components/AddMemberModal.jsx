import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

export default function AddMemberModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    enrolmentNumber: "",
    position: "Member",
    clusterName: "Core",
    joinedDate: new Date().toISOString().split("T")[0],
    role: "MEMBER",
  });
  const [existingClusters, setExistingClusters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/clusters")
      .then((res) => {
        if (res?.clusters) setExistingClusters(res.clusters);
      })
      .catch(() => {});
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

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">➕ Add New Member</h3>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="edit-grid" style={{ display: "grid", gap: "12px" }}>
          <div>
            <label className="edit-label">Full Name *</label>
            <input
              className="edit-input"
              required
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="edit-label">Email Address *</label>
            <input
              className="edit-input"
              type="email"
              required
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="e.g. john.cs25@bitsathy.ac.in"
            />
          </div>

          <div>
            <label className="edit-label">Enrolment Number</label>
            <input
              className="edit-input"
              value={form.enrolmentNumber}
              onChange={(e) => handleChange("enrolmentNumber", e.target.value)}
              placeholder="e.g. 7376231CS199"
            />
          </div>

          <div>
            <label className="edit-label">Joined Date</label>
            <input
              className="edit-input"
              type="date"
              value={form.joinedDate}
              onChange={(e) => handleChange("joinedDate", e.target.value)}
            />
          </div>

          <div>
            <label className="edit-label">Cluster (Type or Select)</label>
            <input
              className="edit-input"
              list="clusters-list"
              value={form.clusterName}
              onChange={(e) => handleChange("clusterName", e.target.value)}
              placeholder="e.g. Core, Computer Cluster, Electronics"
            />
            <datalist id="clusters-list">
              <option value="Core" />
              <option value="Computer Cluster" />
              {existingClusters.map((c) => (
                <option key={c._id || c.name} value={c.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="edit-label">Position (e.g. Member 1, Team Lead)</label>
            <input
              className="edit-input"
              value={form.position}
              onChange={(e) => handleChange("position", e.target.value)}
              placeholder="e.g. Member 1, Member 2, Team Lead"
            />
          </div>

          <div>
            <label className="edit-label">Platform Role</label>
            <select
              className="course-edit-select"
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              style={{ width: "100%", padding: "10px" }}
            >
              <option value="MEMBER">Team Member</option>
              <option value="ADMIN">System Admin</option>
            </select>
          </div>

          <div className="edit-actions" style={{ gridColumn: "1 / -1", marginTop: "12px" }}>
            <button className="edit-cancel-btn" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="edit-save-btn" type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
