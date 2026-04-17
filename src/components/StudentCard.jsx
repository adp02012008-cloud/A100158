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

export default function StudentCard({
  student,
  onClick,
  avgActivity,
  targetActivity,
}) {
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

  const difference = Math.abs(student.ACTIVITY - avgActivity).toFixed(1);
  const status = getStatus(student.ACTIVITY, avgActivity);
  const progress = Math.min(
    100,
    targetActivity > 0 ? (student.ACTIVITY / targetActivity) * 100 : 0
  );
  const remaining = Math.max(0, targetActivity - student.ACTIVITY);

  return (
    <div className="card" onClick={() => onClick(student)}>
      <div className="card-top">
        <div className="profile-block">
          <div className="avatar">{getInitials(student.Name)}</div>

          <div className="profile-meta">
            <div className="name-row">
              <h2>{student.Name}</h2>

              <div className="social-icons">
                {student.LINKEDIN && (
                  <a
                    href={fixLink(student.LINKEDIN)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
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

            <div className="card-meta-line">
              <span className="badge">{student.POSITION}</span>
              <span className="cluster-pill">{student.CLUSTER || "Unknown"}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="id">{student["ENROLMENT NUMBER"]}</p>
      <p className="joined">Joined: {student.JOINED}</p>

      <div className={`status-tag ${status.className}`}>
        {status.icon} {status.text}
      </div>

      <div className="mini-stats">
        <div className="mini-stat">
          <span>Activity</span>
          <strong>{student.ACTIVITY}</strong>
        </div>

        <div className="mini-stat">
          <span>Reward</span>
          <strong>{student.REWARD}</strong>
        </div>
      </div>

      <div className="progress-block">
        <div className="progress-head">
          <span>Activity Progress</span>
          <span>
            {student.ACTIVITY} / {targetActivity}
          </span>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="progress-foot">
          <span>Remaining: {remaining}</span>
        </div>
      </div>

      {student.ACTIVITY < avgActivity && (
        <p className="low">↓ {difference} below avg</p>
      )}

      {student.ACTIVITY > avgActivity && (
        <p className="high">↑ {difference} above avg</p>
      )}

      {Math.abs(student.ACTIVITY - avgActivity) < 0.01 && (
        <p className="equal">= At average</p>
      )}

      <p className="course-count">Courses: {student.COURSE_COUNT}</p>

      <div className="skill-preview">
        {skills.map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </div>
    </div>
  );
}