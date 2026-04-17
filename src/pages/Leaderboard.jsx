import { useEffect, useState } from "react";
import axios from "axios";
import { STUDENT_URL } from "../utils/api";

export default function Leaderboard({ search }) {
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("activity");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await axios.get(STUDENT_URL);

      const cleaned = res.data.map((s) => ({
        ...s,
        Name: (s.Name || "").trim(),
        ACTIVITY: Number(s["ACTIVITY POINT"] || 0),
        REWARD: Number(s["REWARD POINT"] || 0),
        POSITION: (s.POSITION || "").trim(),
      }));

      setStudents(cleaned);
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
    }
  };

  const filteredStudents = students.filter((s) =>
    (s.Name || "").toLowerCase().includes((search || "").toLowerCase())
  );

  const sorted = [...filteredStudents].sort((a, b) =>
    filter === "activity"
      ? b.ACTIVITY - a.ACTIVITY
      : b.REWARD - a.REWARD
  );

  const topThree = sorted.slice(0, 3);
  const others = sorted.slice(3);

  return (
    <div className="leaderboard-page">
      <div className="leader-header">
        <div>
          <h1 className="leader-title">Leaderboard</h1>
          <p className="leader-subtitle">
            Track top performers by{" "}
            {filter === "activity" ? "activity" : "reward"} points
          </p>
        </div>

        <div className="custom-dropdown">
          <div
            onClick={() => setOpen(!open)}
            className="dropdown-selected"
          >
            {filter === "activity" ? "Activity Points" : "Reward Points"}
            <span className="arrow">{open ? "▲" : "▼"}</span>
          </div>

          {open && (
            <div className="dropdown-menu">
              <div
                onClick={() => {
                  setFilter("activity");
                  setOpen(false);
                }}
              >
                Activity Points
              </div>

              <div
                onClick={() => {
                  setFilter("reward");
                  setOpen(false);
                }}
              >
                Reward Points
              </div>
            </div>
          )}
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="top-three-section">
          {topThree.map((s, i) => (
            <div
              key={i}
              className={`top-card rank-animate ${
                i === 0 ? "top-first" : i === 1 ? "top-second" : "top-third"
              }`}
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <div className="top-rank-badge">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </div>

              <div className="top-rank-number">#{i + 1}</div>

              <h2>{s.Name}</h2>

              {s.POSITION && <p className="top-position">{s.POSITION}</p>}

              <div className="top-points-box">
                <div>
                  <span>Activity</span>
                  <strong>{s.ACTIVITY}</strong>
                </div>

                <div>
                  <span>Reward</span>
                  <strong>{s.REWARD}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="leaderboard-grid modern-leaderboard-grid">
        {others.map((s, i) => (
          <div
            key={i}
            className="leader-row-card rank-animate"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="leader-row-left">
              <div className="leader-row-rank">#{i + 4}</div>

              <div className="leader-row-info">
                <h2>{s.Name}</h2>
                {s.POSITION && <p>{s.POSITION}</p>}
              </div>
            </div>

            <div className="leader-row-right">
              <div className="leader-pill">
                <span>Activity</span>
                <b>{s.ACTIVITY}</b>
              </div>

              <div className="leader-pill">
                <span>Reward</span>
                <b>{s.REWARD}</b>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="leader-empty">No students found.</div>
      )}
    </div>
  );
}