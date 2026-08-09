import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";

function getLevelColumns(row) {
  return Object.keys(row || {}).filter((k) => k.toLowerCase().startsWith("level"));
}

export default function EditModal({ student, onClose, onSaved }) {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin" && auth.viewMode === "admin";

  const [form, setForm] = useState({
    LINKEDIN: student.LINKEDIN || student.linkedin || "",
    GITHUB: student.GITHUB || student.github || "",
    "ACTIVITY POINT": student.ACTIVITY ?? student.activityPoints ?? "",
    "REWARD POINT": student.REWARD ?? student.rewardPoints ?? "",
  });

  const [adminForm, setAdminForm] = useState({
    Name: student.Name || student.name || "",
    POSITION: student.POSITION || student.position || "",
    CLUSTER: student.CLUSTER || student.clusterName || "",
    JOINED: student.JOINED || student.joinedDate || "",
    ROLE: student.ROLE || student.role || "MEMBER",
    STATUS: student.STATUS || student.status || "ACTIVE",
  });

  const [courseEdits, setCourseEdits] = useState(() => {
    const init = {};
    (student.COURSE_DETAILS || []).forEach((c) => {
      init[c.courseName] = c.currentLevel || "";
    });
    return init;
  });

  const [pointsRows, setPointsRows] = useState([]);
  const [pointsLoading, setPointsLoading] = useState(true);

  useEffect(() => {
    apiFetch("/points/rules")
      .then((res) => {
        const rules = res.rules || [];
        setPointsRows(rules);
      })
      .catch(() => setPointsRows([]))
      .finally(() => setPointsLoading(false));
  }, []);

  const courseLevelOptions = {};
  pointsRows.forEach((row) => {
    const courseName = row.courseName || row.courseId?.name || "";
    if (!courseName) return;
    const levelMap = row.levelPoints || {};
    const levels = Object.keys(levelMap).filter((l) => Number(levelMap[l] || 0) > 0);
    if (levels.length > 0) courseLevelOptions[courseName] = levels;
  });

  const allKnownCourses = pointsRows
    .map((row) => row.courseName || row.courseId?.name)
    .filter(Boolean);

  const enrolledCourseNames = (student.COURSE_DETAILS || []).map((c) => c.courseName);

  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseLevel, setNewCourseLevel] = useState("");

  const handleAddCourse = () => {
    if (!newCourseName || !newCourseLevel) return;
    setCourseEdits((prev) => ({ ...prev, [newCourseName]: newCourseLevel }));
    setNewCourseName("");
    setNewCourseLevel("");
  };

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setAdmin = (key, val) => setAdminForm((p) => ({ ...p, [key]: val }));

  const handleDeleteUser = async () => {
    const userName = student.Name || student.name || "this user";
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete ${userName} from MongoDB.\n\nThis action cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      const targetId = student._id || student.userId;
      await apiFetch(`/users/${targetId}`, { method: "DELETE" });
      alert(`User '${userName}' deleted successfully.`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert("Failed to delete user: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        "ENROLMENT NUMBER": student["ENROLMENT NUMBER"] || student.enrolmentNumber,
        LINKEDIN: form.LINKEDIN,
        GITHUB: form.GITHUB,
        "ACTIVITY POINT": form["ACTIVITY POINT"],
        "REWARD POINT": form["REWARD POINT"],
        ...(isAdmin ? adminForm : {}),
        COURSE_UPDATES: courseEdits,
      };

      const targetId = student._id || student.userId;
      await apiFetch(`/users/${targetId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      onSaved({ ...payload, COURSE_UPDATES: courseEdits });
      onClose();
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const displayedCourses = [
    ...new Set([
      ...enrolledCourseNames,
      ...Object.keys(courseEdits).filter((k) => courseEdits[k] !== ""),
    ]),
  ];

  const addableCourses = allKnownCourses.filter((c) => !displayedCourses.includes(c));

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">
          {isAdmin ? `✏️ Edit — ${student.Name || student.name}` : "✏️ Update My Profile"}
        </h3>

        {isAdmin && (
          <div className="edit-section">
            <h4 className="edit-section-title">Identity & Administrative Settings</h4>
            <div className="edit-grid">
              <EditField label="Name" value={adminForm.Name} onChange={(v) => setAdmin("Name", v)} />
              <EditField label="Position (e.g. Member 1, Team Lead, Admin)" value={adminForm.POSITION} onChange={(v) => setAdmin("POSITION", v)} />
              <EditField label="Cluster" value={adminForm.CLUSTER} onChange={(v) => setAdmin("CLUSTER", v)} />
              <EditField label="Joined Date" value={adminForm.JOINED} onChange={(v) => setAdmin("JOINED", v)} />
              
              <div className="edit-field">
                <label className="edit-label">Role (Permission)</label>
                <select
                  className="edit-input"
                  style={{ background: "#0f172a", color: "#f8fafc" }}
                  value={adminForm.ROLE}
                  onChange={(e) => setAdmin("ROLE", e.target.value)}
                >
                  <option value="MEMBER">🎓 MEMBER (Team Member)</option>
                  <option value="ADMIN">👑 ADMIN (System Administrator)</option>
                </select>
              </div>

              <div className="edit-field">
                <label className="edit-label">Account Status</label>
                <select
                  className="edit-input"
                  style={{ background: "#0f172a", color: "#f8fafc" }}
                  value={adminForm.STATUS}
                  onChange={(e) => setAdmin("STATUS", e.target.value)}
                >
                  <option value="ACTIVE">✅ ACTIVE</option>
                  <option value="INACTIVE">⛔ INACTIVE (Deactivated)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="edit-section">
          <h4 className="edit-section-title">Social Links</h4>
          <div className="edit-grid">
            <EditField label="LinkedIn URL" value={form.LINKEDIN} onChange={(v) => set("LINKEDIN", v)} />
            <EditField label="GitHub URL" value={form.GITHUB} onChange={(v) => set("GITHUB", v)} />
          </div>
        </div>

        <div className="edit-section">
          <h4 className="edit-section-title">Points</h4>
          <div className="edit-grid">
            <EditField
              label="Activity Points"
              type="number"
              value={form["ACTIVITY POINT"]}
              onChange={(v) => set("ACTIVITY POINT", v)}
            />
            <EditField
              label="Reward Points"
              type="number"
              value={form["REWARD POINT"]}
              onChange={(v) => set("REWARD POINT", v)}
            />
          </div>
        </div>

        <div className="edit-section">
          <h4 className="edit-section-title">Course Levels</h4>

          {pointsLoading ? (
            <p className="edit-note">Loading course data…</p>
          ) : (
            <>
              {displayedCourses.length === 0 && (
                <p className="edit-note">No courses enrolled yet. Add one below.</p>
              )}

              <div className="course-edit-list">
                {displayedCourses.map((courseName) => {
                  const levels = courseLevelOptions[courseName] || ["LEVEL-0", "LEVEL-1", "LEVEL-2", "LEVEL-3"];
                  const currentVal = courseEdits[courseName] ?? "";
                  return (
                    <div key={courseName} className="course-edit-row">
                      <span className="course-edit-name" title={courseName}>{courseName}</span>
                      <select
                        className="course-edit-select"
                        value={currentVal}
                        onChange={(e) =>
                          setCourseEdits((prev) => ({ ...prev, [courseName]: e.target.value }))
                        }
                      >
                        <option value="">— No level / Remove —</option>
                        {levels.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="course-add-row">
                <select
                  className="course-edit-select"
                  value={newCourseName}
                  onChange={(e) => { setNewCourseName(e.target.value); setNewCourseLevel(""); }}
                >
                  <option value="">+ Add a course…</option>
                  {addableCourses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                {newCourseName && (
                  <select
                    className="course-edit-select"
                    value={newCourseLevel}
                    onChange={(e) => setNewCourseLevel(e.target.value)}
                  >
                    <option value="">Select level…</option>
                    {(courseLevelOptions[newCourseName] || ["LEVEL-0", "LEVEL-1", "LEVEL-2", "LEVEL-3"]).map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                )}

                {newCourseName && newCourseLevel && (
                  <button className="course-add-btn" type="button" onClick={handleAddCourse}>
                    Add
                  </button>
                )}
              </div>

              <p className="edit-note" style={{ marginTop: "10px" }}>
                💡 Changes are saved directly to MongoDB.
              </p>
            </>
          )}
        </div>

        <div className="edit-actions">
          {isAdmin && (
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
                marginRight: "auto",
              }}
              onClick={handleDeleteUser}
              disabled={saving || deleting}
            >
              {deleting ? "Deleting…" : "🗑️ Delete User"}
            </button>
          )}

          <button className="edit-cancel-btn" onClick={onClose} disabled={saving || deleting}>
            Cancel
          </button>
          <button className="edit-save-btn" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditField({ label, value, onChange, type = "text" }) {
  return (
    <div className="edit-field">
      <label className="edit-label">{label}</label>
      <input
        className="edit-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}