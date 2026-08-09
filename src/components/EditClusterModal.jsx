// src/components/EditClusterModal.jsx
import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function EditClusterModal({ cluster, onClose, onSaved }) {
  const [name, setName] = useState(cluster?.name || "");
  const [description, setDescription] = useState(cluster?.description || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteCluster = async () => {
    const clusterName = cluster.name || "this cluster";
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete cluster '${clusterName}' from MongoDB Atlas.\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const targetId = cluster._id || cluster.clusterId;
      await apiFetch(`/clusters/${targetId}`, { method: "DELETE" });
      alert(`Cluster '${clusterName}' deleted successfully.`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete cluster");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Cluster Name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const targetId = cluster._id || cluster.clusterId;
      await apiFetch(`/clusters/${targetId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update cluster");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">✏️ Edit Cluster — {cluster?.name}</h3>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
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
            <textarea
              className="edit-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Specialized track for Machine Learning & Data Science"
              style={{ width: "100%", padding: "10px", resize: "vertical" }}
            />
          </div>

          <div className="edit-actions" style={{ marginTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              className="delete-user-btn"
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
              onClick={handleDeleteCluster}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "🗑️ Delete Cluster"}
            </button>

            <div style={{ display: "flex", gap: "10px" }}>
              <button className="edit-cancel-btn" type="button" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </button>
              <button className="edit-save-btn" type="submit" disabled={saving || deleting}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
