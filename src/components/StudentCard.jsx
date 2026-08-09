// src/components/StudentCard.jsx
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";

function getInitials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

function getStatus(activity, avgActivity) {
  const diff = activity - avgActivity;
  if (diff > 5)            return { text: "Top Performer",    className: "status-good",    icon: "🟢" };
  if (Math.abs(diff) <= 5) return { text: "Average",          className: "status-average", icon: "🟡" };
  return                          { text: "Needs Improvement", className: "status-low",     icon: "🔴" };
}

export default function StudentCard({ student, onClick, onEdit, onRoleChanged, avgActivity, targetActivity }) {
  const { auth, currentUser } = useAuth();

  const fixLink = (url) => (!url ? "#" : url.startsWith("http") ? url : `https://${url}`);

  const skills = [
    student.Primary1, student.Primary2,
    student.Secondary1, student.Secondary2,
    student.Spec1, student.Spec2,
  ].filter(Boolean);

  const status     = getStatus(student.ACTIVITY, avgActivity);
  const progress   = Math.min(100, targetActivity > 0 ? (student.ACTIVITY / targetActivity) * 100 : 0);
  const remaining  = Math.max(0, targetActivity - student.ACTIVITY);
  const cleanAuthEmail = (auth.email || "").toLowerCase().trim();
  const studentEmails = [
    student.email,
    student.personalEmail,
    student.bitEmail,
  ].filter(Boolean).map((e) => String(e).toLowerCase().trim());

  const isOwnStudent = Boolean(
    (currentUser && (
      (currentUser._id && student._id && String(currentUser._id) === String(student._id)) ||
      (currentUser.userId && student.userId && String(currentUser.userId) === String(student.userId)) ||
      (currentUser.enrolmentNumber && (student["ENROLMENT NUMBER"] === currentUser.enrolmentNumber || student.enrolmentNumber === currentUser.enrolmentNumber)) ||
      (currentUser.email && studentEmails.includes(String(currentUser.email).toLowerCase().trim()))
    )) ||
    (cleanAuthEmail && studentEmails.includes(cleanAuthEmail)) ||
    (auth.ownedEnrolment && (student["ENROLMENT NUMBER"] === auth.ownedEnrolment || student.enrolmentNumber === auth.ownedEnrolment))
  );

  const isAdminView = auth.role === "admin" && auth.viewMode === "admin";
  const canEdit     = isAdminView || isOwnStudent;
  const isUserAdmin = student.ROLE === "ADMIN" || student.role === "ADMIN";

  return (
    <div
      className="card"
      onClick={() => onClick(student)}
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* All content in a flex-grow area so button is pushed to bottom */}
      <div style={{ flex: 1 }}>

        <div className="card-top">
          <div className="profile-block">
            <div className="avatar">{getInitials(student.Name)}</div>

            <div className="profile-meta">
              <div className="name-row">
                <h2>{student.Name}</h2>
                <div className="social-icons">
                  {student.LINKEDIN && (
                    <a href={fixLink(student.LINKEDIN)} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()} title="LinkedIn">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png"
                        className="social-icon linkedin-icon" alt="LinkedIn"
                      />
                    </a>
                  )}
                  {student.GITHUB && (
                    <a href={fixLink(student.GITHUB)} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()} title="GitHub">
                      <img
                        src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                        className="social-icon github-icon" alt="GitHub"
                      />
                    </a>
                  )}
                </div>
              </div>

              <div className="card-meta-line" style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="badge">{student.POSITION}</span>
                <span className="cluster-pill">{student.CLUSTER || "Unknown"}</span>
                {isUserAdmin ? (
                  <span className="badge" style={{ background: "rgba(234, 179, 8, 0.2)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.4)" }}>
                    👑 Admin
                  </span>
                ) : (
                  <span className="badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                    🎓 Member
                  </span>
                )}
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
          <div className="mini-stat"><span>Activity</span><strong>{student.ACTIVITY}</strong></div>
          <div className="mini-stat"><span>Reward</span><strong>{student.REWARD}</strong></div>
        </div>

        <div className="progress-block">
          <div className="progress-head">
            <span>Activity Progress</span>
            <span>{student.ACTIVITY} / {targetActivity}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-foot"><span>Remaining: {remaining}</span></div>
        </div>

        {student.ACTIVITY < avgActivity  && <p className="low">↓ {difference} below avg</p>}
        {student.ACTIVITY > avgActivity  && <p className="high">↑ {difference} above avg</p>}
        {Math.abs(student.ACTIVITY - avgActivity) < 0.01 && <p className="equal">= At average</p>}

        <p className="course-count">Courses: {student.COURSE_COUNT}</p>

        <div className="skill-preview">
          {skills.map((x, i) => <span key={i}>{x}</span>)}
        </div>

      </div>

      {/* Edit button pinned to bottom */}
      {canEdit && (
        <button
          className="card-edit-btn"
          onClick={(e) => { e.stopPropagation(); onEdit(student); }}
        >
          ✏️ {isAdminView ? "Edit" : "Update My Card"}
        </button>
      )}
    </div>
  );
}
