import { useState, useEffect } from "react";
import { scriptPost, POINTS_URL } from "../utils/api";
import { useAuth } from "../context/AuthContext";

function getLevelColumns(row) {
  return Object.keys(row).filter((k) => k.toLowerCase().startsWith("level"));
}

export default function EditModal({ student, onClose, onSaved }) {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin" && auth.viewMode === "admin";

  const [form, setForm] = useState({
    LINKEDIN:         student.LINKEDIN || "",
    GITHUB:           student.GITHUB   || "",
    "ACTIVITY POINT": student.ACTIVITY ?? "",
    "REWARD POINT":   student.REWARD   ?? "",
  });

  const [adminForm, setAdminForm] = useState({
    Name:     student.Name     || "",
    POSITION: student.POSITION || "",
    CLUSTER:  student.CLUSTER  || "",
    JOINED:   student.JOINED   || "",
  });

  const [courseEdits, setCourseEdits] = useState(() => {
    const init = {};
    (student.COURSE_DETAILS || []).forEach((c) => {
      init[c.courseName] = c.currentLevel || "";
    });
    return init;
  });

  const [pointsRows,    setPointsRows]    = useState([]);
  const [pointsLoading, setPointsLoading] = useState(true);

  useEffect(() => {
    fetch(POINTS_URL)
      .then((r) => r.json())
      .then((data) => setPointsRows(data || []))
      .catch(() => setPointsRows([]))
      .finally(() => setPointsLoading(false));
  }, []);

  const courseLevelOptions = {};
  pointsRows.forEach((row) => {
    const keys       = Object.keys(row);
    const courseName = String(row[keys[0]] || "").trim();
    if (!courseName) return;
    const levels = getLevelColumns(row).filter((l) => Number(row[l] || 0) > 0);
    if (levels.length > 0) courseLevelOptions[courseName] = levels;
  });

  const allKnownCourses = pointsRows
    .map((row) => String(row[Object.keys(row)[0]] || "").trim())
    .filter(Boolean);

  const enrolledCourseNames = (student.COURSE_DETAILS || []).map((c) => c.courseName);

  const [newCourseName,  setNewCourseName]  = useState("");
  const [newCourseLevel, setNewCourseLevel] = useState("");

  const handleAddCourse = () => {
    if (!newCourseName || !newCourseLevel) return;
    setCourseEdits((prev) => ({ ...prev, [newCourseName]: newCourseLevel }));
    setNewCourseName("");
    setNewCourseLevel("");
  };

  const [saving, setSaving] = useState(false);

  const set      = (key, val) => setForm((p)      => ({ ...p, [key]: val }));
  const setAdmin = (key, val) => setAdminForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);

    const profilePayload = {
      "ENROLMENT NUMBER": student["ENROLMENT NUMBER"],
      LINKEDIN:           form.LINKEDIN,
      GITHUB:             form.GITHUB,
      "ACTIVITY POINT":   form["ACTIVITY POINT"],
      "REWARD POINT":     form["REWARD POINT"],
      ...(isAdmin ? adminForm : {}),
    };

    const action = isAdmin ? "adminUpdateStudent" : "studentUpdateOwn";
    scriptPost({ action, requesterEmail: auth.email, payload: profilePayload });

    // ── Only send courses that actually changed ──────────────
    const originalLevels = {};
    (student.COURSE_DETAILS || []).forEach((c) => {
      originalLevels[c.courseName] = c.currentLevel || "";
    });

    const changedCourses = {};
    Object.entries(courseEdits).forEach(([courseName, level]) => {
      if (level !== (originalLevels[courseName] ?? "")) {
        changedCourses[courseName] = level;
      }
    });

    if (Object.keys(changedCourses).length > 0) {
      scriptPost({
        action:         "updateCourses",
        requesterEmail: auth.email,
        payload: {
          "ENROLMENT NUMBER": student["ENROLMENT NUMBER"],
          studentName:        student.Name,
          COURSE_UPDATES:     changedCourses,
        },
      });
    }

    // Update UI immediately (optimistic)
    onSaved({ ...profilePayload, COURSE_UPDATES: courseEdits });
    setSaving(false);
    onClose();
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
          {isAdmin ? `✏️ Edit — ${student.Name}` : "✏️ Update My Profile"}
        </h3>

        {/* ── Admin-only: identity fields ────────────────────── */}
        {isAdmin && (
          <div className="edit-section">
            <h4 className="edit-section-title">Identity</h4>
            <div className="edit-grid">
              <EditField label="Name"     value={adminForm.Name}     onChange={(v) => setAdmin("Name", v)} />
              <EditField label="Position" value={adminForm.POSITION} onChange={(v) => setAdmin("POSITION", v)} />
              <EditField label="Cluster"  value={adminForm.CLUSTER}  onChange={(v) => setAdmin("CLUSTER", v)} />
              <EditField label="Joined"   value={adminForm.JOINED}   onChange={(v) => setAdmin("JOINED", v)} />
            </div>
          </div>
        )}

        {/* ── Social links ───────────────────────────────────── */}
        <div className="edit-section">
          <h4 className="edit-section-title">Social Links</h4>
          <div className="edit-grid">
            <EditField label="LinkedIn URL" value={form.LINKEDIN} onChange={(v) => set("LINKEDIN", v)} />
            <EditField label="GitHub URL"   value={form.GITHUB}   onChange={(v) => set("GITHUB", v)} />
          </div>
        </div>

        {/* ── Points ────────────────────────────────────────── */}
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

        {/* ── Course Levels ──────────────────────────────────── */}
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
                  const levels     = courseLevelOptions[courseName] || [];
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
                    {(courseLevelOptions[newCourseName] || []).map((l) => (
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
                💡 Changes are saved to the sheet in the background.
              </p>
            </>
          )}
        </div>

        <div className="edit-actions">
          <button className="edit-cancel-btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="edit-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save to Sheet"}
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