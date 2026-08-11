// src/components/AddCourseModal.jsx
import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";

export default function AddCourseModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Development");
  
  // Cluster access handling
  const [availableClusters, setAvailableClusters] = useState(["Core", "Computer Cluster"]);
  const [selectedClusters, setSelectedClusters] = useState(["Core", "Computer Cluster"]);
  const [newCustomCluster, setNewCustomCluster] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Dynamic Level Rows
  const [levelRows, setLevelRows] = useState([
    { id: 1, name: "LEVEL-0", points: 10 },
    { id: 2, name: "LEVEL-1", points: 20 },
    { id: 3, name: "LEVEL-2", points: 40 },
    { id: 4, name: "LEVEL-3", points: 60 },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

      const uniqueList = Array.from(clusterSet).filter(Boolean).sort();
      setAvailableClusters(uniqueList);
      setSelectedClusters(uniqueList);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const isAllSelected =
    availableClusters.length > 0 &&
    availableClusters.every((c) => selectedClusters.includes(c));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters([...availableClusters]);
    }
  };

  const handleToggleCluster = (clusterName) => {
    setSelectedClusters((prev) =>
      prev.includes(clusterName)
        ? prev.filter((c) => c !== clusterName)
        : [...prev, clusterName]
    );
  };

  const handleAddCustomCluster = () => {
    const trimmed = newCustomCluster.trim();
    if (!trimmed) return;
    if (!availableClusters.includes(trimmed)) {
      setAvailableClusters((prev) => [...prev, trimmed].sort());
    }
    if (!selectedClusters.includes(trimmed)) {
      setSelectedClusters((prev) => [...prev, trimmed]);
    }
    setNewCustomCluster("");
    setShowCustomInput(false);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Course Name is required.");
      return;
    }

    if (selectedClusters.length === 0) {
      setError("Please select at least one cluster for which this course is applicable.");
      return;
    }

    const finalClusterAccess =
      isAllSelected || selectedClusters.length === availableClusters.length
        ? "Both"
        : selectedClusters.join(", ");

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
      // 1. Create course
      const res = await apiFetch("/courses", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          clusterAccess: finalClusterAccess,
        }),
      });

      const courseId = res.course?._id;

      // 2. Set level point rules
      if (courseId) {
        await apiFetch(`/points/rules/${courseId}`, {
          method: "PUT",
          body: JSON.stringify({
            levelPoints,
            clusterAccess: finalClusterAccess,
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
      <div className="modal-box edit-modal-box" style={{ maxWidth: "620px" }} onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">➕ Add New Course</h3>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          <div>
            <label className="edit-label">Course Name *</label>
            <input
              className="edit-input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Next.js / Data Science / Communication"
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
            <label className="edit-label" style={{ marginBottom: "8px", display: "block" }}>
              Cluster Access (Select applicable clusters) *
            </label>

            <div style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              {/* Select All Checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: "600", color: "#f8fafc", cursor: "pointer", paddingBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  style={{ width: "16px", height: "16px", accentColor: "#6366f1", cursor: "pointer" }}
                />
                <span>🌟 Select All Clusters (Both / Universal Access)</span>
              </label>

              {/* Individual Cluster Checkboxes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px", marginTop: "4px" }}>
                {availableClusters.map((clusterName) => {
                  const isChecked = selectedClusters.includes(clusterName);
                  return (
                    <label
                      key={clusterName}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 10px",
                        background: isChecked ? "rgba(99, 102, 241, 0.18)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isChecked ? "rgba(99, 102, 241, 0.5)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: "6px",
                        color: isChecked ? "#a5b4fc" : "#cbd5e1",
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.2s"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCluster(clusterName)}
                        style={{ width: "15px", height: "15px", accentColor: "#6366f1", cursor: "pointer" }}
                      />
                      <span>{clusterName}</span>
                    </label>
                  );
                })}
              </div>

              {/* Add Custom Cluster */}
              {showCustomInput ? (
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <input
                    className="edit-input"
                    style={{ flex: 1, padding: "6px 10px", fontSize: "13px" }}
                    value={newCustomCluster}
                    onChange={(e) => setNewCustomCluster(e.target.value)}
                    placeholder="Type new cluster name..."
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomCluster(); } }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn primary"
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                    onClick={handleAddCustomCluster}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn secondary"
                    style={{ fontSize: "12px", padding: "6px 10px" }}
                    onClick={() => setShowCustomInput(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#818cf8",
                    cursor: "pointer",
                    fontSize: "12px",
                    textAlign: "left",
                    padding: "4px 0",
                    width: "fit-content"
                  }}
                  onClick={() => setShowCustomInput(true)}
                >
                  ➕ Add Custom Cluster Name...
                </button>
              )}
            </div>
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
