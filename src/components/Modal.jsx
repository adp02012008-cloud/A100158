import { useMemo, useState } from "react";
import UserAvatar from "./UserAvatar";

function getStatus(activity, avgActivity) {
  const diff = activity - avgActivity;
  if (diff > 5)            return { text: "Top Performer",    className: "status-good",    icon: "🟢" };
  if (Math.abs(diff) <= 5) return { text: "Average",          className: "status-average", icon: "🟡" };
  return                          { text: "Needs Improvement", className: "status-low",     icon: "🔴" };
}

function getCourseKey(name = "") {
  return name
    .toLowerCase()
    .replace(/gurugulam|assessment|modelling/gi, "")
    .replace(/[^a-z0-9]/gi, "");
}

function cleanLevelName(rawLevel, courseName = "") {
  if (!rawLevel) return "Completed";
  let s = String(rawLevel).trim();

  // If courseName is provided, strip redundant mentions of course name
  if (courseName) {
    if (/^C\b/i.test(courseName)) {
      s = s.replace(/\bC\b/gi, "");
    }
    const cClean = courseName.replace(/[^a-zA-Z0-9]/g, " ").trim();
    const words = cClean.split(/\s+/).filter((w) => w.length >= 2);
    for (const w of words) {
      const reg = new RegExp(`\\b${w}\\b`, "gi");
      s = s.replace(reg, "");
    }
  }

  // Remove filler phrases & common synonyms
  s = s.replace(/gurugulam\s*assessment/gi, "");
  s = s.replace(/assessment/gi, "");
  s = s.replace(/gurugulam/gi, "");
  s = s.replace(/modell?ing/gi, "");
  s = s.replace(/prototype/gi, "");
  s = s.replace(/\bgerman\b/gi, "");

  // Detect written test
  const isWrittenTest = /written\s*test/i.test(s);
  s = s.replace(/written\s*test/gi, "");

  // Clean hyphens, slashes, multiple spaces
  s = s.replace(/^[-–—:,/ ]+/, "");
  s = s.replace(/level\s*[-–—:]*\s*/gi, "Level ");
  s = s.replace(/[-–—:,/ ]+$/, "");
  s = s.replace(/\s+/g, " ").trim();

  // Special course level formatting (e.g. 1A 1B or 1C 1D)
  if (/1A.*1B/i.test(s)) {
    s = "Level 1A, 1B, 1C or 1D";
  }

  // Capitalize Level nicely
  if (/^Level\s*\d+[a-zA-Z]*/i.test(s)) {
    s = s.replace(/^level/i, "Level");
  } else if (/^\d+[a-zA-Z]*/.test(s)) {
    s = `Level ${s}`;
  }

  if (isWrittenTest) {
    s = `${s} (Written Test)`;
  }

  s = s.replace(/^[-–—:,/ ]+/, "").replace(/[-–—:,/ ]+$/, "").trim();

  if (!s || s.toLowerCase() === "completed") {
    return "Completed";
  }

  return s;
}

