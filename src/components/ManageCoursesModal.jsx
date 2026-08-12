// src/components/ManageCoursesModal.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "../utils/api";
import EditCourseModal from "./EditCourseModal";
import AddCourseModal from "./AddCourseModal";
import BulkImportCoursesModal from "./BulkImportCoursesModal";

export default function ManageCoursesModal({ onClose }) {
  const [courses, setCourses] = useState([]);
  const [pointRules, setPointRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCourse, setEditingCourse] = useState(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const term = searchQuery.toLowerCase().trim();
    return courses.filter((c) => {
      const matchName = (c.name || "").toLowerCase().includes(term);
      const matchCategory = (c.category || "").toLowerCase().includes(term);
      const matchCluster = (c.clusterAccess || "").toLowerCase().includes(term);
      const matchDesc = (c.description || "").toLowerCase().includes(term);
      return matchName || matchCategory || matchCluster || matchDesc;
    });
  }, [courses, searchQuery]);

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-box edit-modal-box"
        style={{
          maxWidth: "840px",
          width: "95%",
          padding: "28px",
          borderRadius: "18px",
          background: "#131127",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose} style={{ top: "20px", right: "20px" }}>✕</button>

        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", paddingRight: "36px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h3 className="edit-modal-title" style={{ margin: 0, fontSize: "22px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", color: "#f8fafc" }}>
              <span>📚</span> Manage System Courses
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "6px 0 0 0", lineHeight: "1.5" }}>
              Add new courses, configure dynamic level points, or edit cluster access.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowBulkImport(true)}
              style={{
                fontSize: "13px",
                padding: "10px 16px",
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                boxShadow: "0 4px 14px rgba(124, 58, 237, 0.3)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>📤</span> Bulk Import (CSV / JSON)
            </button>

            <button
              type="button"
              className="btn primary"
              onClick={() => setShowAddCourse(true)}
              style={{
                fontSize: "13px",
                padding: "10px 18px",
                background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>➕</span> Add New Course
            </button>
          </div>
        </div>

        {/* Search Bar Input */}
        <div style={{ marginBottom: "18px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "100%",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "14px",
                fontSize: "15px",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              type="text"
              className="edit-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course name, category, or cluster..."
              style={{
                width: "100%",
                paddingLeft: "42px",
                paddingRight: searchQuery ? "38px" : "14px",
                paddingTop: "10px",
                paddingBottom: "10px",
                fontSize: "13.5px",
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#f8fafc",
                outline: "none",
                transition: "all 0.2s ease",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "14px",
                  cursor: "pointer",
                  padding: "4px",
                }}
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px", marginLeft: "4px" }}>
              Found <strong style={{ color: "#a5b4fc" }}>{filteredCourses.length}</strong> of {courses.length} courses
            </div>
          )}
        </div>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "16px" }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px 20px" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⏳</div>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>Loading courses from database...</p>
          </div>
        ) : courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📚</div>
            <h4 style={{ color: "#f8fafc", margin: "0 0 6px 0", fontSize: "16px" }}>No courses found</h4>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0 }}>Click "Add New Course" above to create your first course.</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
            <h4 style={{ color: "#f8fafc", margin: "0 0 6px 0", fontSize: "15px" }}>No courses match "{searchQuery}"</h4>
            <p style={{ color: "#94a3b8", fontSize: "13px", margin: "0 0 12px 0" }}>Try checking spelling or search for another keyword.</p>
            <button
              type="button"
              className="btn secondary"
              onClick={() => setSearchQuery("")}
              style={{ fontSize: "12px", padding: "6px 14px", borderRadius: "8px" }}
            >
              Clear Search Filter
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              maxHeight: "460px",
              overflowY: "auto",
              paddingRight: "8px",
            }}
          >
            {filteredCourses.map((course) => {
              const rule = getRuleForCourse(course);
              const levelMap = rule?.levelPoints || {};
              const levelEntries = Object.entries(levelMap);
              const isDeleting = deletingId === course._id;

              return (
                <div
                  key={course._id}
                  style={{
                    padding: "18px 20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "14px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* Top Row: Course Name + Badges on Left, Actions Pinned at Top Right */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Left: Title & Main Category/Cluster Pills */}
                    <div style={{ flex: "1 1 300px", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: "17px",
                            fontWeight: "700",
                            color: "#f8fafc",
                            wordBreak: "break-word",
                            lineHeight: "1.3",
                          }}
                        >
                          {course.name}
                        </h4>
                        
                        <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "3px 10px",
                              borderRadius: "20px",
                              background: "rgba(99, 102, 241, 0.18)",
                              color: "#a5b4fc",
                              border: "1px solid rgba(99, 102, 241, 0.3)",
                              fontWeight: "600",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {course.category || "General"}
                          </span>

                          <span
                            style={{
                              fontSize: "11px",
                              padding: "3px 10px",
                              borderRadius: "20px",
                              background: "rgba(234, 179, 8, 0.15)",
                              color: "#fde047",
                              border: "1px solid rgba(234, 179, 8, 0.3)",
                              fontWeight: "600",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            🚀 {course.clusterAccess || "Both"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons (Edit & Delete) Pinned at Top Right */}
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                      <button
                        type="button"
                        style={{
                          fontSize: "12px",
                          padding: "7px 14px",
                          background: "rgba(99, 102, 241, 0.15)",
                          color: "#818cf8",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          borderRadius: "8px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                        onClick={() => setEditingCourse(course)}
                      >
                        <span>✏️</span> Edit Course
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        style={{
                          fontSize: "12px",
                          padding: "7px 14px",
                          background: "rgba(239, 68, 68, 0.12)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "8px",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          opacity: isDeleting ? 0.6 : 1,
                        }}
                        onClick={() => handleDeleteCourse(course)}
                      >
                        <span>🗑️</span> {isDeleting ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Level Points Badges */}
                  <div
                    style={{
                      paddingTop: "10px",
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      marginTop: "2px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {levelEntries.length > 0 ? (
                        levelEntries.map(([lvlName, pts]) => (
                          <span
                            key={lvlName}
                            style={{
                              fontSize: "11px",
                              padding: "3px 9px",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "6px",
                              color: "#cbd5e1",
                              display: "inline-flex",
                              gap: "4px",
                              alignItems: "center",
                            }}
                          >
                            <strong style={{ color: "#e2e8f0" }}>{lvlName}:</strong> {pts} pts
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          No level rules configured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="edit-actions" style={{ marginTop: "22px", display: "flex", justifyContent: "flex-end" }}>
          <button
            className="edit-cancel-btn"
            onClick={onClose}
            style={{
              padding: "9px 24px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "13px",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#cbd5e1",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              cursor: "pointer",
            }}
          >
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

        {/* Bulk Import Modal */}
        {showBulkImport && (
          <BulkImportCoursesModal
            onClose={() => setShowBulkImport(false)}
            onSuccess={() => {
              setShowBulkImport(false);
              loadCourseData();
            }}
          />
        )}
      </div>
    </div>
  );
}
