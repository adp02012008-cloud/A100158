// src/components/Modal.jsx
import { useMemo, useState } from "react";

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

function getStatus(activity, avgActivity) {
  const diff = activity - avgActivity;
  if (diff > 5)            return { text: "Top Performer",    className: "status-good",    icon: "🟢" };
  if (Math.abs(diff) <= 5) return { text: "Average",          className: "status-average", icon: "🟡" };
  return                          { text: "Needs Improvement", className: "status-low",     icon: "🔴" };
}

export default function Modal({ student, onClose }) {
  if (!student) return null;

  const [tab, setTab]               = useState("details");
  const [priorityMode, setPriorityMode] = useState("best");

  const fixLink = (url) => (!url ? "#" : url.startsWith("http") ? url : `https://${url}`);

  const skills = [
    student.Primary1, student.Primary2,
    student.Secondary1, student.Secondary2,
    student.Spec1, student.Spec2,
  ].filter(Boolean);

  const status         = getStatus(student.ACTIVITY, student.AVG_ACTIVITY);
  const isBelowAverage = student.ACTIVITY < student.AVG_ACTIVITY;
  const isAboveAverage = student.ACTIVITY > student.AVG_ACTIVITY;

  const sortedCombos = useMemo(() => {
    const combos = [...(student.SUGGESTION_COMBINATIONS || [])];

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
  }, [student.SUGGESTION_COMBINATIONS, priorityMode]);

  const modeLabel =
    priorityMode === "best"    ? "⭐ BEST OPTION"    :
    priorityMode === "fastest" ? "⚡ FASTEST OPTION" : "💡 EASY OPTION";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(student["ENROLMENT NUMBER"] || "");
      alert("Enrolment ID copied!");
    } catch {
      alert("Copy failed — please copy manually.");
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>✕</button>

        <div className="tabs">
          {["details", "courses", "suggestions"].map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── DETAILS ─────────────────────────────────────────── */}
        {tab === "details" && (
          <>
            <div className="modal-header modal-profile">
              <div className="modal-profile-left">
                <div className="avatar large-avatar">{getInitials(student.Name)}</div>
                <div>
                  <h2>{student.Name}</h2>
                  <p>{student.POSITION}</p>
                  <div className={`status-tag ${status.className}`}>{status.icon} {status.text}</div>
                </div>
              </div>

              <div className="social-icons">
                {student.LINKEDIN && (
                  <a href={fixLink(student.LINKEDIN)} target="_blank" rel="noreferrer" title="LinkedIn">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
                      className="social-icon linkedin-icon" alt="LinkedIn" />
                  </a>
                )}
                {student.GITHUB && (
                  <a href={fixLink(student.GITHUB)} target="_blank" rel="noreferrer" title="GitHub">
                    <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                      className="social-icon github-icon" alt="GitHub" />
                  </a>
                )}
              </div>
            </div>

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
          <>
            <h3>Courses ({student.COURSE_COUNT})</h3>
            {(student.COURSES || []).map((c, i) => (
              <div key={i} className="course">{c}</div>
            ))}
            {student.COURSE_COUNT === 0 && (
              <p style={{ opacity: 0.6 }}>No courses enrolled yet.</p>
            )}
          </>
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
