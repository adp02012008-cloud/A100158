import { useState } from "react";
import { apiFetch } from "../utils/api";

export default function AddCourseModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Development");
  const [clusterAccess, setClusterAccess] = useState("Both");
  const [level0, setLevel0] = useState(10);
  const [level1, setLevel1] = useState(20);
  const [level2, setLevel2] = useState(40);
  const [level3, setLevel3] = useState(60);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Course Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // 1. Create course
      const res = await apiFetch("/courses", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          clusterAccess,
        }),
      });

      const courseId = res.course?._id;

      // 2. Set level point rules
      if (courseId) {
        await apiFetch(`/points/rules/${courseId}`, {
          method: "PUT",
          body: JSON.stringify({
            levelPoints: {
              "LEVEL-0": Number(level0) || 0,
              "LEVEL-1": Number(level1) || 0,
              "LEVEL-2": Number(level2) || 0,
              "LEVEL-3": Number(level3) || 0,
            },
            clusterAccess,
          }),
        });
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">➕ Add New Course</h3>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px" }}>
          <div>
            <label className="edit-label">Course Name *</label>
            <input
              className="edit-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Next.js / TypeScript"
            />
          </div>

          <div>
            <label className="edit-label">Category</label>
            <input
              className="edit-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Development"
            />
          </div>

          <div>
            <label className="edit-label">Cluster Access</label>
            <select
              className="course-edit-select"
              value={clusterAccess}
              onChange={(e) => setClusterAccess(e.target.value)}
              style={{ width: "100%", padding: "10px" }}
            >
              <option value="Both">Both (Core & Computer Cluster)</option>
              <option value="Core">Core Only</option>
              <option value="Computer Cluster">Computer Cluster Only</option>
            </select>
          </div>

          <div style={{ marginTop: "8px" }}>
            <h4 className="edit-section-title">Level Points Configuration</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label className="edit-label">LEVEL-0 Points</label>
                <input className="edit-input" type="number" value={level0} onChange={(e) => setLevel0(e.target.value)} />
              </div>
              <div>
                <label className="edit-label">LEVEL-1 Points</label>
                <input className="edit-input" type="number" value={level1} onChange={(e) => setLevel1(e.target.value)} />
              </div>
              <div>
                <label className="edit-label">LEVEL-2 Points</label>
                <input className="edit-input" type="number" value={level2} onChange={(e) => setLevel2(e.target.value)} />
              </div>
              <div>
                <label className="edit-label">LEVEL-3 Points</label>
                <input className="edit-input" type="number" value={level3} onChange={(e) => setLevel3(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="edit-actions" style={{ marginTop: "16px" }}>
            <button className="edit-cancel-btn" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="edit-save-btn" type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
