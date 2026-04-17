export default function StudentCard({ student, onClick, avgActivity }) {
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

  return (
    <div className="card" onClick={() => onClick(student)}>
      <div className="card-top">
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

        <span className="badge">{student.POSITION}</span>
      </div>

      <p className="id">{student["ENROLMENT NUMBER"]}</p>
      <p className="joined">Joined: {student.JOINED}</p>

      <p>Activity: {student.ACTIVITY}</p>
      <p>Reward: {student.REWARD}</p>

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