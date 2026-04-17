import { useState } from "react";

export default function Modal({ student, onClose }) {
  const [tab, setTab] = useState("details");

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
            <div className="modal-header">
              <h2>{student.Name}</h2>

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

            <p>{student.POSITION}</p>
            <p>Joined: {student.JOINED}</p>
            <p>Activity: {student.ACTIVITY}</p>
            <p>Reward: {student.REWARD}</p>
            <p>Average Activity: {student.AVG_ACTIVITY?.toFixed(2)}</p>

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

            {student.COURSES.map((c, i) => (
              <div key={i} className="course">
                {c}
              </div>
            ))}
          </>
        )}

        {tab === "suggestions" && (
          <>
            <h3>Suggestions</h3>

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

                {student.SUGGESTION_COMBINATIONS?.length > 0 ? (
                  <>
                    <h4 className="other-title">Best possible patterns</h4>

                    {student.SUGGESTION_COMBINATIONS.map((combo, comboIndex) => (
                      <div key={comboIndex} className="suggestion-card">
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
                              Extra above target: <b>{combo.total - student.GAP_TO_AVG}</b>
                            </>
                          ) : (
                            <>
                              Still need: <b>{student.GAP_TO_AVG - combo.total}</b>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {student.ALL_SUGGESTIONS?.length > 0 && (
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