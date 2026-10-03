// src/components/ManageCoursesModal.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "../utils/api";
import EditCourseModal from "./EditCourseModal";
import AddCourseModal from "./AddCourseModal";
import BulkImportCoursesModal from "./BulkImportCoursesModal";
import UnifiedLoader from "./UnifiedLoader";

export default function ManageCoursesModal({ onClose }) {
  const [courses, setCourses] = useState([]);
  const [pointRules, setPointRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingCourse, setEditingCourse] = useState(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState("");
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDeleteAllCourses = async () => {
    if (confirmInputText.trim() !== "DELETE ALL COURSES") return;

    setDeletingAll(true);
    try {
      const res = await apiFetch("/courses/all", { method: "DELETE" });
      alert(res?.message || "Successfully deleted all courses!");
      setShowDeleteAllModal(false);
      setConfirmInputText("");
      await loadCourseData();
    } catch (err) {
      alert("Failed to delete all courses: " + err.message);
    } finally {
      setDeletingAll(false);
    }
  };

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
          padding: "24px 28px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "18px",
          background: "#ffffff",
          border: "1px solid #ede7dd",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose} style={{ top: "20px", right: "20px" }}>✕</button>

        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", paddingRight: "36px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h3 className="edit-modal-title" style={{ margin: 0, fontSize: "22px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", color: "#111827", borderBottom: "none", paddingBottom: 0 }}>
              <span>📚</span> Manage System Courses
            </h3>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "6px 0 0 0", lineHeight: "1.5" }}>
              Add new courses, configure dynamic level points, or edit cluster access.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {courses.length > 0 && (
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  setConfirmInputText("");
                  setShowDeleteAllModal(true);
                }}
                style={{
                  fontSize: "13px",
                  padding: "10px 16px",
                  background: "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>🗑️</span> Delete All Courses
              </button>
            )}

            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowBulkImport(true)}
              style={{
                fontSize: "13px",
                padding: "10px 16px",
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.25)",
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
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
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
                color: "#9ca3af",
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
                background: "#fbf9f5",
                border: "1px solid #ede7dd",
                color: "#111827",
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
                  color: "#9ca3af",
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
            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px", marginLeft: "4px" }}>
              Found <strong style={{ color: "#ea580c" }}>{filteredCourses.length}</strong> of {courses.length} courses
            </div>
          )}
        </div>

        {error && <div className="error-banner" style={{ color: "#ef4444", marginBottom: "16px" }}>⚠️ {error}</div>}

        {loading ? (
          <UnifiedLoader
            title="Loading Courses…"
            subtitle="Fetching courses and point criteria from database"
            minHeight="220px"
          />
        ) : courses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: "#fbf9f5", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📚</div>
            <h4 style={{ color: "#111827", margin: "0 0 6px 0", fontSize: "16px" }}>No courses found</h4>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>Click "Add New Course" above to create your first course.</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "#fbf9f5", borderRadius: "12px", border: "1px dashed #d1d5db" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🔍</div>
            <h4 style={{ color: "#111827", margin: "0 0 6px 0", fontSize: "15px" }}>No courses match "{searchQuery}"</h4>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 12px 0" }}>Try checking spelling or search for another keyword.</p>
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
              maxHeight: "calc(90vh - 220px)",
              overflowY: "auto",
              paddingRight: "8px",
              paddingBottom: "8px",
            }}
          >
            {filteredCourses.map((course) => {
              const rule = getRuleForCourse(course);
              const levelMap = rule?.levelPoints || {};

              // Deduplicate and standardize level entries
              let cleanLevels = [];
              if (Array.isArray(course.levels) && course.levels.length > 0) {
                cleanLevels = course.levels.map((lvl, idx) => ({
                  name: lvl.levelName || `Level ${idx}`,
                  pts: lvl.rewardPoints || (levelMap[lvl.levelName] ? Number(levelMap[lvl.levelName]) : 100),
                }));
              } else {
                const seenLevelNums = new Set();
                Object.entries(levelMap).forEach(([k, v]) => {
                  const match = k.match(/level\s*[-–]?\s*([0-9]+)/i);
                  const lvlNum = match ? match[1] : k;
                  if (!seenLevelNums.has(lvlNum)) {
                    seenLevelNums.add(lvlNum);
                    cleanLevels.push({
                      name: match ? `Level ${lvlNum}` : k,
                      pts: v,
                    });
                  }
                });
              }

              const isDeleting = deletingId === course._id;

              return (
                <div
                  key={course._id}
                  style={{
                    padding: "18px 20px",
                    background: "#fbf9f5",
                    borderRadius: "14px",
                    border: "1px solid #ede7dd",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
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
                            color: "#111827",
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
                              background: "#e0e7ff",
                              color: "#4338ca",
                              border: "1px solid #c7d2fe",
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
                              background: "#fef3c7",
                              color: "#b45309",
                              border: "1px solid #fde68a",
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
                          background: "#e0e7ff",
                          color: "#4338ca",
                          border: "1px solid #c7d2fe",
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
                          background: "#fee2e2",
                          color: "#b91c1c",
                          border: "1px solid #fecaca",
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
                      borderTop: "1px solid #ede7dd",
                      marginTop: "2px",
                    }}
                  >
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      {cleanLevels.length > 0 ? (
                        cleanLevels.map((lvl) => (
                          <span
                            key={lvl.name}
                            style={{
                              fontSize: "11px",
                              padding: "4px 10px",
                              background: "#f3f4f6",
                              border: "1px solid #e5e7eb",
                              borderRadius: "6px",
                              color: "#374151",
                              display: "inline-flex",
                              gap: "4px",
                              alignItems: "center",
                            }}
                          >
                            <strong style={{ color: "#111827" }}>{lvl.name}:</strong> {lvl.pts} pts
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: "11px", color: "#6b7280" }}>
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
        <div className="edit-actions" style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #ede7dd", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          <button
            type="button"
            className="edit-cancel-btn"
            onClick={onClose}
            style={{
              padding: "10px 26px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "13px",
              background: "#fbf9f5",
              color: "#374151",
              border: "1px solid #ede7dd",
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

        {/* Two-Step Verification Delete All Modal */}
        {showDeleteAllModal && (
          <div className="modal" onClick={() => setShowDeleteAllModal(false)} style={{ zIndex: 1300 }}>
            <div
              className="modal-box"
              style={{
                maxWidth: "520px",
                width: "90%",
                padding: "26px",
                borderRadius: "18px",
                background: "#ffffff",
                border: "1px solid #fecaca",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
                color: "#111827",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-btn"
                onClick={() => setShowDeleteAllModal(false)}
                style={{ top: "18px", right: "18px" }}
              >
                ✕
              </button>

              <div style={{ textAlign: "center", marginBottom: "18px" }}>
                <span style={{ fontSize: "42px" }}>⚠️</span>
                <h3 style={{ margin: "10px 0 6px 0", color: "#b91c1c", fontSize: "20px", fontWeight: "700" }}>
                  Delete All Courses (Permanent Action)
                </h3>
                <p style={{ fontSize: "13px", color: "#4b5563", lineHeight: "1.5", margin: 0 }}>
                  This will permanently delete all <strong>{courses.length} courses</strong>, point rules, and user course progress from MongoDB Atlas. This action <strong>cannot be undone</strong>.
                </p>
              </div>

              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "20px",
                  fontSize: "12.5px",
                }}
              >
                <div style={{ fontWeight: "700", color: "#b91c1c", marginBottom: "8px" }}>
                  🔒 Step 2 of 2: Security Verification
                </div>
                <label style={{ display: "block", marginBottom: "6px", color: "#374151" }}>
                  Please type <strong style={{ color: "#dc2626" }}>DELETE ALL COURSES</strong> below to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder="DELETE ALL COURSES"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#ffffff",
                    border: "1px solid #fca5a5",
                    color: "#991b1b",
                    fontWeight: "700",
                    fontSize: "13px",
                    outline: "none",
                    letterSpacing: "0.05em",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setShowDeleteAllModal(false)}
                  disabled={deletingAll}
                  style={{ fontSize: "13px", padding: "10px 18px", borderRadius: "10px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={handleDeleteAllCourses}
                  disabled={confirmInputText.trim() !== "DELETE ALL COURSES" || deletingAll}
                  style={{
                    fontSize: "13px",
                    padding: "10px 20px",
                    background: confirmInputText.trim() === "DELETE ALL COURSES"
                      ? "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"
                      : "#fee2e2",
                    color: confirmInputText.trim() === "DELETE ALL COURSES" ? "#fff" : "#991b1b",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    cursor: confirmInputText.trim() === "DELETE ALL COURSES" && !deletingAll ? "pointer" : "not-allowed",
                    opacity: confirmInputText.trim() === "DELETE ALL COURSES" && !deletingAll ? 1 : 0.6,
                  }}
                >
                  {deletingAll ? "Deleting All Courses..." : "💥 CONFIRM & DELETE ALL COURSES"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
