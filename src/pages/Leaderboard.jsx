// src/pages/Leaderboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../utils/api";
import { isSuperAdminEmail } from "../utils/roles";

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

export default function Leaderboard({ search }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("activity");
  const [open, setOpen] = useState(false);
  const [rankChanges, setRankChanges] = useState({});
  const previousRanksRef = useRef({});

  useEffect(() => {
    setLoading(true);
    apiFetch("/users/dashboard")
      .then((res) => {
        const cleaned = (res.users || [])
          .filter((s) => !isSuperAdminEmail(s.email) && !isSuperAdminEmail(s.emailId))
          .map((s) => ({
            ...s,
            Name: (s.Name || s.name || "").trim(),
            ACTIVITY: Number(s["ACTIVITY POINT"] ?? s.activityPoints ?? 0),
            REWARD: Number(s["REWARD POINT"] ?? s.rewardPoints ?? 0),
            POSITION: (s.POSITION || s.position || "").trim(),
          }));
        setStudents(cleaned);
      })
      .catch((err) => console.error("Leaderboard load error from MongoDB:", err))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() =>
    students.filter((s) => (s.Name || "").toLowerCase().includes((search || "").toLowerCase())),
    [students, search]
  );

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => filter === "activity" ? b.ACTIVITY - a.ACTIVITY : b.REWARD - a.REWARD),
    [filtered, filter]
  );

  useEffect(() => {
    const current = {};
    const changes = {};
    sorted.forEach((s, i) => {
      current[s.Name] = i + 1;
      const prev = previousRanksRef.current[s.Name];
      changes[s.Name] = prev ? prev - (i + 1) : 0;
    });
    setRankChanges(changes);
    previousRanksRef.current = current;
  }, [sorted]);

  const topThree = sorted.slice(0, 3);
  const others = sorted.slice(3);

  const getMovement = (name) => {
    const c = rankChanges[name] || 0;
    if (c > 0) return `↑ +${c}`;
    if (c < 0) return `↓ ${c}`;
    return "• 0";
  };

  return (
    <div className="leaderboard-page">
      <div className="leader-header">
        <div>
          <h1 className="leader-title">Leaderboard</h1>
          <p className="leader-subtitle">
            Top performers by {filter === "activity" ? "activity" : "reward"} points
          </p>
        </div>

        <div className="custom-dropdown">
          <div className="dropdown-selected" onClick={() => setOpen(!open)}>
            {filter === "activity" ? "Activity Points" : "Reward Points"}
            <span className="arrow">{open ? "▲" : "▼"}</span>
          </div>
          {open && (
            <div className="dropdown-menu">
              <div onClick={() => { setFilter("activity"); setOpen(false); }}>Activity Points</div>
              <div onClick={() => { setFilter("reward"); setOpen(false); }}>Reward Points</div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", background: "rgba(15, 23, 42, 0.4)", borderRadius: "20px", border: "1px solid rgba(255, 255, 255, 0.08)", margin: "20px 0" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px", animation: "spin 1.5s linear infinite" }}>⚡</div>
          <h3 style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "800", margin: "0 0 8px 0" }}>
            Loading Leaderboard Rankings…
          </h3>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Calculating activity and reward points performance data. Please wait a moment.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {sorted.length > 0 && (
            <div className="top-three-section">
              {topThree.map((s, i) => (
                <div key={i}
                  className={`top-card rank-animate ${i === 0 ? "top-first" : i === 1 ? "top-second" : "top-third"}`}
                  style={{ animationDelay: `${i * 0.12}s` }}>
                  <div className="top-card-head">
                    <div className="top-rank-badge">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                    {i === 0 && <div className="crown-badge">👑</div>}
                  </div>
                  <div className="leader-avatar large">{getInitials(s.Name)}</div>
                  <div className="top-rank-number">#{i + 1}</div>
                  <h2>{s.Name}</h2>
                  {s.POSITION && <p className="top-position">{s.POSITION}</p>}
                  <div className="rank-change-chip">{getMovement(s.Name)} positions</div>
                  <div className="top-points-box">
                    <div><span>Activity</span><strong>{s.ACTIVITY}</strong></div>
                    <div><span>Reward</span><strong>{s.REWARD}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Remaining */}
          {sorted.length > 0 ? (
            <div className="leaderboard-grid modern-leaderboard-grid">
              {others.map((s, i) => (
                <div key={i} className="leader-row-card rank-animate" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="leader-row-left">
                    <div className="leader-row-rank">#{i + 4}</div>
                    <div className="leader-avatar">{getInitials(s.Name)}</div>
                    <div className="leader-row-info">
                      <h2>{s.Name}</h2>
                      {s.POSITION && <p>{s.POSITION}</p>}
                      <div className="rank-change-text">{getMovement(s.Name)} positions</div>
                    </div>
                  </div>
                  <div className="leader-row-right">
                    <div className="leader-pill"><span>Activity</span><b>{s.ACTIVITY}</b></div>
                    <div className="leader-pill"><span>Reward</span><b>{s.REWARD}</b></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3>No matching students</h3>
              <p>Try a different search</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
