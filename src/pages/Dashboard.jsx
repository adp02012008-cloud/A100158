// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { STUDENT_URL, COURSE_URL, POINTS_URL } from "../utils/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useAuth } from "../context/AuthContext";
import StudentCard from "../components/StudentCard";
import Modal from "../components/Modal";
import EditModal from "../components/EditModal";

// ── Helpers ───────────────────────────────────────────────────
const normalize = (str) => String(str || "").toLowerCase().replace(/\s+/g, "").trim();

const isEmptyValue = (val) => {
  if (val === null || val === undefined) return true;
  const x = String(val).trim().toUpperCase();
  return ["", "NIL", "NUL", "NULL", "-", "NA", "0"].includes(x);
};

const PREREQUISITES = {
  [normalize("Version Control – Git, GitHub")]: [normalize("HTML / CSS")],
  [normalize("JavaScript")]: [normalize("Version Control – Git, GitHub")],
  [normalize("React")]: [normalize("JavaScript")],
  [normalize("NodeJS")]: [normalize("React")],
};

// ── Data helpers ──────────────────────────────────────────────
function getStudentCourseDetails(studentName, coursesRows) {
  const list = [];
  coursesRows.forEach((row) => {
    const keys = Object.keys(row);
    const courseName = String(row[keys[0]] || "").trim();
    const studentCol = keys.find((k) => normalize(k) === normalize(studentName));
    const raw   = studentCol ? row[studentCol] : null;
    const value = raw === null || raw === undefined ? "" : String(raw).trim();
    if (courseName && !isEmptyValue(value)) {
      list.push({ courseName, currentLevel: value, display: `${courseName} - ${value}` });
    }
  });
  return list;
}

function getLevelColumns(row) {
  return Object.keys(row).filter((k) => normalize(k).startsWith("level"));
}

function resolveCurrentLevelIndex(currentLevel, levelColumns) {
  const current = normalize(currentLevel);
  let idx = levelColumns.findIndex((l) => normalize(l) === current);
  if (idx !== -1) return idx;
  idx = levelColumns.findIndex((l) => current.includes(normalize(l)));
  if (idx !== -1) return idx;
  const match = String(currentLevel || "").match(/\d+[a-zA-Z]?/);
  if (match) {
    const token = normalize(match[0]);
    idx = levelColumns.findIndex((l) => normalize(l).includes(token));
    if (idx !== -1) return idx;
  }
  return -1;
}

function getFirstAvailableLevel(pointRow, levelColumns) {
  for (const level of levelColumns) {
    const pts = Number(pointRow[level] || 0);
    if (pts > 0) return { nextLevel: level, points: pts };
  }
  return null;
}

function canTakeCourseByCluster(student, pointRow) {
  const sc = normalize(student.CLUSTER);
  const ac = normalize(pointRow["Cluster Access"] || "");
  if (!ac || ac === "") return true;
  if (ac === normalize("Both")) return true;
  if (ac === normalize("Core") && sc === normalize("Core")) return true;
  if (ac === normalize("Computer Cluster") && sc === normalize("Computer Cluster")) return true;
  return false;
}

function canTakeCourseByPrerequisite(courseName, studentCourses) {
  const key = normalize(courseName);
  if (!PREREQUISITES[key]) return true;
  return PREREQUISITES[key].every((req) =>
    studentCourses.some((c) => normalize(c.courseName) === req)
  );
}

