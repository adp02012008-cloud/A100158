// src/components/EditCourseModal.jsx
import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

export default function EditCourseModal({ course, pointRule, onClose, onSaved }) {
  const [name, setName] = useState(course?.name || "");
  const [description, setDescription] = useState(course?.description || "");
  const [category, setCategory] = useState(course?.category || "Development");
  const [clusterAccess, setClusterAccess] = useState(course?.clusterAccess || "Both");
  const [customCluster, setCustomCluster] = useState("");
  const [existingClusters, setExistingClusters] = useState([]);

  // Initialize dynamic level rows from pointRule.levelPoints or default
  const [levelRows, setLevelRows] = useState(() => {
    const map = pointRule?.levelPoints || {};
    const keys = Object.keys(map);
    if (keys.length > 0) {
      return keys.map((lvlName, idx) => ({
        id: idx + 1,
        name: lvlName,
        points: Number(map[lvlName]) || 0,
      }));
    }
    return [
      { id: 1, name: "LEVEL-0", points: 10 },
      { id: 2, name: "LEVEL-1", points: 20 },
      { id: 3, name: "LEVEL-2", points: 40 },
      { id: 4, name: "LEVEL-3", points: 60 },
    ];
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/clusters")
      .then((res) => {
        if (res?.clusters) setExistingClusters(res.clusters);
      })
      .catch(() => {});
  }, []);

  const handleAddLevelRow = () => {
    const nextIdx = levelRows.length;
    setLevelRows((prev) => [
      ...prev,
      { id: Date.now(), name: `LEVEL-${nextIdx}`, points: (nextIdx + 1) * 10 },
    ]);
  };

  const handleRemoveLevelRow = (id) => {
    if (levelRows.length <= 1) {
      alert("A course must have at least one level configured.");
      return;
    }
    setLevelRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleLevelChange = (id, field, value) => {
    setLevelRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleDeleteCourse = async () => {
    const courseName = course.name || "this course";
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete course '${courseName}' and all associated student progress records from MongoDB Atlas.\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    setError("");
    try {
      const courseId = course._id || course.courseId;
      await apiFetch(`/courses/${courseId}`, { method: "DELETE" });
      alert(`Course '${courseName}' deleted successfully.`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Course Name is required.");
      return;
    }

    const finalClusterAccess =
      clusterAccess === "CUSTOM"
        ? customCluster.trim() || "Both"
        : clusterAccess.trim();

    // Build levelPoints map from rows
    const levelPoints = {};
    for (const row of levelRows) {
      const lvlName = String(row.name || "").trim();
      if (lvlName) {
        levelPoints[lvlName] = Number(row.points) || 0;
      }
    }

    if (Object.keys(levelPoints).length === 0) {
      setError("Please configure at least one valid level name and points.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const targetId = course._id || course.courseId;
      
      // Update course and level points via API
      await apiFetch(`/courses/${targetId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          clusterAccess: finalClusterAccess,
          levelPoints,
        }),
      });

      // Also update point rules directly
      await apiFetch(`/points/rules/${targetId}`, {
        method: "PUT",
        body: JSON.stringify({
          levelPoints,
          clusterAccess: finalClusterAccess,
        }),
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">✏️ Edit Course — {course?.name}</h3>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label className="edit-label">Course Name *</label>
            <input
              className="edit-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Next.js / Data Science"
            />
          </div>

          <div>
            <label className="edit-label">Category</label>
            <input
              className="edit-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Development, Design, Soft Skills"
            />
          </div>

          <div>
            <label className="edit-label">Cluster Access</label>
            <select
              className="course-edit-select"
              value={clusterAccess}
              onChange={(e) => setClusterAccess(e.target.value)}
              style={{ width: "100%", padding: "10px", marginBottom: clusterAccess === "CUSTOM" ? "8px" : "0" }}
            >
              <option value="Both">Both (Core & Computer Cluster)</option>
              <option value="Core">Core Only</option>
              <option value="Computer Cluster">Computer Cluster Only</option>
              {existingClusters.map((c) => (
                <option key={c._id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
              <option value="CUSTOM">➕ Type Custom Cluster Name...</option>
            </select>

            {clusterAccess === "CUSTOM" && (
              <input
                className="edit-input"
                required
                value={customCluster}
                onChange={(e) => setCustomCluster(e.target.value)}
                placeholder="Type cluster name (e.g. Electronics, All Clusters)"
              />
            )}
          </div>

          <div style={{ marginTop: "10px", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 className="edit-section-title" style={{ margin: 0 }}>🎯 Dynamic Level & Points Configuration</h4>
              <button
                type="button"
                className="btn secondary"
                style={{ fontSize: "12px", padding: "4px 10px" }}
                onClick={handleAddLevelRow}
              >
                ➕ Add Level Row
              </button>
            </div>

            <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 12px 0" }}>
              Configure custom level names (e.g. LEVEL-0, LEVEL-1, Level 0, Beginner, Master) and their point rewards.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {levelRows.map((row, index) => (
                <div key={row.id} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <label className="edit-label" style={{ fontSize: "11px" }}>Level Name #{index + 1}</label>
                    <input
                      className="edit-input"
                      required
                      value={row.name}
                      onChange={(e) => handleLevelChange(row.id, "name", e.target.value)}
                      placeholder="e.g. LEVEL-0, Level 1, Beginner"
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label className="edit-label" style={{ fontSize: "11px" }}>Reward Points</label>
                    <input
                      className="edit-input"
                      type="number"
                      min="0"
                      required
                      value={row.points}
                      onChange={(e) => handleLevelChange(row.id, "points", e.target.value)}
                      placeholder="e.g. 10, 20, 50"
                    />
                  </div>

                  <button
                    type="button"
                    style={{
                      background: "rgba(239, 68, 68, 0.2)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      marginTop: "16px",
                    }}
                    onClick={() => handleRemoveLevelRow(row.id)}
                    title="Remove Level"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
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
              onClick={handleDeleteCourse}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "🗑️ Delete Course"}
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
