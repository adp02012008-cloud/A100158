// src/pages/Courses.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import UnifiedLoader from "../components/UnifiedLoader";
import "./Courses.css";

function getCategoryBannerClass(category = "") {
  const cat = String(category).toLowerCase().trim();
  if (cat.includes("software") || cat.includes("code") || cat.includes("programming") || cat.includes("web")) {
    return "banner-software";
  }
  if (cat.includes("hardware") || cat.includes("electronics") || cat.includes("circuit") || cat.includes("iot")) {
    return "banner-hardware";
  }
  if (cat.includes("general") || cat.includes("skill") || cat.includes("aptitude")) {
    return "banner-general";
  }
  if (cat.includes("advanced") || cat.includes("ai") || cat.includes("machine learning") || cat.includes("deep learning")) {
    return "banner-advanced";
  }
  if (cat.includes("beginner") || cat.includes("foundation") || cat.includes("basics")) {
    return "banner-beginner";
  }
  return "banner-default";
}

function getInitials(text = "") {
  return text
    .split(/\s+/)
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

export default function Courses({ search: initialSearch = "" }) {
  const { auth, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("available"); // "available" | "my-courses"
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name"); // "name" | "category" | "progress" | "levels"

  // Modals
  const [detailCourse, setDetailCourse] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    category: "Software",
    customCategory: "",
    description: "",
    clusterAccess: "Both",
    levels: [
      {
        levelNumber: 0,
        levelName: "Level 0",
        rewardPoints: 100,
        prerequisites: "None",
        assessmentType: "MCQ",
        topicsText: "1. Overview & Fundamentals\n2. Core Concepts\n3. Practical Demonstration",
      },
      {
        levelNumber: 1,
        levelName: "Level 1",
        rewardPoints: 300,
        prerequisites: "Level 0",
        assessmentType: "Manual Grading",
        topicsText: "1. Advanced Modeling\n2. Real-World Case Studies\n3. Final Project Submission",
      },
    ],
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesRes, progressRes] = await Promise.all([
        apiFetch("/courses"),
        apiFetch("/courses/progress"),
      ]);

      if (coursesRes?.courses) {
        setCourses(coursesRes.courses);
      }
      if (progressRes?.progress) {
        setUserProgress(progressRes.progress);
      }
    } catch (err) {
      console.error("Failed to load courses data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Map user's current progress for each course
  const progressMap = useMemo(() => {
    const map = {};
    (userProgress || []).forEach((p) => {
      const cId = String(p.courseId?._id || p.courseId);
      const cName = (p.courseId?.name || "").toLowerCase().trim();
      if (cId) map[cId] = p;
      if (cName) map[cName] = p;
    });
    return map;
  }, [userProgress]);

  // Extract category options
  const categoryOptions = useMemo(() => {
    const defaultCats = ["Software", "Hardware", "GENERAL Skill", "Advanced", "Beginner"];
    const dynamicCats = courses.map((c) => c.category).filter(Boolean);
    return Array.from(new Set(["All", ...defaultCats, ...dynamicCats]));
  }, [courses]);

  // Calculate course completion progress
  const getCourseProgress = useCallback(
    (course) => {
      const p = progressMap[String(course._id)] || progressMap[(course.name || "").toLowerCase().trim()];
      if (!p || !p.currentLevel) {
        return { completedCount: 0, totalLevels: (course.levels || []).length || 2, percent: 0, currentLevel: null };
      }

      const levels = course.levels || [];
      const totalLevels = Math.max(levels.length, 1);
      const current = String(p.currentLevel).toUpperCase().trim();

      // Find index in course levels
      let idx = levels.findIndex(
        (l) =>
          String(l.levelName).toUpperCase().trim() === current ||
          current.includes(String(l.levelName).toUpperCase().trim()) ||
          (l.levelNumber !== undefined && current.includes(String(l.levelNumber)))
      );

      let completedCount = idx !== -1 ? idx + 1 : 1;
      if (current === "COMPLETED") completedCount = totalLevels;

      const percent = Math.min(100, Math.round((completedCount / totalLevels) * 100));
      return { completedCount, totalLevels, percent, currentLevel: p.currentLevel };
    },
    [progressMap]
  );

  // Filtered & Sorted Courses
  const filteredCourses = useMemo(() => {
    let list = courses;

    // Tab Filter
    if (activeTab === "my-courses") {
      list = list.filter((c) => {
        const p = progressMap[String(c._id)] || progressMap[(c.name || "").toLowerCase().trim()];
        return Boolean(p && p.currentLevel && !["NULL", "NIL", ""].includes(String(p.currentLevel).toUpperCase()));
      });
    }

    // Category Filter
    if (selectedCategory !== "All") {
      list = list.filter(
        (c) =>
          (c.category || "").toLowerCase() === selectedCategory.toLowerCase() ||
          (selectedCategory === "Advanced" && (c.name || "").toLowerCase().includes("advanced")) ||
          (selectedCategory === "Beginner" && (c.name || "").toLowerCase().includes("beginner"))
      );
    }

    // Search Filter
    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(term) ||
          (c.category || "").toLowerCase().includes(term) ||
          (c.description || "").toLowerCase().includes(term)
      );
    }

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "category") {
        return (a.category || "").localeCompare(b.category || "");
      }
      if (sortBy === "levels") {
        return (b.levels?.length || 0) - (a.levels?.length || 0);
      }
      if (sortBy === "progress") {
        const progA = getCourseProgress(a).percent;
        const progB = getCourseProgress(b).percent;
        return progB - progA;
      }
      return 0;
    });
  }, [courses, activeTab, selectedCategory, search, sortBy, progressMap, getCourseProgress]);

  // Handle Mark Level Completed
  const handleMarkLevelCompleted = async (course, levelObj) => {
    try {
      setActionLoading(true);
      const targetUserId = currentUser?._id || auth.userId;
      const res = await apiFetch("/courses/progress/update", {
        method: "POST",
        body: {
          userId: targetUserId,
          courseId: course._id,
          newLevel: levelObj.levelName || `Level ${levelObj.levelNumber}`,
          pointsEarned: levelObj.rewardPoints || 100,
        },
      });

      if (res?.success) {
        await loadData();
        if (detailCourse && detailCourse._id === course._id) {
          setDetailCourse({ ...course });
        }
      }
    } catch (err) {
      alert("Failed to update progress: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (course, e) => {
    e.stopPropagation();
    setEditCourse(course);
    setFormData({
      name: course.name,
      category: ["Software", "Hardware", "GENERAL Skill", "Advanced", "Beginner"].includes(course.category)
        ? course.category
        : "Other",
      customCategory: ["Software", "Hardware", "GENERAL Skill", "Advanced", "Beginner"].includes(course.category)
        ? ""
        : course.category,
      description: course.description || "",
      clusterAccess: course.clusterAccess || "Both",
      levels: (course.levels || []).map((lvl, idx) => ({
        levelNumber: lvl.levelNumber !== undefined ? lvl.levelNumber : idx,
        levelName: lvl.levelName || `Level ${idx}`,
        rewardPoints: lvl.rewardPoints || 100,
        prerequisites: lvl.prerequisites || (idx > 0 ? `Level ${idx - 1}` : "None"),
        assessmentType: lvl.assessmentType || "MCQ",
        topicsText: Array.isArray(lvl.topics) ? lvl.topics.join("\n") : "",
      })),
    });
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditCourse(null);
    setFormData({
      name: "",
      category: "Software",
      customCategory: "",
      description: "",
      clusterAccess: "Both",
      levels: [
        {
          levelNumber: 0,
          levelName: "Level 0",
          rewardPoints: 100,
          prerequisites: "None",
          assessmentType: "MCQ",
          topicsText: "1. Introduction & Overview\n2. Fundamentals\n3. Practice Questions",
        },
        {
          levelNumber: 1,
          levelName: "Level 1",
          rewardPoints: 300,
          prerequisites: "Level 0",
          assessmentType: "Manual Grading",
          topicsText: "1. Advanced Problem Solving\n2. Case Studies\n3. Final Assessment",
        },
      ],
    });
    setShowAddCourse(true);
  };

  // Save Course (Create or Edit)
  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Course name is required");
      return;
    }

    const finalCategory =
      formData.category === "Other" && formData.customCategory.trim()
        ? formData.customCategory.trim()
        : formData.category;

    const formattedLevels = formData.levels.map((lvl, idx) => ({
      levelNumber: idx,
      levelName: lvl.levelName.trim() || `Level ${idx}`,
      rewardPoints: Number(lvl.rewardPoints) || 100,
      prerequisites: lvl.prerequisites.trim() || (idx > 0 ? `Level ${idx - 1}` : "None"),
      assessmentType: lvl.assessmentType || "MCQ",
      topics: (lvl.topicsText || "")
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean),
    }));

    try {
      setActionLoading(true);
      if (editCourse) {
        await apiFetch(`/courses/${editCourse._id}`, {
          method: "PUT",
          body: {
            name: formData.name.trim(),
            category: finalCategory,
            description: formData.description.trim(),
            clusterAccess: formData.clusterAccess,
            levels: formattedLevels,
          },
        });
      } else {
        await apiFetch("/courses", {
          method: "POST",
          body: {
            name: formData.name.trim(),
            category: finalCategory,
            description: formData.description.trim(),
            clusterAccess: formData.clusterAccess,
            levels: formattedLevels,
          },
        });
      }

      setShowAddCourse(false);
      setEditCourse(null);
      await loadData();
    } catch (err) {
      alert("Failed to save course: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const myCoursesCount = useMemo(() => {
    return courses.filter((c) => {
      const p = progressMap[String(c._id)] || progressMap[(c.name || "").toLowerCase().trim()];
      return Boolean(p && p.currentLevel && !["NULL", "NIL", ""].includes(String(p.currentLevel).toUpperCase()));
    }).length;
  }, [courses, progressMap]);

  if (loading) {
    return (
      <UnifiedLoader
        title="Loading Courses…"
        subtitle="Retrieving syllabus, levels & dynamic reward points"
        minHeight="450px"
      />
    );
  }

  return (
    <div className="courses-container">
      {/* Header Section */}
      <div className="courses-header-section">
        <div className="courses-title-row">
          <div>
            <h1 className="courses-main-title">
              <span>📚</span> {activeTab === "available" ? "Courses Available" : "My Enrolled & Completed Courses"}
            </h1>
            <p className="courses-count-subtitle">
              Showing {filteredCourses.length} of {activeTab === "available" ? courses.length : myCoursesCount} courses
            </p>
          </div>

          <button type="button" className="btn-add-course" onClick={handleOpenAdd}>
            <span>➕</span> Add New Course
          </button>
        </div>

        {/* Navigation Tabs (Courses Available vs My Courses) */}
        <div className="courses-nav-tabs">
          <button
            type="button"
            className={`courses-tab-btn ${activeTab === "available" ? "active" : ""}`}
            onClick={() => setActiveTab("available")}
          >
            <span>📖 Courses Available</span>
            <span className="courses-tab-badge">{courses.length}</span>
          </button>

          <button
            type="button"
            className={`courses-tab-btn ${activeTab === "my-courses" ? "active" : ""}`}
            onClick={() => setActiveTab("my-courses")}
          >
            <span>🎓 My Courses</span>
            <span className="courses-tab-badge">{myCoursesCount}</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Sorting */}
      <div className="courses-toolbar">
        <div className="courses-search-wrap">
          <span className="courses-search-icon">🔍</span>
          <input
            type="text"
            className="courses-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by name or category…"
          />
          {search && (
            <button
              type="button"
              className="courses-search-clear"
              onClick={() => setSearch("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="courses-filters-wrap">
          <select
            className="courses-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Category"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat}
              </option>
            ))}
          </select>

          <select
            className="courses-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort Courses"
          >
            <option value="name">Sort by Name</option>
            <option value="category">Sort by Category</option>
            <option value="progress">Sort by Progress</option>
            <option value="levels">Sort by Levels</option>
          </select>
        </div>
      </div>

      {/* Course Cards Grid (Styled Typography - NO stock images!) */}
      {filteredCourses.length === 0 ? (
        <div className="courses-empty-state">
          <div className="empty-icon-lg">🔍</div>
          <h3 style={{ color: "#f8fafc", margin: "0 0 8px 0" }}>No matching courses found</h3>
          <p style={{ color: "#94a3b8", fontSize: "13.5px", margin: 0 }}>
            {activeTab === "my-courses"
              ? "You have not completed or enrolled in any courses yet. Switch to 'Courses Available' to explore and complete courses!"
              : "Try adjusting your search or category filter to find what you need."}
          </p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map((course) => {
            const prog = getCourseProgress(course);
            const bannerClass = getCategoryBannerClass(course.category);
            const initials = getInitials(course.name);
            const totalLevels = (course.levels || []).length || 2;
            const totalRewardPoints = (course.levels || []).reduce(
              (sum, lvl) => sum + (Number(lvl.rewardPoints) || 100),
              0
            );

            return (
              <div
                key={course._id}
                className="course-card"
                onClick={() => setDetailCourse(course)}
              >
                {/* Visual Banner - Text & Gradient Driven (No stock image) */}
                <div className={`course-card-banner ${bannerClass}`}>
                  <div className="banner-watermark">{initials}</div>
                  <div className="course-card-topbar">
                    <span className="course-card-cat-badge">{course.category || "General"}</span>
                    <span className="course-card-cluster-badge">🚀 {course.clusterAccess || "Both"}</span>
                  </div>
                  <h3 className="course-card-title">{course.name}</h3>
                </div>

                {/* Card Body */}
                <div className="course-card-body">
                  <div>
                    <div className="course-card-meta-row">
                      <span className="course-levels-indicator">
                        📑 Levels: {totalLevels}
                      </span>
                      <span className="course-rewards-indicator">
                        🪙 {totalRewardPoints} pts
                      </span>
                    </div>

                    {/* Visual Progress Track */}
                    <div className="course-card-progress-wrap">
                      <div className="course-progress-label">
                        <span>
                          {prog.percent === 100
                            ? "Completed 🎉"
                            : `Progress: ${prog.completedCount}/${prog.totalLevels} levels (${prog.percent}%)`}
                        </span>
                        {prog.currentLevel && (
                          <strong style={{ color: "#34d399" }}>{prog.currentLevel}</strong>
                        )}
                      </div>
                      <div className="course-progress-track">
                        <div
                          className="course-progress-fill"
                          style={{ width: `${prog.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="course-card-actions">
                    <button
                      type="button"
                      className="course-btn-details"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailCourse(course);
                      }}
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      className="course-btn-edit"
                      onClick={(e) => handleOpenEdit(course, e)}
                      title="Edit Course"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================
          COURSE DETAILS MODAL (Modeled after PCDP Reference)
         =================================================== */}
      {detailCourse && (
        <div className="course-details-modal-overlay" onClick={() => setDetailCourse(null)}>
          <div className="course-details-modal-box" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="course-details-close-btn"
              onClick={() => setDetailCourse(null)}
            >
              ✕
            </button>

            <div className="course-details-header">
              <h2 className="course-details-title">{detailCourse.name}</h2>
              <p className="course-details-desc">
                {detailCourse.description || "Comprehensive modular learning path with real-world evaluations and graded milestones."}
              </p>
              <div className="course-details-pills">
                <span className="course-card-cat-badge">{detailCourse.category || "General"}</span>
                <span className="course-card-cluster-badge">Levels: {(detailCourse.levels || []).length}</span>
                <span className="course-rewards-indicator">
                  Total Rewards: {(detailCourse.levels || []).reduce((s, l) => s + (Number(l.rewardPoints) || 100), 0)} pts
                </span>
              </div>
            </div>

            <div className="course-details-content">
              {(detailCourse.levels || []).map((lvl, index) => {
                const currentProgress = getCourseProgress(detailCourse);
                const isCompleted =
                  currentProgress.completedCount > index || currentProgress.percent === 100;

                const topicsList = Array.isArray(lvl.topics) && lvl.topics.length > 0
                  ? lvl.topics
                  : [
                      `1. Introduction to ${detailCourse.name}`,
                      `2. Core Technical Concepts & Implementation`,
                      `3. Practical Evaluation & Problem Solving`,
                    ];

                return (
                  <div key={index} className="level-block">
                    <div className="level-block-head">
                      <div className="level-title-text">
                        <div className="level-badge-num">{index + 1}</div>
                        <span>
                          {detailCourse.name} - {lvl.levelName || `Level ${index}`}
                        </span>
                      </div>
                      {isCompleted && (
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: "rgba(16, 185, 129, 0.2)",
                            color: "#34d399",
                            fontWeight: "700",
                            border: "1px solid rgba(16, 185, 129, 0.4)",
                          }}
                        >
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    <div className="level-block-body">
                      {/* Left: Syllabus Topics List */}
                      <div className="level-topics-list">
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "4px" }}>
                          Syllabus / Topics
                        </div>
                        {topicsList.map((topic, tIdx) => (
                          <div key={tIdx} className="topic-item">
                            {topic}
                          </div>
                        ))}
                      </div>

                      {/* Right: Meta Details */}
                      <div className="level-meta-side">
                        <div className="level-meta-row">
                          <span className="level-meta-label">With Rewards</span>
                          <span className="level-meta-value" style={{ color: "#fbbf24" }}>
                            🪙 {lvl.rewardPoints || 100} Points
                          </span>
                        </div>

                        <div className="level-meta-row">
                          <span className="level-meta-label">Pre Request</span>
                          <span className="level-meta-value" style={{ fontSize: "12.5px" }}>
                            {lvl.prerequisites || (index > 0 ? `Level ${index - 1}` : "None")}
                          </span>
                        </div>

                        <div className="level-meta-row">
                          <span className="level-meta-label">Assessment Type</span>
                          <span className="level-meta-value">{lvl.assessmentType || "MCQ"}</span>
                        </div>

                        <button
                          type="button"
                          className={`btn-mark-level ${isCompleted ? "is-completed" : ""}`}
                          disabled={actionLoading || isCompleted}
                          onClick={() => handleMarkLevelCompleted(detailCourse, lvl)}
                        >
                          {isCompleted ? "✓ Completed" : actionLoading ? "Saving…" : "Mark Completed"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          ADD / EDIT COURSE MODAL
         =================================================== */}
      {(showAddCourse || editCourse) && (
        <div
          className="course-form-modal"
          onClick={() => {
            setShowAddCourse(false);
            setEditCourse(null);
          }}
        >
          <div className="course-form-box" onClick={(e) => e.stopPropagation()}>
            <div className="course-form-head">
              <h3>{editCourse ? "✏️ Edit Course" : "➕ Add New Course"}</h3>
              <button
                type="button"
                className="course-details-close-btn"
                onClick={() => {
                  setShowAddCourse(false);
                  setEditCourse(null);
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse}>
              <div className="course-form-body">
                <div className="form-field-group">
                  <label>Course Title *</label>
                  <input
                    type="text"
                    className="form-input-text"
                    placeholder="e.g. Advanced Modelling & Simulation"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field-group">
                  <label>Category *</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                    <option value="GENERAL Skill">GENERAL Skill</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Other">Other (Custom Category)</option>
                  </select>
                </div>

                {formData.category === "Other" && (
                  <div className="form-field-group">
                    <label>Custom Category Name *</label>
                    <input
                      type="text"
                      className="form-input-text"
                      placeholder="e.g. Data Science, Robotics"
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      required
                    />
                  </div>
                )}

                <div className="form-field-group">
                  <label>Description</label>
                  <textarea
                    className="form-textarea"
                    rows={2}
                    placeholder="Brief explanation of the course curriculum"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="form-field-group">
                  <label>Cluster Access</label>
                  <select
                    className="form-select"
                    value={formData.clusterAccess}
                    onChange={(e) => setFormData({ ...formData, clusterAccess: e.target.value })}
                  >
                    <option value="Both">Both (Core & Computer Cluster)</option>
                    <option value="Core">Core Only</option>
                    <option value="Computer Cluster">Computer Cluster Only</option>
                  </select>
                </div>

                {/* Dynamic Levels Configuration */}
                <div style={{ marginTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <label style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
                      Course Levels & Reward Points ({formData.levels.length})
                    </label>
                  </div>

                  {formData.levels.map((lvl, lIdx) => (
                    <div key={lIdx} className="level-builder-card">
                      <div className="level-builder-head">
                        <strong style={{ color: "#a5b4fc", fontSize: "13px" }}>
                          Level {lIdx + 1}: {lvl.levelName || `Level ${lIdx}`}
                        </strong>
                        {formData.levels.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove-level"
                            onClick={() => {
                              const updated = formData.levels.filter((_, i) => i !== lIdx);
                              setFormData({ ...formData, levels: updated });
                            }}
                          >
                            🗑️ Remove
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="form-field-group">
                          <label>Level Name</label>
                          <input
                            type="text"
                            className="form-input-text"
                            value={lvl.levelName}
                            onChange={(e) => {
                              const updated = [...formData.levels];
                              updated[lIdx].levelName = e.target.value;
                              setFormData({ ...formData, levels: updated });
                            }}
                          />
                        </div>

                        <div className="form-field-group">
                          <label>Reward Points</label>
                          <input
                            type="number"
                            className="form-input-text"
                            value={lvl.rewardPoints}
                            onChange={(e) => {
                              const updated = [...formData.levels];
                              updated[lIdx].rewardPoints = e.target.value;
                              setFormData({ ...formData, levels: updated });
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="form-field-group">
                          <label>Pre Request</label>
                          <input
                            type="text"
                            className="form-input-text"
                            placeholder="e.g. None or Level 0"
                            value={lvl.prerequisites}
                            onChange={(e) => {
                              const updated = [...formData.levels];
                              updated[lIdx].prerequisites = e.target.value;
                              setFormData({ ...formData, levels: updated });
                            }}
                          />
                        </div>

                        <div className="form-field-group">
                          <label>Assessment Type</label>
                          <select
                            className="form-select"
                            value={lvl.assessmentType}
                            onChange={(e) => {
                              const updated = [...formData.levels];
                              updated[lIdx].assessmentType = e.target.value;
                              setFormData({ ...formData, levels: updated });
                            }}
                          >
                            <option value="MCQ">MCQ</option>
                            <option value="Manual Grading">Manual Grading</option>
                            <option value="Practical">Practical</option>
                            <option value="Project">Project</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-field-group">
                        <label>Syllabus Topics (One per line)</label>
                        <textarea
                          className="form-textarea"
                          rows={3}
                          placeholder="1. Topic one&#10;2. Topic two&#10;3. Topic three"
                          value={lvl.topicsText}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[lIdx].topicsText = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn-add-level-row"
                    onClick={() => {
                      const nextNum = formData.levels.length;
                      setFormData({
                        ...formData,
                        levels: [
                          ...formData.levels,
                          {
                            levelNumber: nextNum,
                            levelName: `Level ${nextNum}`,
                            rewardPoints: (nextNum + 1) * 100,
                            prerequisites: `Level ${nextNum - 1}`,
                            assessmentType: nextNum % 2 === 0 ? "MCQ" : "Manual Grading",
                            topicsText: "1. Advanced Topic\n2. Implementation & Project",
                          },
                        ],
                      });
                    }}
                  >
                    ➕ Add Another Level
                  </button>
                </div>
              </div>

              <div className="course-form-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setShowAddCourse(false);
                    setEditCourse(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={actionLoading}>
                  {actionLoading ? "Saving…" : editCourse ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