function buildAvailableOptions(student, courseDetails, pointsRows) {
  const courseMap = {};
  courseDetails.forEach((c) => { courseMap[normalize(c.courseName)] = c.currentLevel; });

  const options = [];

  pointsRows.forEach((row) => {
    const keys = Object.keys(row);
    const courseName = String(row[keys[0]] || "").trim();
    if (!courseName) return;
    if (!canTakeCourseByCluster(student, row)) return;
    if (!canTakeCourseByPrerequisite(courseName, courseDetails)) return;

    const levelCols = getLevelColumns(row);
    if (levelCols.length === 0) return;

    const ck = normalize(courseName);
    const currentLevel = courseMap[ck];

    if (currentLevel) {
      const ci = resolveCurrentLevelIndex(currentLevel, levelCols);
      const ni = ci + 1;
      if (ci !== -1 && ni < levelCols.length) {
        const pts = Number(row[levelCols[ni]] || 0);
        if (pts > 0) options.push({ courseName, source: "next-level", currentLevel, nextLevel: levelCols[ni], points: pts });
      }
    } else {
      const first = getFirstAvailableLevel(row, levelCols);
      if (first) options.push({ courseName, source: "new-course", currentLevel: null, ...first });
    }
  });

  return options.sort((a, b) => b.points - a.points);
}

function makeComboKey(items) {
  return items.map((x) => `${x.courseName}-${x.nextLevel}-${x.points}`).sort().join("|");
}

function buildCombinationSuggestions(options, gap) {
  if (options.length === 0) return [];
  const results = [];
  const seen    = new Set();
  const maxD    = Math.min(options.length, 5);

  const bt = (start, combo, total) => {
    if (combo.length > 0) {
      const key = makeComboKey(combo);
      if (!seen.has(key)) {
        seen.add(key);
        results.push({ courses: [...combo], total, diff: Math.abs(gap - total), excess: total - gap });
      }
    }
    if (combo.length >= maxD || results.length >= 300) return;
    for (let i = start; i < options.length; i++) {
      combo.push(options[i]);
      bt(i + 1, combo, total + options[i].points);
      combo.pop();
      if (results.length >= 300) return;
    }
  };

  bt(0, [], 0);
  results.sort((a, b) => {
    if (a.diff !== b.diff) return a.diff - b.diff;
    if (a.courses.length !== b.courses.length) return a.courses.length - b.courses.length;
    return b.total - a.total;
  });
  return results.slice(0, 6);
}

function buildSuggestions(student, avgActivity, pointsRows) {
  const gap  = Math.max(0, Math.ceil(avgActivity - student.ACTIVITY));
  const opts = buildAvailableOptions(student, student.COURSE_DETAILS, pointsRows);
  return { gap, allOptions: opts, combinations: buildCombinationSuggestions(opts, gap) };
}

