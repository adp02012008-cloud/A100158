import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatDateForInput } from "../utils/dateUtils";
import AddCourseModal from "./AddCourseModal";
import ManageCoursesModal from "./ManageCoursesModal";
import UnsavedChangesModal from "./UnsavedChangesModal";

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

  // Sub-modals & UI state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showManageCoursesModal, setShowManageCoursesModal] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [courseFilterSearch, setCourseFilterSearch] = useState("");

  // Snapshot for dirty-state comparison
  const initialSnapshotRef = useRef({
    personal: { ...personalForm },
    form: { ...form },
    admin: { ...adminForm },
    courseEdits: { ...courseEdits },
  });

  const isDirty = useMemo(() => {
    const init = initialSnapshotRef.current;
    if (!init) return false;

    if (personalForm.Name !== init.personal.Name) return true;
    if (personalForm.POSITION !== init.personal.POSITION) return true;
    if (personalForm.CLUSTER !== init.personal.CLUSTER) return true;
    if (personalForm.JOINED !== init.personal.JOINED) return true;

    if (form.LINKEDIN !== init.form.LINKEDIN) return true;
    if (form.GITHUB !== init.form.GITHUB) return true;
    if (String(form["ACTIVITY POINT"]) !== String(init.form["ACTIVITY POINT"])) return true;
    if (String(form["REWARD POINT"]) !== String(init.form["REWARD POINT"])) return true;

    if (adminForm.ROLE !== init.admin.ROLE) return true;
    if (adminForm.STATUS !== init.admin.STATUS) return true;

    const curKeys = Object.keys(courseEdits);
    const initKeys = Object.keys(init.courseEdits);
    if (curKeys.length !== initKeys.length) return true;
    for (const k of curKeys) {
      if (courseEdits[k] !== init.courseEdits[k]) return true;
    }

    return false;
  }, [personalForm, form, adminForm, courseEdits]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowUnsavedModal(true);
    } else {
      onClose();
    }
  };

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
            initialSnapshotRef.current.courseEdits = { ...updated };
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

  const loadCoursesData = useCallback(async () => {
    try {
      const [rulesRes, coursesRes] = await Promise.allSettled([
        apiFetch("/points/rules"),
        apiFetch("/courses"),
      ]);
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
    } catch {
      // Ignore
    } finally {
      setPointsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoursesData();
  }, [loadCoursesData]);

  const courseLevelOptions = useMemo(() => {
    const map = {};
    pointsRows.forEach((row) => {
      const courseName = row.courseName || row.courseId?.name || "";
      if (!courseName) return;
      const levelMap = row.levelPoints || {};
      const levels = Object.keys(levelMap).filter((l) => Number(levelMap[l] || 0) > 0);
      if (levels.length > 0) map[courseName] = levels;
    });
    return map;
  }, [pointsRows]);

  const getLevelsForCourse = (courseName) => {
    const opts = courseLevelOptions[courseName];
    const cur = courseEdits[courseName] || "COMPLETED";
    const set = new Set();
    if (Array.isArray(opts) && opts.length > 0) {
      opts.forEach((l) => set.add(l));
    } else {
      ["LEVEL 0", "LEVEL 1", "LEVEL 2", "LEVEL 3", "COMPLETED"].forEach((l) => set.add(l));
    }
    if (cur) set.add(cur);
    return Array.from(set);
  };

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

  const filteredDisplayedCourses = useMemo(() => {
    if (!courseFilterSearch.trim()) return displayedCourses;
    const q = courseFilterSearch.toLowerCase().trim();
    return displayedCourses.filter((c) => c.toLowerCase().includes(q));
  }, [displayedCourses, courseFilterSearch]);

  const addableCourses = allCoursesList.filter((c) => !isCourseEnrolled(c));

  const handleAddCourseDirect = (selectedCourse) => {
    if (!selectedCourse) return;

    // Automatically resolve default level
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
    <div className="modal" onClick={handleRequestClose}>
      <div className="modal-box edit-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={handleRequestClose}>✕</button>

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
            <h4 className="edit-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <span>Enrolled Courses</span>
              <span style={{ fontSize: "11px", fontWeight: "700", background: "rgba(139, 92, 246, 0.2)", border: "1px solid rgba(167, 139, 250, 0.3)", color: "#c4b5fd", padding: "2px 8px", borderRadius: "10px" }}>
                {displayedCourses.length}
              </span>
            </h4>

            {displayedCourses.length > 4 && (
              <input
                type="text"
                placeholder="🔍 Filter enrolled…"
                value={courseFilterSearch}
                onChange={(e) => setCourseFilterSearch(e.target.value)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#f8fafc",
                  fontSize: "12px",
                  outline: "none",
                  maxWidth: "160px",
                }}
              />
            )}
          </div>

          {pointsLoading ? (
            <p className="edit-note">Loading course data…</p>
          ) : (
            <>
              {displayedCourses.length === 0 ? (
                <p className="edit-note" style={{ margin: "10px 0" }}>No courses enrolled yet. Choose or add a course below.</p>
              ) : (
                <div
                  className="course-edit-list-container"
                  style={{
                    maxHeight: "220px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    background: "rgba(10, 6, 24, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "8px",
                  }}
                >
                  {filteredDisplayedCourses.length === 0 ? (
                    <div style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px" }}>
                      No matching courses found.
                    </div>
                  ) : (
                    filteredDisplayedCourses.map((courseName) => {
                      const currentLevel = courseEdits[courseName] || "COMPLETED";
                      const availableLevels = getLevelsForCourse(courseName);

                      return (
                        <div
                          key={courseName}
                          className="course-compact-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: "rgba(22, 16, 42, 0.75)",
                            border: "1px solid rgba(255, 255, 255, 0.06)",
                            borderRadius: "8px",
                            gap: "8px",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <span
                            style={{
                              color: "#f1f5f9",
                              fontWeight: "500",
                              fontSize: "13px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                            }}
                            title={courseName}
                          >
                            {courseName}
                          </span>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                            {/* Interactive Level Selector */}
                            <select
                              value={currentLevel}
                              onChange={(e) =>
                                setCourseEdits((prev) => ({ ...prev, [courseName]: e.target.value }))
                              }
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "#38bdf8",
                                background: "rgba(56, 189, 248, 0.12)",
                                border: "1px solid rgba(56, 189, 248, 0.35)",
                                borderRadius: "6px",
                                padding: "3px 6px",
                                cursor: "pointer",
                                outline: "none",
                              }}
                              title="Click to change completion level"
                            >
                              {availableLevels.map((lvl) => (
                                <option key={lvl} value={lvl} style={{ background: "#0f172a", color: "#f8fafc" }}>
                                  {lvl}
                                </option>
                              ))}
                            </select>

                            {/* Compact Remove Button */}
                            <button
                              type="button"
                              onClick={() =>
                                setCourseEdits((prev) => ({ ...prev, [courseName]: "" }))
                              }
                              style={{
                                background: "rgba(239, 68, 68, 0.12)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#f87171",
                                borderRadius: "6px",
                                padding: "3px 8px",
                                fontSize: "11px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              title="Remove course"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Add Course & Management Toolbar */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "10px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  className="course-edit-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value === "__CREATE_NEW__") {
                      setShowAddCourseModal(true);
                    } else if (e.target.value) {
                      handleAddCourseDirect(e.target.value);
                    }
                  }}
                  style={{ flex: 1, minWidth: "180px" }}
                >
                  <option value="">+ Add an enrolled course…</option>
                  <option value="__CREATE_NEW__" style={{ color: "#a78bfa", fontWeight: "700" }}>
                    ➕ Create New Course…
                  </option>
                  {addableCourses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddCourseModal(true)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(139, 92, 246, 0.18)",
                    border: "1px solid rgba(167, 139, 250, 0.35)",
                    color: "#c4b5fd",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                  title="Create a course that does not exist in the catalogue"
                >
                  ➕ Add New Course
                </button>

                <button
                  type="button"
                  onClick={() => setShowManageCoursesModal(true)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    color: "#94a3b8",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    whiteSpace: "nowrap",
                  }}
                  title="Manage course catalog and point rules"
                >
                  ⚙️ Manage Courses
                </button>
              </div>

              <p className="edit-note" style={{ marginTop: "8px", fontSize: "11.5px" }}>
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

          <button className="edit-cancel-btn" onClick={handleRequestClose} disabled={saving || deleting}>
            Cancel
          </button>
          <button className="edit-save-btn" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Direct Add New Course Modal */}
      {showAddCourseModal && (
        <AddCourseModal
          onClose={() => setShowAddCourseModal(false)}
          onCreated={(newCourseName) => {
            loadCoursesData().then(() => {
              if (newCourseName && typeof newCourseName === "string") {
                handleAddCourseDirect(newCourseName);
              }
            });
            setShowAddCourseModal(false);
          }}
        />
      )}

      {/* Direct Manage Courses Modal */}
      {showManageCoursesModal && (
        <ManageCoursesModal
          onClose={() => {
            loadCoursesData();
            setShowManageCoursesModal(false);
          }}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onKeepEditing={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          onClose();
        }}
        onSave={async () => {
          setShowUnsavedModal(false);
          await handleSave();
        }}
        saving={saving}
      />
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