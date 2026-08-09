// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../utils/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useAuth } from "../context/AuthContext";
import StudentCard from "../components/StudentCard";
import Modal from "../components/Modal";
import EditModal from "../components/EditModal";
import AddMemberModal from "../components/AddMemberModal";
import AddCourseModal from "../components/AddCourseModal";
import AddClusterModal from "../components/AddClusterModal";
import ManageCoursesModal from "../components/ManageCoursesModal";
import ManageClustersModal from "../components/ManageClustersModal";

const normalize = (str) => String(str || "").toLowerCase().replace(/\s+/g, "").trim();

const PREREQUISITES = {
  [normalize("Version Control – Git, GitHub")]: [normalize("HTML / CSS")],
  [normalize("JavaScript")]: [normalize("Version Control – Git, GitHub")],
  [normalize("React")]: [normalize("JavaScript")],
  [normalize("NodeJS")]: [normalize("React")],
};

function getLevelColumns(row) {
  return Object.keys(row || {}).filter((k) => normalize(k).startsWith("level"));
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
  const ac = normalize(pointRow["Cluster Access"] || pointRow.clusterAccess || "");
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
  (courseDetails || []).forEach((c) => { courseMap[normalize(c.courseName)] = c.currentLevel; });

  const options = [];

  (pointsRows || []).forEach((row) => {
    const courseName = String(row.courseName || row.name || Object.values(row)[0] || "").trim();
    if (!courseName) return;
    if (!canTakeCourseByCluster(student, row)) return;
    if (!canTakeCourseByPrerequisite(courseName, courseDetails || [])) return;

    const levelCols = getLevelColumns(row.levelPoints || row);
    if (levelCols.length === 0) return;

    const ck = normalize(courseName);
    const currentLevel = courseMap[ck];

    if (currentLevel) {
      const ci = resolveCurrentLevelIndex(currentLevel, levelCols);
      const ni = ci + 1;
      if (ci !== -1 && ni < levelCols.length) {
        const pts = Number((row.levelPoints ? row.levelPoints[levelCols[ni]] : row[levelCols[ni]]) || 0);
        if (pts > 0) options.push({ courseName, source: "next-level", currentLevel, nextLevel: levelCols[ni], points: pts });
      }
    } else {
      const first = getFirstAvailableLevel(row.levelPoints || row, levelCols);
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
  const seen = new Set();
  const maxD = Math.min(options.length, 5);

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
  const gap = Math.max(0, Math.ceil(avgActivity - student.ACTIVITY));
  const opts = buildAvailableOptions(student, student.COURSE_DETAILS, pointsRows);
  return { gap, allOptions: opts, combinations: buildCombinationSuggestions(opts, gap) };
}

export default function Dashboard({ search }) {
  const { auth } = useAuth();

  const [students, setStudents] = useState([]);
  const [pointsRows, setPointsRows] = useState([]);
  const [systemClusters, setSystemClusters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddCluster, setShowAddCluster] = useState(false);
  const [showManageCourses, setShowManageCourses] = useState(false);
  const [showManageClusters, setShowManageClusters] = useState(false);

  const [clusterFilter, setClusterFilter] = useState("All");
  const [targetActivity, setTargetActivity] = useState(200);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [res, clustersRes] = await Promise.all([
        apiFetch("/users/dashboard"),
        apiFetch("/clusters").catch(() => ({ clusters: [] })),
      ]);

      const cleaned = res.users || [];
      const pRows = res.pointsRules || [];
      setPointsRows(pRows);

      if (clustersRes?.clusters) {
        setSystemClusters(clustersRes.clusters);
      }

      const total = cleaned.reduce((s, x) => s + (x["ACTIVITY POINT"] || 0), 0);
      const avgActivity = cleaned.length > 0 ? total / cleaned.length : 0;

      const enriched = cleaned.map((student) => {
        const s = buildSuggestions(student, avgActivity, pRows);
        return {
          ...student,
          ACTIVITY: Number(student["ACTIVITY POINT"] || 0),
          REWARD: Number(student["REWARD POINT"] || 0),
          GAP_TO_AVG: s.gap,
          ALL_SUGGESTIONS: s.allOptions,
          SUGGESTION_COMBINATIONS: s.combinations,
          AVG_ACTIVITY: avgActivity,
        };
      });

      setStudents(enriched);
      setDataLoaded(true);
    } catch (err) {
      console.error("Error loading dashboard from MongoDB:", err);
      setStudents([]);
      setDataLoaded(true);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaved = useCallback(() => {
    loadData();
  }, [loadData]);

  const allClusterNames = useMemo(() => {
    const dbNames = systemClusters.map((c) => c.name).filter(Boolean);
    const studentNames = students.map((s) => s.CLUSTER).filter(Boolean);
    return Array.from(new Set(["All", "Core", "Computer Cluster", ...dbNames, ...studentNames]));
  }, [systemClusters, students]);

  const clusterCounts = useMemo(() => {
    const counts = {};
    allClusterNames.filter((c) => c !== "All").forEach((c) => { counts[c] = 0; });
    students.forEach((s) => {
      const cName = s.CLUSTER || "Unknown";
      counts[cName] = (counts[cName] || 0) + 1;
    });
    return counts;
  }, [allClusterNames, students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = (s.Name || "").toLowerCase().includes((search || "").toLowerCase());
      const matchCluster = clusterFilter === "All" || s.CLUSTER === clusterFilter;
      return matchSearch && matchCluster;
    });
  }, [students, search, clusterFilter]);

  const total = students.reduce((sum, s) => sum + s.ACTIVITY, 0);
  const avgActivity = students.length > 0 ? total / students.length : 0;
  const belowAverageCount = students.filter((s) => s.ACTIVITY < avgActivity).length;
  const topPerformersCount = students.filter((s) => s.ACTIVITY > avgActivity + 5).length;

  const topFive = [...filtered].sort((a, b) => b.ACTIVITY - a.ACTIVITY).slice(0, 5);
  const chartMax = topFive.length > 0 ? Math.max(...topFive.map((s) => s.ACTIVITY), 1) : 1;
  const isAdminView = auth.role === "admin" && auth.viewMode === "admin";

  return (
    <div>
      <div className="dashboard-toolbar">
        <div className="filter-group">
          <div className="cluster-filter" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {allClusterNames.map((c) => (
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

        {isAdminView && (
          <div className="export-buttons" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button onClick={() => setShowAddMember(true)} style={{ background: "#4f46e5", color: "#fff" }}>
              ➕ Add Member
            </button>
            <button onClick={() => setShowAddCourse(true)} style={{ background: "#059669", color: "#fff" }}>
              ➕ Add Course
            </button>
            <button onClick={() => setShowManageCourses(true)} style={{ background: "#0284c7", color: "#fff" }}>
              📚 Manage Courses
            </button>
            <button onClick={() => setShowAddCluster(true)} style={{ background: "#d97706", color: "#fff" }}>
              ➕ Add Cluster
            </button>
            <button onClick={() => setShowManageClusters(true)} style={{ background: "#b45309", color: "#fff" }}>
              🏛️ Manage Clusters
            </button>
            <button onClick={() => exportToExcel(filtered)}>📊 Export Excel</button>
            <button onClick={() => exportToPDF(filtered)}>📄 Export PDF</button>
          </div>
        )}
      </div>

      <div className="stats">
        <div className="stat-box"><h3>Total Activity</h3><p>{total}</p></div>
        <div className="stat-box"><h3>Average Activity</h3><p>{avgActivity.toFixed(2)}</p></div>
        <div className="stat-box"><h3>Below Average</h3><p>{belowAverageCount}</p></div>
        <div className="stat-box"><h3>Top Performers</h3><p>{topPerformersCount}</p></div>
      </div>

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
          <div className="distribution-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
            {Object.entries(clusterCounts).map(([clusterName, count]) => (
              <div key={clusterName} className="distribution-box">
                <span>{clusterName}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

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
              onRoleChanged={loadData}
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

      {selected && <Modal student={selected} onClose={() => setSelected(null)} />}
      {editing && (
        <EditModal
          student={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} onCreated={loadData} />}
      {showAddCourse && <AddCourseModal onClose={() => setShowAddCourse(false)} onCreated={loadData} />}
      {showAddCluster && <AddClusterModal onClose={() => setShowAddCluster(false)} onCreated={loadData} />}
      {showManageCourses && <ManageCoursesModal onClose={() => { setShowManageCourses(false); loadData(); }} />}
      {showManageClusters && <ManageClustersModal onClose={() => { setShowManageClusters(false); loadData(); }} onClustersUpdated={loadData} />}
    </div>
  );
}
