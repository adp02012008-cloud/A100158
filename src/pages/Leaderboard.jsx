import { useEffect, useState } from "react";
import axios from "axios";
import { STUDENT_URL } from "../utils/api";

export default function Leaderboard() {
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("activity");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await axios.get(STUDENT_URL);

    const cleaned = res.data.map((s) => ({
      ...s,
      Name: (s.Name || "").trim(),
      ACTIVITY: Number(s["ACTIVITY POINT"] || 0),
      REWARD: Number(s["REWARD POINT"] || 0),
    }));

    setStudents(cleaned);
  };

  const sorted = [...students].sort((a, b) =>
    filter === "activity"
      ? b.ACTIVITY - a.ACTIVITY
      : b.REWARD - a.REWARD
  );

  return (
    <div className="leaderboard-page">
      <div className="leader-top">

        {/* 🔥 CUSTOM DROPDOWN */}
        <div className="custom-dropdown">
          <div
            onClick={() => setOpen(!open)}
            className="dropdown-selected"
          >
            {filter === "activity"
              ? "Activity Points"
              : "Reward Points"}
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

      <div className="leaderboard-grid">
        {sorted.map((s, i) => (
          <div key={i} className="leader-card">
            <div className="leader-rank">#{i + 1}</div>

            <div className="leader-content">
              <h2>{s.Name}</h2>

              <div className="leader-points">
                <div className="leader-stat">
                  <span>Activity</span>
                  <b>{s.ACTIVITY}</b>
                </div>

                <div className="leader-stat">
                  <span>Reward</span>
                  <b>{s.REWARD}</b>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}