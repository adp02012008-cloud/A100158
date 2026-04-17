import { useMemo, useState } from "react";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("");
}

function getStatus(activity, avgActivity) {
  const diff = activity - avgActivity;

  if (diff > 5) {
    return { text: "Top Performer", className: "status-good", icon: "🟢" };
  }

  if (Math.abs(diff) <= 5) {
    return { text: "Average", className: "status-average", icon: "🟡" };
  }

  return { text: "Needs Improvement", className: "status-low", icon: "🔴" };
}

export default function Modal({ student, onClose }) {
  if (!student) return null;

  const [tab, setTab] = useState("details");
  const [priorityMode, setPriorityMode] = useState("best");

  const fixLink = (url) => {
    if (!url) return "#";
    return url.startsWith("http") ? url : `https://${url}`;
  };

  const skills = [
    student.Primary1,
    student.Primary2,
    student.Secondary1,
    student.Secondary2,
    student.Spec1,
    student.Spec2,
  ].filter(Boolean);

  const isBelowAverage = student.ACTIVITY < student.AVG_ACTIVITY;
  const isAboveAverage = student.ACTIVITY > student.AVG_ACTIVITY;
  const status = getStatus(student.ACTIVITY, student.AVG_ACTIVITY);

  const sortedCombos = useMemo(() => {
    const combos = [...(student.SUGGESTION_COMBINATIONS || [])];

    if (priorityMode === "fastest") {
      return combos.sort((a, b) => {
        if (a.courses.length !== b.courses.length) {
          return a.courses.length - b.courses.length;
        }
        return a.diff - b.diff;
      });
    }

    if (priorityMode === "easy") {
      const score = (combo) => {
        const nextLevelCount = combo.courses.filter(
          (x) => x.source === "next-level"
        ).length;
        return {
          nextLevelCount,
          count: combo.courses.length,
          diff: combo.diff,
        };
      };

      return combos.sort((a, b) => {
        const A = score(a);
        const B = score(b);

        if (A.nextLevelCount !== B.nextLevelCount) {
          return B.nextLevelCount - A.nextLevelCount;
        }
        if (A.count !== B.count) return A.count - B.count;
        return A.diff - B.diff;
      });
    }

    return combos.sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      if (a.courses.length !== b.courses.length) {
        return a.courses.length - b.courses.length;
      }
      return b.total - a.total;
    });
  }, [student.SUGGESTION_COMBINATIONS, priorityMode]);

  const modeLabel =
    priorityMode === "best"
      ? "⭐ BEST OPTION"
      : priorityMode === "fastest"
      ? "⚡ FASTEST OPTION"
      : "💡 EASY OPTION";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(student["ENROLMENT NUMBER"] || "");
      alert("ID copied");
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="tabs">
          <button
            className={tab === "details" ? "active" : ""}
            onClick={() => setTab("details")}
          >
            Details
          </button>

          <button
            className={tab === "courses" ? "active" : ""}
            onClick={() => setTab("courses")}
          >
            Courses
          </button>

          <button
            className={tab === "suggestions" ? "active" : ""}
            onClick={() => setTab("suggestions")}
          >
            Suggestions
          </button>
        </div>

        {tab === "details" && (
          <>
            <div className="modal-header modal-profile">
              <div className="modal-profile-left">
                <div className="avatar large-avatar">{getInitials(student.Name)}</div>

                <div>
                  <h2>{student.Name}</h2>
                  <p>{student.POSITION}</p>
                  <div className={`status-tag ${status.className}`}>
                    {status.icon} {status.text}
                  </div>
                </div>
              </div>

              <div className="social-icons">
                {student.LINKEDIN && (
                  <a
                    href={fixLink(student.LINKEDIN)}
                    target="_blank"
                    rel="noreferrer"
                    title="LinkedIn"
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
                      className="social-icon linkedin-icon"
                      alt="LinkedIn"
                    />
                  </a>
                )}

                {student.GITHUB && (
                  <a
                    href={fixLink(student.GITHUB)}
                    target="_blank"
                    rel="noreferrer"
                    title="GitHub"
                  >
                    <img
                      src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                      className="social-icon github-icon"
                      alt="GitHub"
                    />
                  </a>
                )}
              </div>
            </div>

            <div className="quick-actions">
              {student.LINKEDIN && (
                <a
                  className="quick-action-btn"
                  href={fixLink(student.LINKEDIN)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open LinkedIn
                </a>
              )}

              {student.GITHUB && (
                <a
                  className="quick-action-btn"
                  href={fixLink(student.GITHUB)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open GitHub
                </a>
              )}

              <button className="quick-action-btn" onClick={copyId}>
                Copy ID
              </button>
            </div>

            <div className="modal-stats-grid">
              <div className="modal-stat-card">
                <span>Joined</span>
                <strong>{student.JOINED}</strong>
              </div>

              <div className="modal-stat-card">
                <span>Activity</span>
                <strong>{student.ACTIVITY}</strong>
              </div>

              <div className="modal-stat-card">
                <span>Reward</span>
                <strong>{student.REWARD}</strong>
              </div>

              <div className="modal-stat-card">
                <span>Average</span>
                <strong>{student.AVG_ACTIVITY?.toFixed(2)}</strong>
              </div>
            </div>

            <div className="skill-preview">
              {skills.map((x, i) => (
                <span key={i}>{x}</span>
              ))}
            </div>
          </>
        )}

        {tab === "courses" && (
          <>
            <h3>Courses ({student.COURSE_COUNT})</h3>

            {(student.COURSES || []).map((c, i) => (
              <div key={i} className="course">
                {c}
              </div>
            ))}
          </>
        )}

        {tab === "suggestions" && (
          <>
            <div className="suggestion-topbar">
              <h3>Suggestions</h3>

              <select
                className="priority-select"
                value={priorityMode}
                onChange={(e) => setPriorityMode(e.target.value)}
              >
                <option value="best">Best Option</option>
                <option value="fastest">Fastest Option</option>
                <option value="easy">Easy Option</option>
              </select>
            </div>

            {isAboveAverage && (
              <div className="suggestion-summary good-summary">
                This student is already{" "}
                <b>{(student.ACTIVITY - student.AVG_ACTIVITY).toFixed(1)}</b>{" "}
                points above average.
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

                    {sortedCombos.map((combo, comboIndex) => (
                      <div key={comboIndex} className="suggestion-card">
                        {comboIndex === 0 && (
                          <div className="priority-badge">{modeLabel}</div>
                        )}

                        <div className="suggestion-course">
                          Option {comboIndex + 1}
                        </div>

                        {combo.courses.map((item, i) => (
                          <div key={i} className="suggestion-line">
                            {item.courseName} → <b>{item.nextLevel}</b> (+{item.points})
                            {item.source === "next-level" && (
                              <span> — next level</span>
                            )}
                            {item.source === "new-course" && (
                              <span> — new course</span>
                            )}
                          </div>
                        ))}

                        <div className="suggestion-points">
                          Total: {combo.total} points
                        </div>

                        <div className="suggestion-line">
                          {combo.total >= student.GAP_TO_AVG ? (
                            <>
                              Extra above target:{" "}
                              <b>{combo.total - student.GAP_TO_AVG}</b>
                            </>
                          ) : (
                            <>
                              Still need: <b>{student.GAP_TO_AVG - combo.total}</b>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {(student.ALL_SUGGESTIONS || []).length > 0 && (
                      <>
                        <h4 className="other-title">Available options</h4>

                        {student.ALL_SUGGESTIONS.map((item, i) => (
                          <div key={i} className="course">
                            {item.courseName} → {item.nextLevel} (+{item.points})
                            {item.source === "next-level"
                              ? " — next level"
                              : " — new course"}
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