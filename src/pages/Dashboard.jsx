import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { STUDENT_URL, COURSE_URL, POINTS_URL } from "../utils/api";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import StudentCard from "../components/StudentCard";
import Modal from "../components/Modal";

export default function Dashboard({ search }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [clusterFilter, setClusterFilter] = useState("All");
  const [targetActivity, setTargetActivity] = useState(200);

  useEffect(() => {
    loadData();
  }, []);

  const normalize = (str) =>
    String(str || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .trim();

  const isEmptyValue = (val) => {
    if (val === null || val === undefined) return true;

    const x = String(val).trim().toUpperCase();

    return (
      x === "" ||
      x === "NIL" ||
      x === "NUL" ||
      x === "NULL" ||
      x === "-" ||
      x === "NA" ||
      x === "0"
    );
  };

  const PREREQUISITES = {
    [normalize("Version Control – Git, GitHub")]: [normalize("HTML / CSS")],
    [normalize("JavaScript")]: [normalize("Version Control – Git, GitHub")],
    [normalize("React")]: [normalize("JavaScript")],
    [normalize("NodeJS")]: [normalize("React")],
  };

  const hasCompleted = (studentCourses, courseName) => {
    return studentCourses.some(
      (c) => normalize(c.courseName) === normalize(courseName)
    );
  };

  const canTakeCourseByCluster = (student, pointRow) => {
    const studentCluster = normalize(student.CLUSTER);
    const access = normalize(pointRow["Cluster Access"]);

    if (!access || access === "") return true;
    if (access === normalize("Both")) return true;

    if (access === normalize("Core") && studentCluster === normalize("Core")) {
      return true;
    }

    if (
      access === normalize("Computer Cluster") &&
      studentCluster === normalize("Computer Cluster")
    ) {
      return true;
    }

    return false;
  };

  const canTakeCourseByPrerequisite = (courseName, studentCourses) => {
    const key = normalize(courseName);

    if (!PREREQUISITES[key]) return true;

    return PREREQUISITES[key].every((req) =>
      hasCompleted(studentCourses, req)
    );
  };

  const getLevelColumns = (row) => {
    return Object.keys(row).filter((key) =>
      normalize(key).startsWith("level")
    );
  };

  const getStudentCourseDetails = (studentName, coursesRows) => {
    const list = [];

    coursesRows.forEach((row) => {
      const keys = Object.keys(row);
      const courseName = String(row[keys[0]] || "").trim();

      const studentColumn = keys.find(
        (k) => normalize(k) === normalize(studentName)
      );

      const raw = studentColumn ? row[studentColumn] : null;
      const value =
        raw === null || raw === undefined ? "" : String(raw).trim();

      if (courseName && !isEmptyValue(value)) {
        list.push({
          courseName,
          currentLevel: value,
          display: `${courseName} - ${value}`,
        });
      }
    });

    return list;
  };

  const resolveCurrentLevelIndex = (currentLevel, levelColumns) => {
    const current = normalize(currentLevel);

    let exact = levelColumns.findIndex((lvl) => normalize(lvl) === current);
    if (exact !== -1) return exact;

    exact = levelColumns.findIndex((lvl) => current.includes(normalize(lvl)));
    if (exact !== -1) return exact;

    const currentNumber = String(currentLevel || "").match(/\d+[a-zA-Z]?/);
    if (currentNumber) {
      const token = normalize(currentNumber[0]);
      const approx = levelColumns.findIndex((lvl) =>
        normalize(lvl).includes(token)
      );
      if (approx !== -1) return approx;
    }

    return -1;
  };

  const getFirstAvailableLevel = (pointRow, levelColumns) => {
    for (const level of levelColumns) {
      const pts = Number(pointRow[level] || 0);
      if (pts > 0) {
        return {
          nextLevel: level,
          points: pts,
        };
      }
    }
    return null;
  };

  const buildAvailableOptions = (student, studentCourseDetails, pointsRows) => {
    const studentCourseMap = {};

    studentCourseDetails.forEach((course) => {
      studentCourseMap[normalize(course.courseName)] = course.currentLevel;
    });

    const options = [];

    pointsRows.forEach((row) => {
      const keys = Object.keys(row);
      const courseName = String(row[keys[0]] || "").trim();
      if (!courseName) return;

      if (!canTakeCourseByCluster(student, row)) return;
      if (!canTakeCourseByPrerequisite(courseName, studentCourseDetails)) return;

      const levelColumns = getLevelColumns(row);
      if (levelColumns.length === 0) return;

      const courseKey = normalize(courseName);
      const studentCurrentLevel = studentCourseMap[courseKey];

      if (studentCurrentLevel) {
        const currentIndex = resolveCurrentLevelIndex(
          studentCurrentLevel,
          levelColumns
        );

        const nextIndex = currentIndex + 1;

        if (currentIndex !== -1 && nextIndex < levelColumns.length) {
          const nextLevel = levelColumns[nextIndex];
          const points = Number(row[nextLevel] || 0);

          if (points > 0) {
            options.push({
              courseName,
              source: "next-level",
              currentLevel: studentCurrentLevel,
              nextLevel,
              points,
            });
          }
        }
      } else {
        const first = getFirstAvailableLevel(row, levelColumns);

        if (first) {
          options.push({
            courseName,
            source: "new-course",
            currentLevel: null,
            nextLevel: first.nextLevel,
            points: first.points,
          });
        }
      }
    });

    return options.sort((a, b) => b.points - a.points);
  };

  const makeComboKey = (items) =>
    items
      .map((x) => `${x.courseName}-${x.nextLevel}-${x.points}`)
      .sort()
      .join("|");

  const buildCombinationSuggestions = (options, gap) => {
    if (options.length === 0) return [];

    const results = [];
    const seen = new Set();
    const maxDepth = Math.min(options.length, 5);

    const backtrack = (start, combo, total) => {
      if (combo.length > 0) {
        const key = makeComboKey(combo);

        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            courses: [...combo],
            total,
            diff: Math.abs(gap - total),
            excess: total - gap,
          });
        }
      }

      if (combo.length >= maxDepth) return;
      if (results.length >= 300) return;

      for (let i = start; i < options.length; i++) {
        combo.push(options[i]);
        backtrack(i + 1, combo, total + options[i].points);
        combo.pop();

        if (results.length >= 300) return;
      }
    };

    backtrack(0, [], 0);

    results.sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      if (a.courses.length !== b.courses.length) {
        return a.courses.length - b.courses.length;
      }
      return b.total - a.total;
    });

    return results.slice(0, 6);
  };

  const buildSuggestions = (student, avgActivity, pointsRows) => {
    const gap = Math.max(0, Math.ceil(avgActivity - student.ACTIVITY));
    const allOptions = buildAvailableOptions(
      student,
      student.COURSE_DETAILS,
      pointsRows
    );
    const combinations = buildCombinationSuggestions(allOptions, gap);

    return {
      gap,
      allOptions,
      combinations,
    };
  };

  const loadData = async () => {
    try {
      const [studentRes, courseRes, pointsRes] = await Promise.all([
        axios.get(STUDENT_URL),
        axios.get(COURSE_URL),
        axios.get(POINTS_URL),
      ]);

      const studentsRaw = studentRes.data || [];
      const coursesRaw = courseRes.data || [];
      const pointsRaw = pointsRes.data || [];

      const cleaned = studentsRaw.map((st) => {
        const safeName = String(st.Name || "").trim();
        const courseDetails = getStudentCourseDetails(safeName, coursesRaw);

        return {
          ...st,
          Name: safeName,
          POSITION: String(st.POSITION || "").trim(),
          JOINED: String(st.JOINED || "").trim(),
          CLUSTER: String(st.CLUSTER || "").trim(),
          ACTIVITY: Number(st["ACTIVITY POINT"] || 0),
          REWARD: Number(st["REWARD POINT"] || 0),
          LINKEDIN: st.LINKEDIN || st["LinkedIn"] || st["Linked In"] || "",
          GITHUB: st.GITHUB || st["GitHub"] || st["Git Hub"] || "",
          COURSES: courseDetails.map((c) => c.display),
          COURSE_DETAILS: courseDetails,
          COURSE_COUNT: courseDetails.length,
        };
      });

      const totalActivity = cleaned.reduce((sum, s) => sum + s.ACTIVITY, 0);
      const avgActivity =
        cleaned.length > 0 ? totalActivity / cleaned.length : 0;

      const enriched = cleaned.map((student) => {
        const suggestionData = buildSuggestions(student, avgActivity, pointsRaw);

        return {
          ...student,
          GAP_TO_AVG: suggestionData.gap,
          ALL_SUGGESTIONS: suggestionData.allOptions,
          SUGGESTION_COMBINATIONS: suggestionData.combinations,
          AVG_ACTIVITY: avgActivity,
        };
      });

      setStudents(enriched);
    } catch (error) {
      console.error("Error loading data:", error);
      setStudents([]);
    }
  };

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = (s.Name || "")
        .toLowerCase()
        .includes((search || "").toLowerCase());

      const matchesCluster =
        clusterFilter === "All" ? true : s.CLUSTER === clusterFilter;

      return matchesSearch && matchesCluster;
    });
  }, [students, search, clusterFilter]);

  const totalActivity = students.reduce((sum, s) => sum + s.ACTIVITY, 0);
  const avgActivity =
    students.length > 0 ? totalActivity / students.length : 0;

  const belowAverageCount = students.filter((s) => s.ACTIVITY < avgActivity).length;
  const topPerformersCount = students.filter((s) => s.ACTIVITY > avgActivity + 5).length;
  const coreCount = students.filter((s) => s.CLUSTER === "Core").length;
  const computerCount = students.filter(
    (s) => s.CLUSTER === "Computer Cluster"
  ).length;

  const topFive = [...filtered]
    .sort((a, b) => b.ACTIVITY - a.ACTIVITY)
    .slice(0, 5);

  const chartMax =
    topFive.length > 0 ? Math.max(...topFive.map((s) => s.ACTIVITY), 1) : 1;

  return (
    <div>
      <div className="dashboard-toolbar">
        <div className="filter-group">
          <div className="cluster-filter">
            <button
              className={clusterFilter === "All" ? "active" : ""}
              onClick={() => setClusterFilter("All")}
            >
              All
            </button>

            <button
              className={clusterFilter === "Core" ? "active" : ""}
              onClick={() => setClusterFilter("Core")}
            >
              Core
            </button>

            <button
              className={clusterFilter === "Computer Cluster" ? "active" : ""}
              onClick={() => setClusterFilter("Computer Cluster")}
            >
              Computer Cluster
            </button>
          </div>

          <div className="target-box">
            <label>Target Activity</label>
            <input
              type="number"
              min="1"
              value={targetActivity}
              onChange={(e) =>
                setTargetActivity(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>
        </div>

        <div className="export-buttons">
          <button onClick={() => exportToExcel(filtered)}>
            📊 Export Excel
          </button>
          <button onClick={() => exportToPDF(filtered)}>
            📄 Export PDF
          </button>
        </div>
      </div>

      <div className="stats stats-upgraded">
        <div className="stat-box">
          <h3>Total Activity</h3>
          <p>{totalActivity}</p>
        </div>

        <div className="stat-box">
          <h3>Average Activity</h3>
          <p>{avgActivity.toFixed(2)}</p>
        </div>

        <div className="stat-box">
          <h3>Below Average</h3>
          <p>{belowAverageCount}</p>
        </div>

        <div className="stat-box">
          <h3>Top Performers</h3>
          <p>{topPerformersCount}</p>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Top 5 Students by Activity</h3>

          <div className="mini-chart">
            {topFive.length > 0 ? (
              topFive.map((student, i) => (
                <div key={i} className="mini-chart-row">
                  <div className="mini-chart-label">{student.Name}</div>

                  <div className="mini-chart-track">
                    <div
                      className="mini-chart-fill"
                      style={{
                        width: `${(student.ACTIVITY / chartMax) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="mini-chart-value">{student.ACTIVITY}</div>
                </div>
              ))
            ) : (
              <div className="leader-empty">No data available for chart.</div>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Cluster Distribution</h3>

          <div className="distribution-grid">
            <div className="distribution-box">
              <span>Core</span>
              <strong>{coreCount}</strong>
            </div>

            <div className="distribution-box">
              <span>Computer Cluster</span>
              <strong>{computerCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid">
          {filtered.map((s, i) => (
            <StudentCard
              key={i}
              student={s}
              avgActivity={avgActivity}
              targetActivity={targetActivity}
              onClick={setSelected}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No matching students</h3>
          <p>Try a different search</p>
        </div>
      )}

      {selected && (
        <Modal
          student={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}