function parseCourseItem(rawCourse, rawDetails) {
  let courseName = "Course";
  let rawLevelsList = [];

  if (rawDetails && typeof rawDetails === "object") {
    courseName = rawDetails.courseName || rawDetails.name || rawDetails.title || courseName;
    if (Array.isArray(rawDetails.completedLevels) && rawDetails.completedLevels.length > 0) {
      rawLevelsList = rawDetails.completedLevels;
    } else if (rawDetails.currentLevel) {
      rawLevelsList = [rawDetails.currentLevel];
    } else if (rawDetails.level) {
      rawLevelsList = [rawDetails.level];
    }
  }

  if (rawLevelsList.length === 0 && rawCourse) {
    if (typeof rawCourse === "object" && rawCourse !== null) {
      courseName = rawCourse.courseName || rawCourse.name || rawCourse.title || courseName;
      if (Array.isArray(rawCourse.completedLevels) && rawCourse.completedLevels.length > 0) {
        rawLevelsList = rawCourse.completedLevels;
      } else if (rawCourse.currentLevel || rawCourse.level) {
        rawLevelsList = [rawCourse.currentLevel || rawCourse.level];
      }
    } else {
      const str = String(rawCourse).trim();
      const parts = str.split(" - ");
      if (parts.length >= 2) {
        if (parts.length >= 4 && parts[0].trim() === parts[2].trim()) {
          courseName = `${parts[0].trim()} - ${parts[1].trim()}`;
          rawLevelsList = [parts.slice(3).join(" - ")];
        } else if (parts.length >= 3 && parts[0].trim() === parts[1].trim()) {
          courseName = parts[0].trim();
          rawLevelsList = [parts.slice(2).join(" - ")];
        } else if (/level/i.test(parts[parts.length - 1])) {
          rawLevelsList = [parts[parts.length - 1]];
          courseName = parts.slice(0, parts.length - 1).join(" - ").trim();
          const sub = courseName.split(" - ");
          if (sub.length === 2 && sub[0].trim() === sub[1].trim()) {
            courseName = sub[0].trim();
          }
        } else {
          courseName = parts[0].trim();
          rawLevelsList = [parts.slice(1).join(" - ")];
        }
      } else {
        courseName = str;
        rawLevelsList = ["Completed"];
      }
    }
  }

  const expanded = [];
  for (const item of rawLevelsList) {
    if (typeof item === "string" && item.includes(",")) {
      expanded.push(...item.split(","));
    } else {
      expanded.push(item);
    }
  }

  const cleaned = expanded
    .map((lvl) => cleanLevelName(lvl, courseName))
    .filter(Boolean);

  const unique = Array.from(new Set(cleaned));

  unique.sort((a, b) => {
    const numA = parseFloat((a.match(/\d+/) || [999])[0]);
    const numB = parseFloat((b.match(/\d+/) || [999])[0]);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

  return {
    courseName,
    levels: unique.length > 0 ? unique : ["Completed"],
  };
}

export default function Modal({ student, onClose }) {
  const [tab, setTab]               = useState("details");
  const [priorityMode, setPriorityMode] = useState("best");

  const sortedCombos = useMemo(() => {
    const combos = [...(student?.SUGGESTION_COMBINATIONS || [])];

    if (priorityMode === "fastest") {
      return combos.sort((a, b) =>
        a.courses.length !== b.courses.length
          ? a.courses.length - b.courses.length
          : a.diff - b.diff
      );
    }

    if (priorityMode === "easy") {
      return combos.sort((a, b) => {
        const nlA = a.courses.filter((x) => x.source === "next-level").length;
        const nlB = b.courses.filter((x) => x.source === "next-level").length;
        if (nlA !== nlB) return nlB - nlA;
        if (a.courses.length !== b.courses.length) return a.courses.length - b.courses.length;
        return a.diff - b.diff;
      });
    }

    return combos.sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      if (a.courses.length !== b.courses.length) return a.courses.length - b.courses.length;
      return b.total - a.total;
    });
  }, [student?.SUGGESTION_COMBINATIONS, priorityMode]);

  if (!student) return null;

  const fixLink = (url) => (!url ? "#" : url.startsWith("http") ? url : `https://${url}`);

  const userCourses = useMemo(() => {
    const courseMap = new Map();

    const addCourseEntry = (courseName, levels) => {
      if (!courseName) return;
      const key = getCourseKey(courseName);
      if (courseMap.has(key)) {
        const existing = courseMap.get(key);
        // Retain cleaner course title if existing contains hyphenated duplicate
        if (courseName.length < existing.courseName.length && !courseName.includes("-")) {
          existing.courseName = courseName;
        }
        const merged = Array.from(new Set([...existing.levels, ...levels]));
        merged.sort((a, b) => {
          const numA = parseFloat((a.match(/\d+/) || [999])[0]);
          const numB = parseFloat((b.match(/\d+/) || [999])[0]);
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
        });
        existing.levels = merged;
      } else {
        courseMap.set(key, { courseName, levels });
      }
    };

    // 1. Process COURSE_DETAILS first (detailed objects)
    if (Array.isArray(student.COURSE_DETAILS) && student.COURSE_DETAILS.length > 0) {
      student.COURSE_DETAILS.forEach((c) => {
        const item = parseCourseItem(null, c);
        if (item.courseName) {
          addCourseEntry(item.courseName, item.levels);
        }
      });
    }

    // 2. Process COURSES array (strings or objects)
    if (Array.isArray(student.COURSES) && student.COURSES.length > 0) {
      student.COURSES.forEach((cStr) => {
        const item = parseCourseItem(cStr, null);
        if (item.courseName) {
          addCourseEntry(item.courseName, item.levels);
        }
      });
    }

    return Array.from(courseMap.values());
  }, [student.COURSE_DETAILS, student.COURSES]);

  const skills = [
    student.Primary1, student.Primary2,
    student.Secondary1, student.Secondary2,
    student.Spec1, student.Spec2,
  ].filter(Boolean);

  const status         = getStatus(student.ACTIVITY, student.AVG_ACTIVITY);
  const isBelowAverage = student.ACTIVITY < student.AVG_ACTIVITY;
  const isAboveAverage = student.ACTIVITY > student.AVG_ACTIVITY;

  const modeLabel =
    priorityMode === "best"    ? "⭐ BEST OPTION"    :
    priorityMode === "fastest" ? "⚡ FASTEST OPTION" : "💡 EASY OPTION";

  const copyId = () => {
    const id = student["ENROLMENT NUMBER"] || student["REGISTER NUMBER"] || student.enrolmentNumber || "";
    if (id) {
      navigator.clipboard.writeText(id).catch(() => {});
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        {/* Header */}
        <div className="modal-header">
          <UserAvatar
            src={student.avatar || student.photoURL}
            name={student.NAME || student.Name}
            size={60}
            className="avatar-placeholder modal-avatar"
          />
          <div>
            <h2 className="modal-title">{student.NAME}</h2>
            <p className="modal-sub">
              {student.CLUSTER ? `${student.CLUSTER} Cluster • ` : ""}
              {student["ENROLMENT NUMBER"] || student["REGISTER NUMBER"]}
            </p>
            <span className={`status-pill ${status.className}`}>
              {status.icon} {status.text}
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="modal-tabs">
          <button className={`modal-tab ${tab === "details" ? "active" : ""}`}
            onClick={() => setTab("details")}>
            Details
          </button>
          <button className={`modal-tab ${tab === "courses" ? "active" : ""}`}
            onClick={() => setTab("courses")}>
            Courses
          </button>
          <button className={`modal-tab ${tab === "suggestions" ? "active" : ""}`}
            onClick={() => setTab("suggestions")}>
            Suggestions
          </button>
        </div>

        {/* ── DETAILS ─────────────────────────────────────────── */}
        {tab === "details" && (
          <>
            <div className="quick-actions">
              {student.LINKEDIN && (
                <a className="quick-action-btn" href={fixLink(student.LINKEDIN)} target="_blank" rel="noreferrer">
                  Open LinkedIn
                </a>
              )}
              {student.GITHUB && (
                <a className="quick-action-btn" href={fixLink(student.GITHUB)} target="_blank" rel="noreferrer">
                  Open GitHub
                </a>
              )}
              <button className="quick-action-btn" onClick={copyId}>Copy ID</button>
            </div>

            <div className="modal-stats-grid">
              <div className="modal-stat-card"><span>Joined</span><strong>{student.JOINED}</strong></div>
              <div className="modal-stat-card"><span>Activity</span><strong>{student.ACTIVITY}</strong></div>
              <div className="modal-stat-card"><span>Reward</span><strong>{student.REWARD}</strong></div>
              <div className="modal-stat-card"><span>Average</span><strong>{student.AVG_ACTIVITY?.toFixed(2)}</strong></div>
            </div>

            <div className="skill-preview">
              {skills.map((x, i) => <span key={i}>{x}</span>)}
            </div>
          </>
        )}

        {/* ── COURSES ─────────────────────────────────────────── */}
        {tab === "courses" && (
          <div className="modal-tab-pane">
            <div className="modal-courses-header-row">
              <h3 className="modal-courses-pane-title">
                Courses Completed & Enrolled ({userCourses.length || student.COURSE_COUNT || 0})
              </h3>
            </div>
            {userCourses.length > 0 ? (
              <div className="modal-courses-grid">
                {userCourses.map((c, i) => (
                  <div key={i} className="modal-course-card">
                    <div className="modal-course-card-top">
                      <div className="modal-course-icon-wrap">
                        <span className="modal-course-icon">🎓</span>
                      </div>
                      <div className="modal-course-title-wrap">
                        <h4 className="modal-course-name" title={c.courseName}>
                          {c.courseName}
                        </h4>
                        <span className="modal-course-levels-count">
                          {c.levels.length} {c.levels.length === 1 ? "Level" : "Levels"} Completed
                        </span>
                      </div>
                    </div>

                    <div className="modal-course-levels-section">
                      <span className="modal-levels-label">Completed Levels</span>
                      <div className="modal-levels-wrap">
                        {c.levels.map((lvl, li) => (
                          <span key={li} className="modal-level-chip">
                            <span className="chip-check">✓</span>
                            <span className="chip-text">{lvl}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ opacity: 0.6 }}>No courses enrolled yet.</p>
            )}
          </div>
        )}

        {/* ── SUGGESTIONS ─────────────────────────────────────── */}
        {tab === "suggestions" && (
          <>
            <div className="suggestion-topbar">
              <h3>Suggestions</h3>
              <select className="priority-select" value={priorityMode}
                onChange={(e) => setPriorityMode(e.target.value)}>
                <option value="best">Best Option</option>
                <option value="fastest">Fastest Option</option>
                <option value="easy">Easy Option</option>
              </select>
            </div>

            {isAboveAverage && (
              <div className="suggestion-summary good-summary">
                This student is already <b>{(student.ACTIVITY - student.AVG_ACTIVITY).toFixed(1)}</b> points above average.
              </div>
            )}

            {!isAboveAverage && !isBelowAverage && (
              <div className="suggestion-summary equal-summary">
                This student is exactly at the average activity level.
              </div>
            )}

            {isBelowAverage && (
              <>
                <div className="suggestion-summary">
                  Needs <b>{student.GAP_TO_AVG}</b> more points to reach average.
                </div>

                {sortedCombos?.length > 0 ? (
                  <>
                    <h4 className="other-title">Recommended patterns</h4>
                    {sortedCombos.map((combo, ci) => (
                      <div key={ci} className="suggestion-card">
                        {ci === 0 && <div className="priority-badge">{modeLabel}</div>}
                        <div className="suggestion-course">Option {ci + 1}</div>
                        {combo.courses.map((item, i) => (
                          <div key={i} className="suggestion-line">
                            {item.courseName} → <b>{item.nextLevel}</b> (+{item.points})
                            {item.source === "next-level" ? <span> — next level</span> : <span> — new course</span>}
                          </div>
                        ))}
                        <div className="suggestion-points">Total: {combo.total} points</div>
                        <div className="suggestion-line">
                          {combo.total >= student.GAP_TO_AVG
                            ? <>Extra above target: <b>{combo.total - student.GAP_TO_AVG}</b></>
                            : <>Still need: <b>{student.GAP_TO_AVG - combo.total}</b></>}
                        </div>
                      </div>
                    ))}

                    {(student.ALL_SUGGESTIONS || []).length > 0 && (
                      <>
                        <h4 className="other-title">Available options</h4>
                        {student.ALL_SUGGESTIONS.map((item, i) => (
                          <div key={i} className="course">
                            {item.courseName} → {item.nextLevel} (+{item.points})
                            {item.source === "next-level" ? " — next level" : " — new course"}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                ) : (
                  <div className="suggestion-summary warning-summary">
                    No suitable course combinations found for this student.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
