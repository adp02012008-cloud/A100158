// src/pages/Courses.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import UnifiedLoader from "../components/UnifiedLoader";
import "./Courses.css";

// Dynamic SVG illustrated banners tailored to course category / topic
function CourseBannerGraphic({ course }) {
  const name = (course.name || "").toLowerCase();
  const category = (course.category || "").toLowerCase();

  // Pick themed visual
  let theme = "general";
  if (name.includes("system admin") || name.includes("backup") || name.includes("storage")) {
    theme = "sysadmin";
  } else if (name.includes("weld") || name.includes("assembly") || name.includes("manufacturing") || name.includes("prototype")) {
    theme = "welding";
  } else if (name.includes("plc") || name.includes("automation") || name.includes("industrial")) {
    theme = "plc";
  } else if (name.includes("network") || name.includes("cyber") || name.includes("cloud")) {
    theme = "networking";
  } else if (name.includes("c++") || name.includes("c programming") || name.includes("code debug")) {
    theme = "cpp";
  } else if (name.includes("python") || name.includes("machine learning") || name.includes("deep learning") || name.includes("ai")) {
    theme = "python";
  } else if (name.includes("java") && !name.includes("script")) {
    theme = "java";
  } else if (name.includes("ui") || name.includes("ux") || name.includes("creative")) {
    theme = "uiux";
  } else if (name.includes("circuit") || name.includes("analog") || name.includes("digital electronic") || name.includes("vlsi") || name.includes("pcb")) {
    theme = "electronics";
  } else if (category.includes("hardware") || name.includes("electrical") || name.includes("modelling")) {
    theme = "hardware";
  } else if (category.includes("software") || name.includes("database") || name.includes("dbms") || name.includes("data structure") || name.includes("react") || name.includes("node")) {
    theme = "software";
  }

  const renderBannerContent = () => {
    switch (theme) {
      case "sysadmin":
        return (
          <div className="banner-art-wrap sysadmin-banner">
            <div className="banner-tag">SYSTEM ADMINISTRATOR</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="20" y="25" width="70" height="75" rx="6" fill="#1e3a8a" opacity="0.8" />
              <rect x="25" y="32" width="60" height="8" rx="2" fill="#60a5fa" />
              <rect x="25" y="46" width="60" height="8" rx="2" fill="#60a5fa" />
              <rect x="25" y="60" width="60" height="8" rx="2" fill="#60a5fa" />
              <circle cx="32" cy="78" r="3" fill="#34d399" />
              <circle cx="42" cy="78" r="3" fill="#38bdf8" />
              <circle cx="52" cy="78" r="3" fill="#fbbf24" />
              {/* Desktop workstation */}
              <rect x="120" y="30" width="90" height="55" rx="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <line x1="165" y1="85" x2="165" y2="100" stroke="#94a3b8" strokeWidth="4" />
              <line x1="145" y1="100" x2="185" y2="100" stroke="#94a3b8" strokeWidth="3" />
              <path d="M135 48 L150 62 L135 74" stroke="#34d399" strokeWidth="2.5" fill="none" />
              <line x1="158" y1="74" x2="175" y2="74" stroke="#38bdf8" strokeWidth="2.5" />
              {/* Server nodes */}
              <circle cx="255" cy="50" r="18" fill="#1e293b" stroke="#818cf8" strokeWidth="2" />
              <circle cx="255" cy="50" r="8" fill="#6366f1" />
              <path d="M210 50 L237 50" stroke="#6366f1" strokeDasharray="3 3" strokeWidth="2" />
            </svg>
          </div>
        );
      case "welding":
        return (
          <div className="banner-art-wrap welding-banner">
            <div className="banner-tag">FABRICATION & WELDING</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <path d="M40 95 L110 30 L130 50 L60 115 Z" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="150" cy="50" r="28" fill="url(#sparkGlow)" />
              <path d="M150 50 L180 30 M150 50 L195 55 M150 50 L170 80 M150 50 L140 10 M150 50 L190 70 M150 50 L130 85" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
              <rect x="180" y="70" width="100" height="30" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
              <defs>
                <radialGradient id="sparkGlow">
                  <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
                  <stop offset="60%" stopColor="#f97316" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        );
      case "plc":
        return (
          <div className="banner-art-wrap plc-banner">
            <div className="banner-tag">PLC PROGRAMMING</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="25" y="15" width="250" height="90" rx="8" fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />
              <rect x="40" y="25" width="80" height="70" rx="4" fill="#0f172a" stroke="#64748b" />
              <line x1="50" y1="38" x2="110" y2="38" stroke="#10b981" strokeWidth="2" />
              <line x1="50" y1="50" x2="95" y2="50" stroke="#3b82f6" strokeWidth="2" />
              <line x1="50" y1="62" x2="105" y2="62" stroke="#f59e0b" strokeWidth="2" />
              <line x1="50" y1="74" x2="85" y2="74" stroke="#ec4899" strokeWidth="2" />
              {/* Terminal modules */}
              <rect x="140" y="25" width="30" height="70" rx="2" fill="#334155" />
              <circle cx="155" cy="35" r="4" fill="#ef4444" />
              <circle cx="155" cy="50" r="4" fill="#10b981" />
              <circle cx="155" cy="65" r="4" fill="#3b82f6" />
              <circle cx="155" cy="80" r="4" fill="#fbbf24" />
              <rect x="180" y="25" width="80" height="70" rx="4" fill="#0284c7" opacity="0.2" stroke="#38bdf8" />
              <path d="M195 60 L210 45 L225 60 L245 40" stroke="#38bdf8" strokeWidth="2" fill="none" />
            </svg>
          </div>
        );
      case "networking":
        return (
          <div className="banner-art-wrap networking-banner">
            <div className="banner-tag">NETWORKING & CLOUD</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <circle cx="150" cy="60" r="35" stroke="#10b981" strokeWidth="2" strokeDasharray="4 2" fill="#064e3b" fillOpacity="0.4" />
              <circle cx="150" cy="60" r="14" fill="#10b981" />
              {/* Satellite nodes */}
              <circle cx="65" cy="40" r="10" fill="#3b82f6" />
              <line x1="75" y1="45" x2="136" y2="55" stroke="#34d399" strokeWidth="2" />
              <circle cx="70" cy="85" r="8" fill="#8b5cf6" />
              <line x1="78" y1="83" x2="137" y2="65" stroke="#34d399" strokeWidth="2" />
              <circle cx="230" cy="35" r="9" fill="#06b6d4" />
              <line x1="222" y1="40" x2="164" y2="55" stroke="#34d399" strokeWidth="2" />
              <circle cx="235" cy="80" r="11" fill="#f59e0b" />
              <line x1="224" y1="76" x2="164" y2="65" stroke="#34d399" strokeWidth="2" />
            </svg>
          </div>
        );
      case "cpp":
        return (
          <div className="banner-art-wrap cpp-banner">
            <div className="banner-tag">C / C++ PROGRAMMING</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="30" y="20" width="120" height="80" rx="6" fill="#0f172a" stroke="#60a5fa" strokeWidth="2" />
              <path d="M45 42 L60 55 L45 68" stroke="#34d399" strokeWidth="2.5" fill="none" />
              <text x="70" y="60" fill="#93c5fd" fontFamily="monospace" fontSize="16" fontWeight="bold">#include</text>
              <line x1="45" y1="80" x2="110" y2="80" stroke="#475569" strokeWidth="2" />
              {/* Big C++ Badge */}
              <circle cx="225" cy="60" r="32" fill="#1e40af" stroke="#93c5fd" strokeWidth="3" />
              <text x="212" y="69" fill="#ffffff" fontFamily="sans-serif" fontSize="24" fontWeight="900">C++</text>
            </svg>
          </div>
        );
      case "python":
        return (
          <div className="banner-art-wrap python-banner">
            <div className="banner-tag">PYTHON & MACHINE LEARNING</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="25" y="20" width="130" height="80" rx="6" fill="#0f172a" stroke="#fbbf24" strokeWidth="2" />
              <text x="40" y="45" fill="#38bdf8" fontFamily="monospace" fontSize="13" fontWeight="bold">import numpy</text>
              <text x="40" y="65" fill="#fbbf24" fontFamily="monospace" fontSize="13" fontWeight="bold">import pandas</text>
              <text x="40" y="85" fill="#34d399" fontFamily="monospace" fontSize="13" fontWeight="bold">model.fit(X, y)</text>
              {/* Python Double Snake */}
              <path d="M210 30 C210 25, 230 25, 230 30 L230 45 L245 45 C250 45, 250 65, 245 65 L235 65 L235 55 L215 55 C210 55, 210 35, 210 30 Z" fill="#38bdf8" />
              <path d="M230 90 C230 95, 210 95, 210 90 L210 75 L195 75 C190 75, 190 55, 195 55 L205 55 L205 65 L225 65 C230 65, 230 85, 230 90 Z" fill="#fbbf24" />
            </svg>
          </div>
        );
      case "java":
        return (
          <div className="banner-art-wrap java-banner">
            <div className="banner-tag">JAVA PROGRAMMING</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="30" y="20" width="125" height="80" rx="6" fill="#0f172a" stroke="#f97316" strokeWidth="2" />
              <text x="42" y="45" fill="#f97316" fontFamily="monospace" fontSize="13" fontWeight="bold">public class</text>
              <text x="42" y="65" fill="#38bdf8" fontFamily="monospace" fontSize="13" fontWeight="bold">App &#123;</text>
              <text x="55" y="83" fill="#a78bfa" fontFamily="monospace" fontSize="12">void main()</text>
              {/* Coffee steam art */}
              <ellipse cx="225" cy="85" rx="28" ry="10" fill="#7c2d12" />
              <rect x="202" y="55" width="46" height="30" rx="4" fill="#ea580c" />
              <path d="M248 60 C258 60, 258 75, 248 78" stroke="#ea580c" strokeWidth="4" fill="none" />
              <path d="M215 48 Q218 35, 222 45 Q226 35, 230 45" stroke="#fed7aa" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        );
      case "uiux":
        return (
          <div className="banner-art-wrap uiux-banner">
            <div className="banner-tag">UI / UX DESIGN</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="40" y="15" width="60" height="90" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
              <rect x="48" y="28" width="44" height="22" rx="3" fill="#6366f1" />
              <circle cx="70" cy="38" r="6" fill="#ffffff" />
              <rect x="48" y="55" width="44" height="6" rx="2" fill="#cbd5e1" />
              <rect x="48" y="65" width="44" height="6" rx="2" fill="#cbd5e1" />
              <rect x="55" y="78" width="30" height="12" rx="3" fill="#a855f7" />
              {/* Wireframe Desktop */}
              <rect x="130" y="20" width="130" height="80" rx="6" fill="#0f172a" stroke="#c084fc" strokeWidth="2" />
              <rect x="140" y="30" width="32" height="60" rx="3" fill="#312e81" />
              <rect x="180" y="32" width="70" height="15" rx="3" fill="#818cf8" opacity="0.6" />
              <rect x="180" y="52" width="32" height="35" rx="3" fill="#4c1d95" />
              <rect x="218" y="52" width="32" height="35" rx="3" fill="#4c1d95" />
            </svg>
          </div>
        );
      case "electronics":
      case "hardware":
        return (
          <div className="banner-art-wrap electronics-banner">
            <div className="banner-tag">HARDWARE & ELECTRONICS</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="30" y="20" width="240" height="80" rx="6" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
              {/* IC chip */}
              <rect x="115" y="35" width="70" height="50" rx="4" fill="#0f172a" stroke="#34d399" strokeWidth="1.5" />
              <text x="133" y="65" fill="#34d399" fontFamily="monospace" fontSize="13" fontWeight="bold">MICRO</text>
              {/* Chip pins */}
              <line x1="125" y1="28" x2="125" y2="35" stroke="#fbbf24" strokeWidth="3" />
              <line x1="140" y1="28" x2="140" y2="35" stroke="#fbbf24" strokeWidth="3" />
              <line x1="155" y1="28" x2="155" y2="35" stroke="#fbbf24" strokeWidth="3" />
              <line x1="170" y1="28" x2="170" y2="35" stroke="#fbbf24" strokeWidth="3" />
              <line x1="125" y1="85" x2="125" y2="92" stroke="#fbbf24" strokeWidth="3" />
              <line x1="140" y1="85" x2="140" y2="92" stroke="#fbbf24" strokeWidth="3" />
              <line x1="155" y1="85" x2="155" y2="92" stroke="#fbbf24" strokeWidth="3" />
              <line x1="170" y1="85" x2="170" y2="92" stroke="#fbbf24" strokeWidth="3" />
              {/* PCB Traces */}
              <path d="M50 40 L90 40 L105 55 L115 55" stroke="#34d399" strokeWidth="2" fill="none" />
              <circle cx="50" cy="40" r="3" fill="#fbbf24" />
              <path d="M185 65 L210 65 L225 80 L250 80" stroke="#34d399" strokeWidth="2" fill="none" />
              <circle cx="250" cy="80" r="3" fill="#fbbf24" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="banner-art-wrap default-banner">
            <div className="banner-tag">{course.category || "GENERAL SKILL"}</div>
            <svg viewBox="0 0 300 120" className="banner-svg" fill="none">
              <rect x="25" y="18" width="250" height="84" rx="6" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1.5" />
              <circle cx="80" cy="60" r="28" fill="#312e81" stroke="#a78bfa" strokeWidth="2" />
              <path d="M70 60 L78 68 L92 50" stroke="#34d399" strokeWidth="3" fill="none" />
              <text x="130" y="55" fill="#f8fafc" fontFamily="sans-serif" fontSize="16" fontWeight="bold">
                {course.name?.slice(0, 18)}
              </text>
              <text x="130" y="75" fill="#94a3b8" fontFamily="sans-serif" fontSize="12">
                Levels: {course.levels?.length || 2}
              </text>
            </svg>
          </div>
        );
    }
  };

  return <div className="course-card-top-art">{renderBannerContent()}</div>;
}

