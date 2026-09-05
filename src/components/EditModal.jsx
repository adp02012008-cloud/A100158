import { useState, useEffect } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatDateForInput } from "../utils/dateUtils";

function getLevelColumns(row) {
  return Object.keys(row || {}).filter((k) => k.toLowerCase().startsWith("level"));
}

export default function EditModal({ student, onClose, onSaved }) {
  const { auth } = useAuth();
  const isAdmin = auth.role === "admin" && auth.viewMode === "admin";

  const [personalForm, setPersonalForm] = useState({
    Name: student.Name || student.name || "",
    POSITION: student.POSITION || student.position || "",
    CLUSTER: student.CLUSTER || student.clusterName || "Core",
    JOINED: formatDateForInput(student.JOINED || student.joinedDate || ""),
  });

  const [form, setForm] = useState({
    LINKEDIN: student.LINKEDIN || student.linkedin || "",
    GITHUB: student.GITHUB || student.github || "",
    "ACTIVITY POINT": student.ACTIVITY ?? student["ACTIVITY POINT"] ?? student.activityPoints ?? "",
    "REWARD POINT": student.REWARD ?? student["REWARD POINT"] ?? student.rewardPoints ?? "",
  });

  const [adminForm, setAdminForm] = useState({
    ROLE: student.ROLE || student.role || "MEMBER",
    STATUS: student.STATUS || student.status || "ACTIVE",
  });

  const [courseEdits, setCourseEdits] = useState(() => {
    const init = {};
    (student.COURSE_DETAILS || []).forEach((c) => {
      if (c && c.courseName) {
        init[c.courseName] = c.currentLevel || "COMPLETED";
      }
    });
    (student.COURSES || []).forEach((cStr) => {
      if (typeof cStr === "string" && cStr.trim()) {
        const cleanName = cStr.replace(/\s*-\s*LEVEL\s*[^\-]+$/i, "").trim();
        if (!init[cleanName] && !init[cStr.trim()]) {
          const match = cStr.match(/Level\s*([0-9A-Za-z]+)/i);
          init[cleanName] = match ? `LEVEL ${match[1].toUpperCase()}` : "COMPLETED";
        }
      }
    });
    return init;
  });

  const [pointsRows, setPointsRows] = useState([]);
  const [allCoursesList, setAllCoursesList] = useState([]);
  const [pointsLoading, setPointsLoading] = useState(true);

  const [clusterOptions, setClusterOptions] = useState(["Core", "Computer Cluster"]);

  // Fetch real-time progress records for student directly from MongoDB
  useEffect(() => {
    const targetId = student._id || student.userId;
    if (!targetId) return;

    let isMounted = true;
    apiFetch(`/courses/progress?userId=${targetId}`)
      .then((res) => {
        if (!isMounted) return;
        if (res?.progress && Array.isArray(res.progress)) {
          setCourseEdits((prev) => {
            const updated = { ...prev };
            res.progress.forEach((p) => {
              const cName = p.courseId?.name;
              if (cName && (updated[cName] === undefined || updated[cName] === "")) {
                updated[cName] = p.currentLevel || "COMPLETED";
              }
            });
            return updated;
          });
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [student._id, student.userId]);

  useEffect(() => {
    let isMounted = true;
    Promise.allSettled([
      apiFetch("/clusters"),
      apiFetch("/users/dashboard"),
    ]).then(([clustersRes, dashRes]) => {
      if (!isMounted) return;
      const set = new Set(["Core", "Computer Cluster"]);

      if (clustersRes.status === "fulfilled" && Array.isArray(clustersRes.value?.clusters)) {
        clustersRes.value.clusters.forEach((c) => {
          if (c?.name) set.add(c.name.trim());
        });
      }

      if (dashRes.status === "fulfilled" && Array.isArray(dashRes.value?.users)) {
        dashRes.value.users.forEach((u) => {
          const cName = u.CLUSTER || u.clusterName;
          if (cName) set.add(cName.trim());
        });
      }

      if (student.CLUSTER || student.clusterName) {
        set.add((student.CLUSTER || student.clusterName).trim());
      }

      setClusterOptions(Array.from(set).filter(Boolean).sort());
    });

    return () => {
      isMounted = false;
    };
  }, [student]);

  useEffect(() => {
    Promise.allSettled([
      apiFetch("/points/rules"),
      apiFetch("/courses"),
    ])
      .then(([rulesRes, coursesRes]) => {
        const rules =
          rulesRes.status === "fulfilled" && Array.isArray(rulesRes.value?.rules)
            ? rulesRes.value.rules
            : [];
        setPointsRows(rules);

        const namesSet = new Set();
        rules.forEach((r) => {
          const n = r.courseName || r.courseId?.name;
          if (n) namesSet.add(n.trim());
        });

        if (coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value?.courses)) {
          coursesRes.value.courses.forEach((c) => {
            if (c?.name) namesSet.add(c.name.trim());
          });
        }

        setAllCoursesList(Array.from(namesSet).sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {})
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

  const normalizeCourseName = (name = "") =>
    String(name)
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]+/g, " ");

  const enrolledCourseNames = [
    ...Object.keys(courseEdits).filter(
      (k) => courseEdits[k] && !["", "NULL", "NIL"].includes(String(courseEdits[k]).toUpperCase())
    ),
    ...(student.COURSE_DETAILS || []).map((c) => c?.courseName).filter(Boolean),
    ...(student.COURSES || []).map((c) => {
      if (typeof c === "string") return c.replace(/\s*-\s*LEVEL\s*[^\-]+$/i, "").trim();
      return "";
    }).filter(Boolean),
  ];

  const normalizedEnrolledSet = new Set(
    enrolledCourseNames.map((n) => normalizeCourseName(n))
  );

  const isCourseEnrolled = (courseName) => {
    const norm = normalizeCourseName(courseName);
    if (normalizedEnrolledSet.has(norm)) return true;
    for (const enrolled of normalizedEnrolledSet) {
      if (enrolled === norm || enrolled.startsWith(norm) || norm.startsWith(enrolled)) {
        return true;
      }
    }
    return false;
  };

  const displayedCourses = Object.keys(courseEdits).filter(
    (k) => courseEdits[k] && !["", "NULL", "NIL"].includes(String(courseEdits[k]).toUpperCase())
  );

  const addableCourses = allCoursesList.filter((c) => !isCourseEnrolled(c));

  const handleAddCourseDirect = (selectedCourse) => {
    if (!selectedCourse) return;

    // Automatically resolve level (no level selection dropdown required)
    const levels = courseLevelOptions[selectedCourse] || [];
    let autoLevel = levels.length > 0 ? levels[0] : "";
    if (!autoLevel) {
      const match = selectedCourse.match(/Level\s*([0-9A-Za-z]+)/i);
      autoLevel = match ? `LEVEL ${match[1].toUpperCase()}` : "LEVEL 1";
    }

    setCourseEdits((prev) => ({
      ...prev,
      [selectedCourse]: autoLevel,
    }));
  };

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));
  const setPersonal = (key, val) => setPersonalForm((p) => ({ ...p, [key]: val }));
  const setAdmin = (key, val) => setAdminForm((p) => ({ ...p, [key]: val }));

  const handleDeleteUser = async () => {
    const userName = personalForm.Name || student.Name || student.name || "this user";
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
    if (!personalForm.Name.trim()) {
      alert("Please enter a valid name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        "ENROLMENT NUMBER": student["ENROLMENT NUMBER"] || student.enrolmentNumber,
        Name: personalForm.Name.trim(),
        name: personalForm.Name.trim(),
        POSITION: personalForm.POSITION.trim(),
        position: personalForm.POSITION.trim(),
        CLUSTER: personalForm.CLUSTER.trim(),
        clusterName: personalForm.CLUSTER.trim(),
        JOINED: personalForm.JOINED,
        joinedDate: personalForm.JOINED,
        LINKEDIN: form.LINKEDIN.trim(),
        linkedin: form.LINKEDIN.trim(),
        GITHUB: form.GITHUB.trim(),
        github: form.GITHUB.trim(),
        "ACTIVITY POINT": form["ACTIVITY POINT"] === "" ? 0 : Number(form["ACTIVITY POINT"]),
        "REWARD POINT": form["REWARD POINT"] === "" ? 0 : Number(form["REWARD POINT"]),
        activityPoints: form["ACTIVITY POINT"] === "" ? 0 : Number(form["ACTIVITY POINT"]),
        rewardPoints: form["REWARD POINT"] === "" ? 0 : Number(form["REWARD POINT"]),
        ...(isAdmin ? {
          ROLE: adminForm.ROLE,
          role: adminForm.ROLE,
          STATUS: adminForm.STATUS,
          status: adminForm.STATUS,
        } : {}),
        COURSE_UPDATES: courseEdits,
      };

      const targetId = student._id || student.userId;
      await apiFetch(`/users/${targetId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (onSaved) onSaved({ ...student, ...payload, COURSE_UPDATES: courseEdits });
      onClose();
    } catch (err) {
      alert("Failed to save changes: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <h3 className="edit-modal-title">
          {isAdmin ? `✏️ Edit — ${personalForm.Name || student.Name || student.name}` : "✏️ Update My Profile"}
        </h3>

        <div className="edit-section">
          <h4 className="edit-section-title">
            {isAdmin ? "Identity & Administrative Settings" : "Identity & Personal Information"}
          </h4>
          <div className="edit-grid">
            <EditField label="Name" value={personalForm.Name} onChange={(v) => setPersonal("Name", v)} />
            <EditField label="Position (e.g. Member 1, Team Lead, Admin)" value={personalForm.POSITION} onChange={(v) => setPersonal("POSITION", v)} />
            <div className="edit-field">
              <label className="edit-label">Cluster</label>
              <select
                className="edit-input"
                style={{ background: "#0f172a", color: "#f8fafc" }}
                value={personalForm.CLUSTER}
                onChange={(e) => setPersonal("CLUSTER", e.target.value)}
              >
                {clusterOptions.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
            <EditField label="Joined Date" type="date" value={personalForm.JOINED} onChange={(v) => setPersonal("JOINED", v)} />
            
            {isAdmin && (
              <>
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
              </>
            )}
          </div>
        </div>

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
          <h4 className="edit-section-title">Enrolled Courses</h4>

          {pointsLoading ? (
            <p className="edit-note">Loading course data…</p>
          ) : (
            <>
              {displayedCourses.length === 0 ? (
                <p className="edit-note">No courses enrolled yet. Choose an available course below.</p>
              ) : (
                <div className="course-edit-list">
                  {displayedCourses.map((courseName) => {
                    const currentLevel = courseEdits[courseName] || "COMPLETED";
                    return (
                      <div
                        key={courseName}
                        className="course-edit-row"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          background: "rgba(15, 23, 42, 0.6)",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px",
                          marginBottom: "8px",
                          gap: "10px",
                        }}
                      >
                        <span
                          className="course-edit-name"
                          style={{ color: "#f8fafc", fontWeight: "600", fontSize: "13.5px" }}
                          title={courseName}
                        >
                          {courseName}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#38bdf8",
                              background: "rgba(56, 189, 248, 0.15)",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                              padding: "3px 8px",
                              borderRadius: "6px",
                            }}
                          >
                            {currentLevel}
                          </span>
                          <button
                            type="button"
                            style={{
                              background: "rgba(239, 68, 68, 0.15)",
                              border: "1px solid rgba(239, 68, 68, 0.35)",
                              color: "#f87171",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                            }}
                            onClick={() =>
                              setCourseEdits((prev) => ({ ...prev, [courseName]: "" }))
                            }
                            title="Remove course"
                          >
                            ✕ Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="course-add-row" style={{ marginTop: "12px" }}>
                <select
                  className="course-edit-select"
                  value=""
                  onChange={(e) => handleAddCourseDirect(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">+ Add a course…</option>
                  {addableCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
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
  const inputValue = type === "date" ? formatDateForInput(value) : (value ?? "");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <label className="edit-label" style={{ fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>{label}</label>
      <input
        className="edit-input"
        type={type}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "rgba(15, 23, 42, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "8px",
          color: "#f8fafc",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
          colorScheme: type === "date" ? "dark" : undefined,
        }}
        value={inputValue}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}