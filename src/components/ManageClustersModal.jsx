// src/components/ManageClustersModal.jsx
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import EditClusterModal from "./EditClusterModal";
import AddClusterModal from "./AddClusterModal";

export default function ManageClustersModal({ onClose, onClustersUpdated }) {
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCluster, setEditingCluster] = useState(null);
  const [showAddCluster, setShowAddCluster] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadClusters = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch("/clusters");
      if (res?.clusters) {
        setClusters(res.clusters);
      } else {
        setError("Failed to load clusters.");
      }
    } catch (err) {
      console.error("Error loading clusters:", err);
      setError(err.message || "Failed to load clusters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClusters();
  }, [loadClusters]);

  const handleDeleteCluster = async (cluster) => {
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete cluster '${cluster.name}' from MongoDB Atlas.\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingId(cluster._id);
    try {
      await apiFetch(`/clusters/${cluster._id}`, { method: "DELETE" });
      await loadClusters();
      if (onClustersUpdated) onClustersUpdated();
    } catch (err) {
      alert("Failed to delete cluster: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" style={{ maxWidth: "750px" }} onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 className="edit-modal-title" style={{ margin: 0 }}>🏛️ Manage System Clusters</h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              View, edit, create, or delete clusters available across the platform.
            </p>
          </div>

          <button
            className="btn primary"
            onClick={() => setShowAddCluster(true)}
            style={{ fontSize: "13px", padding: "8px 14px", background: "#d97706" }}
          >
            ➕ Add New Cluster
          </button>
        </div>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>⏳</div>
            <p style={{ color: "#94a3b8" }}>Loading clusters from MongoDB Atlas...</p>
          </div>
        ) : clusters.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🏛️</div>
            <h4>No clusters found</h4>
            <p style={{ color: "#94a3b8" }}>Click "Add New Cluster" above to create your first cluster track.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
            {clusters.map((cluster) => {
              const isDeleting = deletingId === cluster._id;

              return (
                <div
                  key={cluster._id}
                  style={{
                    padding: "16px",
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 280px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "16px", color: "#f8fafc" }}>{cluster.name}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: cluster.status === "ACTIVE" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: cluster.status === "ACTIVE" ? "#4ade80" : "#f87171",
                          fontWeight: "600",
                        }}
                      >
                        {cluster.status || "ACTIVE"}
                      </span>
                    </div>

                    {cluster.description && (
                      <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                        {cluster.description}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      onClick={() => setEditingCluster(cluster)}
                    >
                      ✏️ Edit Cluster
                    </button>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={isDeleting}
                      style={{
                        fontSize: "12px",
                        padding: "6px 12px",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        color: "#f87171",
                        borderColor: "rgba(239, 68, 68, 0.3)",
                      }}
                      onClick={() => handleDeleteCluster(cluster)}
                    >
                      {isDeleting ? "Deleting…" : "🗑️ Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="edit-actions" style={{ marginTop: "20px" }}>
          <button className="edit-cancel-btn" onClick={onClose}>
            Close
          </button>
        </div>

        {/* Edit Cluster Modal */}
        {editingCluster && (
          <EditClusterModal
            cluster={editingCluster}
            onClose={() => setEditingCluster(null)}
            onSaved={() => {
              setEditingCluster(null);
              loadClusters();
              if (onClustersUpdated) onClustersUpdated();
            }}
          />
        )}

        {/* Add Cluster Modal */}
        {showAddCluster && (
          <AddClusterModal
            onClose={() => setShowAddCluster(false)}
            onCreated={() => {
              setShowAddCluster(false);
              loadClusters();
              if (onClustersUpdated) onClustersUpdated();
            }}
          />
        )}
      </div>
    </div>
  );
}
