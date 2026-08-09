import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function AddClusterModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Cluster Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await apiFetch("/clusters", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create cluster");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">➕ Add New Cluster</h3>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label className="edit-label">Cluster Name *</label>
            <input
              className="edit-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AI & ML Cluster"
            />
          </div>

          <div>
            <label className="edit-label">Description</label>
            <input
              className="edit-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Machine learning and data science track"
            />
          </div>

          <div className="edit-actions" style={{ marginTop: "16px" }}>
            <button className="edit-cancel-btn" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="edit-save-btn" type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Cluster"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