export default function Courses({ search: initialSearch = "" }) {
  const { auth, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("available"); // "available" | "my-courses"
  const [courses, setCourses] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("name"); // "name" | "category" | "progress" | "levels" | "points" | "status"

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
        topicsText: "1. Advanced Problem Solving\n2. Real-World Projects\n3. Final Evaluation",
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

  // Robust Level & Course Progress Calculator
  const getCourseProgress = useCallback(
    (course) => {
      const levels = course.levels || [];
      const totalLevels = Math.max(levels.length, 1);

      if (!userProgress || userProgress.length === 0) {
        return {
          completedIndices: new Set(),
          completedCount: 0,
          totalLevels,
          percent: 0,
          currentLevelName: null,
          nextLevelIdx: 0,
          hasOngoing: false,
        };
      }

      const cId = String(course._id);
      const cName = (course.name || "").toLowerCase().trim();

      // Find matching user progress records
      const matchingRecords = userProgress.filter((p) => {
        const pCourseId = String(p.courseId?._id || p.courseId || "");
        const pCourseName = (p.courseId?.name || "").toLowerCase().trim();
        if (pCourseId && pCourseId === cId) return true;
        if (pCourseName && pCourseName === cName) return true;
        if (pCourseName && (pCourseName.startsWith(cName + " - ") || pCourseName.startsWith(cName + " level"))) {
          return true;
        }
        return false;
      });

      if (matchingRecords.length === 0) {
        return {
          completedIndices: new Set(),
          completedCount: 0,
          totalLevels,
          percent: 0,
          currentLevelName: null,
          nextLevelIdx: 0,
          hasOngoing: false,
        };
      }

      const completedIndices = new Set();
      let highestIdx = -1;
      let lastLevelText = null;

      matchingRecords.forEach((record) => {
        const rawLvl = String(record.currentLevel || "").trim();
        if (!rawLvl || ["NULL", "NIL", ""].includes(rawLvl.toUpperCase())) return;

        lastLevelText = rawLvl;

        if (rawLvl.toUpperCase() === "COMPLETED") {
          for (let i = 0; i < totalLevels; i++) completedIndices.add(i);
          highestIdx = totalLevels - 1;
          return;
        }

        // Match with specific level in course
        const normLvl = rawLvl.toLowerCase();
        levels.forEach((lvl, idx) => {
          const lName = (lvl.levelName || "").toLowerCase();
          const pCourseName = (record.courseId?.name || "").toLowerCase();

          if (
            normLvl === lName ||
            lName.includes(normLvl) ||
            pCourseName === lName ||
            (lvl.levelNumber !== undefined && normLvl.includes(`level ${lvl.levelNumber}`))
          ) {
            completedIndices.add(idx);
            if (idx > highestIdx) highestIdx = idx;
          }
        });
      });

      // In sequential curriculum, completing Level N implies 0..N are completed
      if (highestIdx >= 0) {
        for (let i = 0; i <= highestIdx; i++) {
          completedIndices.add(i);
        }
      }

      const completedCount = Math.min(completedIndices.size, totalLevels);
      const percent = Math.min(100, Math.round((completedCount / totalLevels) * 100));
      const nextLevelIdx = completedCount < totalLevels ? completedCount : -1;
      const hasOngoing = completedCount > 0 && completedCount < totalLevels;

      return {
        completedIndices,
        completedCount,
        totalLevels,
        percent,
        currentLevelName: lastLevelText,
        nextLevelIdx,
        hasOngoing,
      };
    },
    [userProgress]
  );

  // Available Parent Courses (Excludes any rogue standalone level duplicates)
  const availableParentCourses = useMemo(() => {
    const levelSuffixRegex = /\s*[-–]?\s*level\s*[-–]?\s*([0-9]+(?:\.[0-9]+)?[A-Z]?|[A-Z][0-9]*).*/i;
    return courses.filter((c) => {
      if (Array.isArray(c.levels) && c.levels.length > 0) return true;
      return !levelSuffixRegex.test(c.name || "");
    });
  }, [courses]);

  // Dynamic Categories
  const categoryOptions = useMemo(() => {
    const defaultCats = ["Software", "Hardware", "GENERAL Skill", "Beginner", "Advanced"];
    const dynamicCats = availableParentCourses.map((c) => c.category).filter(Boolean);
    return Array.from(new Set(["All", ...defaultCats, ...dynamicCats]));
  }, [availableParentCourses]);

  // Available Courses (1 Card Per Course with Segmented Progress Bar)
  const filteredAvailableCourses = useMemo(() => {
    let list = availableParentCourses;

    if (selectedCategory !== "All") {
      list = list.filter(
        (c) =>
          (c.category || "").toLowerCase() === selectedCategory.toLowerCase() ||
          (selectedCategory === "Advanced" && (c.name || "").toLowerCase().includes("advanced")) ||
          (selectedCategory === "Beginner" && (c.name || "").toLowerCase().includes("beginner"))
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(term) ||
          (c.category || "").toLowerCase().includes(term) ||
          (c.description || "").toLowerCase().includes(term)
      );
    }

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
  }, [availableParentCourses, selectedCategory, search, sortBy, getCourseProgress]);

  // "My Courses": Unrolled Separate Div for Each Level
  const myCourseLevelItems = useMemo(() => {
    const items = [];

    courses.forEach((course) => {
      const progInfo = getCourseProgress(course);
      if (progInfo.completedCount > 0 || progInfo.hasOngoing) {
        (course.levels || []).forEach((lvl, idx) => {
          const isCompleted = progInfo.completedIndices.has(idx);
          const isOngoing = !isCompleted && idx === progInfo.nextLevelIdx;

          // Render only completed or active in-progress levels
          if (isCompleted || isOngoing) {
            items.push({
              id: `${course._id}-lvl-${idx}`,
              courseId: course._id,
              courseName: course.name,
              courseCategory: course.category,
              clusterAccess: course.clusterAccess,
              levelIndex: idx,
              levelNumber: lvl.levelNumber !== undefined ? lvl.levelNumber : idx + 1,
              levelName: lvl.levelName || `Level ${idx + 1}`,
              rewardPoints: lvl.rewardPoints || 100,
              prerequisites: lvl.prerequisites || "None",
              assessmentType: lvl.assessmentType || "MCQ",
              topics: lvl.topics || [],
              status: isCompleted ? "Completed" : "OnGoing",
              parentCourse: course,
              levelObj: lvl,
            });
          }
        });
      }
    });

    // Also include any orphaned progress records from DB
    if (userProgress && userProgress.length > 0) {
      userProgress.forEach((p) => {
        const pCourseName = p.courseId?.name || "";
        const alreadyIncluded = items.some(
          (it) => it.courseName === pCourseName || it.levelName === pCourseName
        );
        if (!alreadyIncluded && p.currentLevel && !["NULL", "NIL", ""].includes(String(p.currentLevel).toUpperCase())) {
          items.push({
            id: `orphan-${p._id}`,
            courseId: p.courseId?._id || p._id,
            courseName: pCourseName || "Course Assessment",
            courseCategory: p.courseId?.category || "General",
            clusterAccess: "Both",
            levelIndex: 0,
            levelNumber: 1,
            levelName: pCourseName.includes("Level") ? pCourseName : `${pCourseName} - ${p.currentLevel}`,
            rewardPoints: 100,
            prerequisites: "None",
            assessmentType: "Evaluation",
            topics: ["Course curriculum evaluation"],
            status: "Completed",
            parentCourse: p.courseId || { name: pCourseName, category: "General", levels: [] },
            levelObj: { levelName: p.currentLevel, rewardPoints: 100 },
          });
        }
      });
    }

    return items;
  }, [courses, userProgress, getCourseProgress]);

  // Filtered & Sorted My Course Level Items
  const filteredMyCourseLevels = useMemo(() => {
    let list = myCourseLevelItems;

    if (selectedCategory !== "All") {
      list = list.filter(
        (item) => (item.courseCategory || "").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.courseName.toLowerCase().includes(term) ||
          item.levelName.toLowerCase().includes(term) ||
          item.courseCategory.toLowerCase().includes(term) ||
          (item.topics || []).some((t) => t.toLowerCase().includes(term))
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === "name") {
        return a.courseName.localeCompare(b.courseName);
      }
      if (sortBy === "category") {
        return a.courseCategory.localeCompare(b.courseCategory);
      }
      if (sortBy === "points") {
        return (b.rewardPoints || 0) - (a.rewardPoints || 0);
      }
      if (sortBy === "status") {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }, [myCourseLevelItems, selectedCategory, search, sortBy]);

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

  // Open Edit Modal (Admin)
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

  // Open Add Modal (Admin)
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
          topicsText: "1. Overview & Fundamentals\n2. Core Concepts\n3. Practical Demonstration",
        },
        {
          levelNumber: 1,
          levelName: "Level 1",
          rewardPoints: 300,
          prerequisites: "Level 0",
          assessmentType: "Manual Grading",
          topicsText: "1. Advanced Problem Solving\n2. Real-World Applications\n3. Final Evaluation",
        },
      ],
    });
    setShowAddCourse(true);
  };

  // Save Course
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

  if (loading) {
    return (
      <UnifiedLoader
        title="Loading Courses Portal…"
        subtitle="Retrieving multi-level curriculum, student progress & rewards"
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
              <span>🎓</span> {activeTab === "available" ? "Courses Available" : "My Enrolled & Completed Levels"}
            </h1>
            <p className="courses-count-subtitle">
              {activeTab === "available"
                ? `Showing ${filteredAvailableCourses.length} available courses with integrated modular levels`
                : `Showing ${filteredMyCourseLevels.length} individual course levels enrolled or completed`}
            </p>
          </div>

          {auth.role === "admin" && (
            <button type="button" className="btn-add-course" onClick={handleOpenAdd}>
              <span>➕</span> Add New Course
            </button>
          )}
        </div>

        {/* Primary Tabs: Courses Available vs My Courses */}
        <div className="courses-nav-tabs">
          <button
            type="button"
            className={`courses-tab-btn ${activeTab === "available" ? "active" : ""}`}
            onClick={() => setActiveTab("available")}
          >
            <span>📖 Courses Available</span>
            <span className="courses-tab-badge">{availableParentCourses.length}</span>
          </button>

          <button
            type="button"
            className={`courses-tab-btn ${activeTab === "my-courses" ? "active" : ""}`}
            onClick={() => setActiveTab("my-courses")}
          >
            <span>🎓 My Courses</span>
            <span className="courses-tab-badge">{myCourseLevelItems.length}</span>
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
            placeholder={
              activeTab === "available"
                ? "Search courses by name or category…"
                : "Search your enrolled levels, topics or course…"
            }
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
            {activeTab === "available" ? (
              <>
                <option value="levels">Sort by Levels</option>
                <option value="progress">Sort by Progress</option>
              </>
            ) : (
              <>
                <option value="points">Sort by Reward Points</option>
                <option value="status">Sort by Status</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: COURSES AVAILABLE (1 Div per Course with Segmented Progress Bar)
         ========================================================================= */}
      {activeTab === "available" && (
        <>
          {filteredAvailableCourses.length === 0 ? (
            <div className="courses-empty-state">
              <div className="empty-icon-lg">🔍</div>
              <h3 style={{ color: "#0f172a", margin: "0 0 8px 0" }}>No matching courses found</h3>
              <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                Try adjusting your search or category filter to discover courses.
              </p>
            </div>
          ) : (
            <div className="courses-grid">
              {filteredAvailableCourses.map((course) => {
                const prog = getCourseProgress(course);
                const totalLevels = (course.levels || []).length || 2;

                return (
                  <div
                    key={course._id}
                    className="portal-course-card"
                    onClick={() => setDetailCourse(course)}
                  >
                    {/* Top Visual Thematic Banner */}
                    <CourseBannerGraphic course={course} />

                    {/* Card Content */}
                    <div className="portal-course-content">
                      <h3 className="portal-course-title" title={course.name}>
                        {course.name}
                      </h3>

                      {/* Meta Information Row */}
                      <div className="portal-course-meta-row">
                        <span className="portal-meta-levels">
                          📄 Levels: {totalLevels}
                        </span>
                        <span className="portal-meta-cat">
                          {course.category === "Hardware" && "🖥️ Hardware"}
                          {course.category === "Software" && "💻 Software"}
                          {course.category === "GENERAL Skill" && "🎯 GENERAL Skill"}
                          {course.category === "Beginner" && "🌱 Beginner"}
                          {course.category === "Advanced" && "⚡ Advanced"}
                          {!["Hardware", "Software", "GENERAL Skill", "Beginner", "Advanced"].includes(course.category) &&
                            `📌 ${course.category || "General"}`}
                        </span>
                      </div>

                      {/* Reference Image Segmented Progress Bar */}
                      <div className="segmented-progress-wrap">
                        <div className="segmented-progress-row">
                          {Array.from({ length: totalLevels }).map((_, idx) => {
                            const isCompleted = prog.completedIndices.has(idx);
                            return (
                              <div
                                key={idx}
                                className={`segment-pill ${isCompleted ? "completed" : "empty"}`}
                                title={`Level ${idx + 1}: ${isCompleted ? "Completed" : "Empty / Incomplete"}`}
                              />
                            );
                          })}
                        </div>
                        <div className="segmented-progress-meta">
                          Progress: {prog.completedCount}/{prog.totalLevels} levels ({prog.percent}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          VIEW 2: MY COURSES (Separate Div For Each Enrolled/Completed Level)
         ========================================================================= */}
      {activeTab === "my-courses" && (
        <>
          {filteredMyCourseLevels.length === 0 ? (
            <div className="courses-empty-state">
              <div className="empty-icon-lg">🎓</div>
              <h3 style={{ color: "#0f172a", margin: "0 0 8px 0" }}>No enrolled course levels yet</h3>
              <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                You haven’t completed any levels yet. Head over to <strong>"Courses Available"</strong>, select a course, and mark milestones complete!
              </p>
            </div>
          ) : (
            <div className="my-levels-grid">
              {filteredMyCourseLevels.map((item) => {
                const isDone = item.status === "Completed";

                return (
                  <div key={item.id} className="level-item-card">
                    {/* Header */}
                    <div className="level-item-header">
                      <div>
                        <span className="level-item-parent-badge">{item.courseName}</span>
                        <h3 className="level-item-title">{item.levelName}</h3>
                      </div>
                      <span className={`level-status-pill ${isDone ? "status-completed" : "status-ongoing"}`}>
                        {isDone ? "✓ Completed" : "⏳ In Progress"}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="level-item-meta-grid">
                      <div className="level-meta-box">
                        <span className="meta-box-label">Category</span>
                        <span className="meta-box-value">{item.courseCategory}</span>
                      </div>
                      <div className="level-meta-box">
                        <span className="meta-box-label">Rewards</span>
                        <span className="meta-box-value highlight-gold">🪙 {item.rewardPoints} RP</span>
                      </div>
                      <div className="level-meta-box">
                        <span className="meta-box-label">Assessment</span>
                        <span className="meta-box-value">{item.assessmentType}</span>
                      </div>
                      <div className="level-meta-box">
                        <span className="meta-box-label">Prerequisites</span>
                        <span className="meta-box-value">{item.prerequisites}</span>
                      </div>
                    </div>

                    {/* Topics Preview */}
                    {item.topics && item.topics.length > 0 && (
                      <div className="level-topics-preview">
                        <span className="topics-preview-title">Syllabus Highlights:</span>
                        <ul className="topics-preview-list">
                          {item.topics.slice(0, 3).map((topic, tIdx) => (
                            <li key={tIdx}>{topic}</li>
                          ))}
                          {item.topics.length > 3 && (
                            <li className="topics-more">+{item.topics.length - 3} more topics…</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="level-item-actions">
                      <button
                        type="button"
                        className="btn-view-course-details"
                        onClick={() => setDetailCourse(item.parentCourse)}
                      >
                        📖 View Full Course
                      </button>

                      {!isDone && (
                        <button
                          type="button"
                          className="btn-mark-level-direct"
                          disabled={actionLoading}
                          onClick={() => handleMarkLevelCompleted(item.parentCourse, item.levelObj)}
                        >
                          {actionLoading ? "Saving…" : "Mark Completed ✓"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ===================================================
          COURSE DETAILS MODAL (Modular Level View)
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
                {auth.role === "admin" && (
                  <button
                    type="button"
                    className="course-btn-edit-modal"
                    onClick={(e) => handleOpenEdit(detailCourse, e)}
                  >
                    ✏️ Edit Curriculum
                  </button>
                )}
              </div>
            </div>

            <div className="course-details-content">
              {(detailCourse.levels || []).map((lvl, index) => {
                const prog = getCourseProgress(detailCourse);
                const isCompleted = prog.completedIndices.has(index);

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
                        <span className="level-completed-badge">
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    <div className="level-block-body">
                      {/* Left: Syllabus Topics List */}
                      <div className="level-topics-list">
                        <div className="level-section-subtitle">
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
                          <span className="level-meta-value highlight-gold">
                            🪙 {lvl.rewardPoints || 100} Points
                          </span>
                        </div>

                        <div className="level-meta-row">
                          <span className="level-meta-label">Pre Request</span>
                          <span className="level-meta-value">
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
          ADD / EDIT COURSE MODAL (Admin)
         =================================================== */}
      {(showAddCourse || editCourse) && (
        <div className="course-form-modal-overlay" onClick={() => { setShowAddCourse(false); setEditCourse(null); }}>
          <div className="course-form-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="course-form-header">
              <h2>{editCourse ? `Edit Course: ${editCourse.name}` : "Create New Course"}</h2>
              <button
                type="button"
                className="course-details-close-btn"
                onClick={() => { setShowAddCourse(false); setEditCourse(null); }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="course-form">
              <div className="form-group">
                <label>Course Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Advanced Full Stack Engineering"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                    <option value="GENERAL Skill">GENERAL Skill</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {formData.category === "Other" && (
                  <div className="form-group">
                    <label>Custom Category Name</label>
                    <input
                      type="text"
                      value={formData.customCategory}
                      onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                      placeholder="e.g., Biotech"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Cluster Access</label>
                  <select
                    value={formData.clusterAccess}
                    onChange={(e) => setFormData({ ...formData, clusterAccess: e.target.value })}
                  >
                    <option value="Both">Both (Tech & Non-Tech)</option>
                    <option value="Core">Core Only</option>
                    <option value="Special">Special Track</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Course Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Summary of course learning objectives and syllabus path…"
                />
              </div>

              {/* Levels Builder */}
              <div className="levels-builder-section">
                <div className="levels-builder-head">
                  <h3>Levels & Milestones ({formData.levels.length})</h3>
                  <button
                    type="button"
                    className="btn-add-level"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        levels: [
                          ...formData.levels,
                          {
                            levelNumber: formData.levels.length,
                            levelName: `Level ${formData.levels.length}`,
                            rewardPoints: 200,
                            prerequisites: `Level ${formData.levels.length - 1}`,
                            assessmentType: "MCQ",
                            topicsText: "1. Key Topic\n2. Practical Exercise",
                          },
                        ],
                      })
                    }
                  >
                    ➕ Add Level
                  </button>
                </div>

                {formData.levels.map((lvl, index) => (
                  <div key={index} className="level-form-card">
                    <div className="level-form-header">
                      <h4>Level {index}</h4>
                      {formData.levels.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-level"
                          onClick={() => {
                            const updated = formData.levels.filter((_, i) => i !== index);
                            setFormData({ ...formData, levels: updated });
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Level Name</label>
                        <input
                          type="text"
                          value={lvl.levelName}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[index].levelName = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                          placeholder={`Level ${index}`}
                        />
                      </div>
                      <div className="form-group">
                        <label>Reward Points (RP)</label>
                        <input
                          type="number"
                          value={lvl.rewardPoints}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[index].rewardPoints = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Assessment Type</label>
                        <select
                          value={lvl.assessmentType}
                          onChange={(e) => {
                            const updated = [...formData.levels];
                            updated[index].assessmentType = e.target.value;
                            setFormData({ ...formData, levels: updated });
                          }}
                        >
                          <option value="MCQ">MCQ</option>
                          <option value="Manual Grading">Manual Grading</option>
                          <option value="Programming">Programming</option>
                          <option value="GD">GD</option>
                          <option value="FA">FA</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Prerequisites</label>
                      <input
                        type="text"
                        value={lvl.prerequisites}
                        onChange={(e) => {
                          const updated = [...formData.levels];
                          updated[index].prerequisites = e.target.value;
                          setFormData({ ...formData, levels: updated });
                        }}
                        placeholder="e.g. None or Level 0"
                      />
                    </div>

                    <div className="form-group">
                      <label>Syllabus Topics (One per line)</label>
                      <textarea
                        rows={3}
                        value={lvl.topicsText}
                        onChange={(e) => {
                          const updated = [...formData.levels];
                          updated[index].topicsText = e.target.value;
                          setFormData({ ...formData, levels: updated });
                        }}
                        placeholder="1. Topic One&#10;2. Topic Two"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => { setShowAddCourse(false); setEditCourse(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-save" disabled={actionLoading}>
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
