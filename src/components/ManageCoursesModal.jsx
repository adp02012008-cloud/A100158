// src/components/ManageCoursesModal.jsx
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../utils/api";
import EditCourseModal from "./EditCourseModal";
import AddCourseModal from "./AddCourseModal";

export default function ManageCoursesModal({ onClose }) {
  const [courses, setCourses] = useState([]);
  const [pointRules, setPointRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCourse, setEditingCourse] = useState(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [courseRes, rulesRes] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/points/rules").catch(() => ({ rules: [] })),
      ]);

      if (courseRes?.courses) {
        setCourses(courseRes.courses);
      }
      if (rulesRes?.rules) {
        setPointRules(rulesRes.rules);
      }
    } catch (err) {
      console.error("Error loading course management data:", err);
      setError(err.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourseData();
  }, [loadCourseData]);

  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`⚠️ ARE YOU SURE?\n\nThis will permanently delete '${course.name}' from MongoDB Atlas.\n\nThis action cannot be undone.`)) {
      return;
    }

    setDeletingId(course._id);
    try {
      await apiFetch(`/courses/${course._id}`, { method: "DELETE" });
      await loadCourseData();
    } catch (err) {
      alert("Failed to delete course: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const getRuleForCourse = (course) => {
    return pointRules.find(
      (r) =>
        String(r.courseId?._id || r.courseId) === String(course._id) ||
        r.courseName === course.name
    );
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box edit-modal-box" style={{ maxWidth: "800px" }} onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingRight: "40px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h3 className="edit-modal-title" style={{ margin: 0 }}>📚 Manage System Courses</h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0 0" }}>
              Add new courses, edit level points, or delete courses.
            </p>
          </div>

          <button
            className="btn primary"
            onClick={() => setShowAddCourse(true)}
            style={{
              fontSize: "13px",
              padding: "8px 16px",
              background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
              cursor: "pointer",
            }}
          >
            ➕ Add New Course
          </button>
        </div>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "28px", marginBottom: "10px" }}>⏳</div>
            <p style={{ color: "#94a3b8" }}>Loading courses from MongoDB Atlas...</p>
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>📚</div>
            <h4>No courses found</h4>
            <p style={{ color: "#94a3b8" }}>Click "Add New Course" above to create your first course.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "480px", overflowY: "auto", paddingRight: "4px" }}>
            {courses.map((course) => {
              const rule = getRuleForCourse(course);
              const levelMap = rule?.levelPoints || {};
              const levelEntries = Object.entries(levelMap);
              const isDeleting = deletingId === course._id;

              return (
                <div
                  key={course._id}
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
                      <strong style={{ fontSize: "16px", color: "#f8fafc" }}>{course.name}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "rgba(99, 102, 241, 0.2)",
                          color: "#818cf8",
                          fontWeight: "600",
                        }}
                      >
                        {course.category || "General"}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "rgba(234, 179, 8, 0.15)",
                          color: "#eab308",
                        }}
                      >
                        🚀 {course.clusterAccess || "Both"}
                      </span>
                    </div>

                    {/* Level Points Badges */}
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                      {levelEntries.length > 0 ? (
                        levelEntries.map(([lvlName, pts]) => (
                          <span
                            key={lvlName}
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              background: "rgba(255,255,255,0.06)",
                              borderRadius: "6px",
                              color: "#cbd5e1",
                            }}
                          >
                            <strong>{lvlName}</strong>: {pts} pts
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "11px", color: "#64748b" }}>No level rules configured</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      className="btn primary"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      onClick={() => setEditingCourse(course)}
                    >
                      ✏️ Edit Course
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
                      onClick={() => handleDeleteCourse(course)}
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

        {/* Edit Course Modal */}
        {editingCourse && (
          <EditCourseModal
            course={editingCourse}
            pointRule={getRuleForCourse(editingCourse)}
            onClose={() => setEditingCourse(null)}
            onSaved={() => {
              setEditingCourse(null);
              loadCourseData();
            }}
          />
        )}

        {/* Add Course Modal */}
        {showAddCourse && (
          <AddCourseModal
            onClose={() => setShowAddCourse(false)}
            onCreated={() => {
              setShowAddCourse(false);
              loadCourseData();
            }}
          />
        )}
      </div>
    </div>
  );
}