// ── Component ─────────────────────────────────────────────────
export default function Dashboard({ search }) {
  const { auth, effectiveRole } = useAuth();

  const [students,       setStudents]       = useState([]);
  const [pointsRows,     setPointsRows]     = useState([]);
  const [coursesRows,    setCoursesRows]    = useState([]);
  const [selected,       setSelected]       = useState(null);
  const [editing,        setEditing]        = useState(null);
  const [clusterFilter,  setClusterFilter]  = useState("All");
  const [targetActivity, setTargetActivity] = useState(200);
  const [dataLoaded,     setDataLoaded]     = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [studentRes, courseRes, pointsRes] = await Promise.all([
        axios.get(STUDENT_URL),
        axios.get(COURSE_URL),
        axios.get(POINTS_URL),
      ]);

      const studentsRaw = studentRes.data || [];
      const cRows       = courseRes.data  || [];
      const pRows       = pointsRes.data  || [];

      setCoursesRows(cRows);
      setPointsRows(pRows);

      const cleaned = studentsRaw.map((st) => {
        const safeName      = String(st.Name || "").trim();
        const courseDetails = getStudentCourseDetails(safeName, cRows);
        return {
          ...st,
          Name:           safeName,
          POSITION:       String(st.POSITION || "").trim(),
          JOINED:         String(st.JOINED   || "").trim(),
          CLUSTER:        String(st.CLUSTER  || "").trim(),
          ACTIVITY:       Number(st["ACTIVITY POINT"] || 0),
          REWARD:         Number(st["REWARD POINT"]   || 0),
          LINKEDIN:       st.LINKEDIN || st["LinkedIn"] || st["Linked In"] || "",
          GITHUB:         st.GITHUB   || st["GitHub"]   || st["Git Hub"]   || "",
          COURSES:        courseDetails.map((c) => c.display),
          COURSE_DETAILS: courseDetails,
          COURSE_COUNT:   courseDetails.length,
        };
      });

      const total       = cleaned.reduce((s, x) => s + x.ACTIVITY, 0);
      const avgActivity = cleaned.length > 0 ? total / cleaned.length : 0;

      const enriched = cleaned.map((student) => {
        const s = buildSuggestions(student, avgActivity, pRows);
        return {
          ...student,
          GAP_TO_AVG:              s.gap,
          ALL_SUGGESTIONS:         s.allOptions,
          SUGGESTION_COMBINATIONS: s.combinations,
          AVG_ACTIVITY:            avgActivity,
        };
      });

      setStudents(enriched);
      setDataLoaded(true);
    } catch (err) {
      console.error("Error loading data:", err);
      setStudents([]);
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── After a successful edit, patch local state instantly ─────
  const handleSaved = useCallback((updatedPayload) => {
    setStudents((prev) => {
      const updated = prev.map((s) => {
        if (s["ENROLMENT NUMBER"] !== updatedPayload["ENROLMENT NUMBER"]) return s;

        // Patch basic fields
        const patched = {
          ...s,
          LINKEDIN: updatedPayload.LINKEDIN ?? s.LINKEDIN,
          GITHUB:   updatedPayload.GITHUB   ?? s.GITHUB,
          ACTIVITY: updatedPayload["ACTIVITY POINT"] !== undefined
            ? Number(updatedPayload["ACTIVITY POINT"]) : s.ACTIVITY,
          REWARD: updatedPayload["REWARD POINT"] !== undefined
            ? Number(updatedPayload["REWARD POINT"]) : s.REWARD,
          Name:     updatedPayload.Name     ?? s.Name,
          POSITION: updatedPayload.POSITION ?? s.POSITION,
          CLUSTER:  updatedPayload.CLUSTER  ?? s.CLUSTER,
          JOINED:   updatedPayload.JOINED   ?? s.JOINED,
        };

        // Patch course details if COURSE_UPDATES is present
        if (updatedPayload.COURSE_UPDATES) {
          const updates    = updatedPayload.COURSE_UPDATES; // { courseName: level }
          let newDetails   = [...(s.COURSE_DETAILS || [])];

          Object.entries(updates).forEach(([courseName, level]) => {
            const idx = newDetails.findIndex((c) => c.courseName === courseName);
            if (!level) {
              // Remove the course if level set to empty
              if (idx !== -1) newDetails.splice(idx, 1);
            } else if (idx !== -1) {
              // Update existing
              newDetails[idx] = {
                ...newDetails[idx],
                currentLevel: level,
                display: `${courseName} - ${level}`,
              };
            } else {
              // Add new
              newDetails.push({
                courseName,
                currentLevel: level,
                display: `${courseName} - ${level}`,
              });
            }
          });

          patched.COURSE_DETAILS = newDetails;
          patched.COURSES        = newDetails.map((c) => c.display);
          patched.COURSE_COUNT   = newDetails.length;
        }

        return patched;
      });

      // Recalculate avg + suggestions after patch
      const total       = updated.reduce((sum, x) => sum + x.ACTIVITY, 0);
      const avgActivity = updated.length > 0 ? total / updated.length : 0;
      return updated.map((student) => {
        const s = buildSuggestions(student, avgActivity, pointsRows);
        return {
          ...student,
          GAP_TO_AVG:              s.gap,
          ALL_SUGGESTIONS:         s.allOptions,
          SUGGESTION_COMBINATIONS: s.combinations,
          AVG_ACTIVITY:            avgActivity,
        };
      });
    });
  }, [pointsRows]);

  // ── Filtered list ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch  = (s.Name || "").toLowerCase().includes((search || "").toLowerCase());
      const matchCluster = clusterFilter === "All" || s.CLUSTER === clusterFilter;
      return matchSearch && matchCluster;
    });
  }, [students, search, clusterFilter]);

  // ── Summary stats ─────────────────────────────────────────────
  const total              = students.reduce((sum, s) => sum + s.ACTIVITY, 0);
  const avgActivity        = students.length > 0 ? total / students.length : 0;
  const belowAverageCount  = students.filter((s) => s.ACTIVITY < avgActivity).length;
  const topPerformersCount = students.filter((s) => s.ACTIVITY > avgActivity + 5).length;
  const coreCount          = students.filter((s) => s.CLUSTER === "Core").length;
  const computerCount      = students.filter((s) => s.CLUSTER === "Computer Cluster").length;

  const topFive  = [...filtered].sort((a, b) => b.ACTIVITY - a.ACTIVITY).slice(0, 5);
  const chartMax = topFive.length > 0 ? Math.max(...topFive.map((s) => s.ACTIVITY), 1) : 1;

  // Admin-only: can export
  const canExport = auth.role === "admin" && auth.viewMode === "admin";

  return (
    <div>
      {/* ── Toolbar ───────────────────────────────────────────── */}
      <div className="dashboard-toolbar">
        <div className="filter-group">
          <div className="cluster-filter">
            {["All", "Core", "Computer Cluster"].map((c) => (
              <button
                key={c}
                className={clusterFilter === c ? "active" : ""}
                onClick={() => setClusterFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="target-box">
            <label>Target Activity</label>
            <input
              type="number"
              min="1"
              value={targetActivity}
              onChange={(e) => setTargetActivity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        {canExport && (
          <div className="export-buttons">
            <button onClick={() => exportToExcel(filtered)}>📊 Export Excel</button>
            <button onClick={() => exportToPDF(filtered)}>📄 Export PDF</button>
          </div>
        )}
      </div>

      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="stats">
        <div className="stat-box"><h3>Total Activity</h3><p>{total}</p></div>
        <div className="stat-box"><h3>Average Activity</h3><p>{avgActivity.toFixed(2)}</p></div>
        <div className="stat-box"><h3>Below Average</h3><p>{belowAverageCount}</p></div>
        <div className="stat-box"><h3>Top Performers</h3><p>{topPerformersCount}</p></div>
      </div>

      {/* ── Analytics grid ────────────────────────────────────── */}
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Top 5 Students by Activity</h3>
          <div className="mini-chart">
            {topFive.length > 0 ? topFive.map((s, i) => (
              <div key={i} className="mini-chart-row">
                <div className="mini-chart-label">{s.Name}</div>
                <div className="mini-chart-track">
                  <div className="mini-chart-fill" style={{ width: `${(s.ACTIVITY / chartMax) * 100}%` }} />
                </div>
                <div className="mini-chart-value">{s.ACTIVITY}</div>
              </div>
            )) : <div className="leader-empty">No data available.</div>}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Cluster Distribution</h3>
          <div className="distribution-grid">
            <div className="distribution-box"><span>Core</span><strong>{coreCount}</strong></div>
            <div className="distribution-box"><span>Computer Cluster</span><strong>{computerCount}</strong></div>
          </div>
        </div>
      </div>

      {/* ── Cards ─────────────────────────────────────────────── */}
      {!dataLoaded ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h3>Loading students…</h3>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((s, i) => (
            <StudentCard
              key={i}
              student={s}
              avgActivity={avgActivity}
              targetActivity={targetActivity}
              onClick={setSelected}
              onEdit={setEditing}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No matching students</h3>
          <p>Try a different search or filter.</p>
        </div>
      )}

      {/* ── View modal ────────────────────────────────────────── */}
      {selected && <Modal student={selected} onClose={() => setSelected(null)} />}

      {/* ── Edit modal ────────────────────────────────────────── */}
      {editing && (
        <EditModal
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
