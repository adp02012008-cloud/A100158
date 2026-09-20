import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import { isSuperAdminEmail, extractStudentEmails } from "../utils/roles";
import { auth as firebaseAuth } from "../firebase";
import UserAvatar from "./UserAvatar";

function getStatus(activity, avgActivity) {
  const diff = activity - avgActivity;
  if (diff > 5)            return { text: "Top Performer",    className: "status-good",    icon: "🟢" };
  if (Math.abs(diff) <= 5) return { text: "Average",          className: "status-average", icon: "🟡" };
  return                          { text: "Needs Improvement", className: "status-low",     icon: "🔴" };
}

function LinkedInIcon() {
  return (
    <svg className="social-icon linkedin-icon" viewBox="0 0 24 24" width="18" height="18" fill="#0077b5" xmlns="http://www.w3.org/2000/svg" aria-label="LinkedIn">
      <rect width="24" height="24" rx="4" fill="#0077b5" />
      <path d="M7.4 19H4.3V9.6h3.1V19zM5.85 8.28c-1 0-1.8-.81-1.8-1.8 0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8c0 .99-.8 1.8-1.8 1.8zM19.7 19h-3.1v-4.8c0-1.15-.02-2.63-1.6-2.63-1.61 0-1.85 1.25-1.85 2.55V19h-3.1V9.6h2.98v1.28h.04c.42-.79 1.43-1.62 2.96-1.62 3.16 0 3.75 2.08 3.75 4.79V19z" fill="#ffffff" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="social-icon github-icon" viewBox="0 0 24 24" width="18" height="18" fill="#ffffff" xmlns="http://www.w3.org/2000/svg" aria-label="GitHub">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export default function StudentCard({ student, onClick, onEdit, onRoleChanged, avgActivity, targetActivity = 0 }) {
  if (student && (isSuperAdminEmail(student.email) || isSuperAdminEmail(student.emailId))) {
    return null;
  }
  const { auth, currentUser } = useAuth();

  const fixLink = (url) => (!url ? "#" : url.startsWith("http") ? url : `https://${url}`);


  const skills = [
    student.Primary1, student.Primary2,
    student.Secondary1, student.Secondary2,
    student.Spec1, student.Spec2,
    ...(Array.isArray(student.skills) ? student.skills : []),
    ...(Array.isArray(student.primaryInterests) ? student.primaryInterests : []),
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

  const status     = getStatus(student.ACTIVITY, avgActivity);
  const progress   = Math.min(100, targetActivity > 0 ? (student.ACTIVITY / targetActivity) * 100 : 0);
  const remaining  = Math.max(0, targetActivity - student.ACTIVITY);
  const difference = Math.abs((student.ACTIVITY || 0) - (avgActivity || 0)).toFixed(1);
  const cleanAuthEmail = (auth?.email || "").toLowerCase().trim();
  const fbEmail = (firebaseAuth?.currentUser?.email || "").toLowerCase().trim();

  // All student emails from all card fields
  const studentEmails = [
    student.email,
    student.personalEmail,
    student.bitEmail,
    ...extractStudentEmails(student),
  ].filter(Boolean).map((e) => String(e).toLowerCase().trim());

  // All current user emails
  const currentAuthEmails = [
    currentUser?.email,
    currentUser?.personalEmail,
    currentUser?.bitEmail,
    cleanAuthEmail,
    fbEmail,
  ].filter(Boolean).map((e) => String(e).toLowerCase().trim());

  const emailMatches = studentEmails.some((se) => currentAuthEmails.includes(se));

  const cleanEnrol = (val) => String(val || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const userEnrol = cleanEnrol(currentUser?.enrolmentNumber || auth?.ownedEnrolment);
  const cardEnrol = cleanEnrol(student["ENROLMENT NUMBER"] || student.enrolmentNumber || student.userId);
  const enrolMatches = Boolean(userEnrol && cardEnrol && userEnrol === cardEnrol);

  const idMatches = Boolean(
    (currentUser?._id && student._id && String(currentUser._id) === String(student._id)) ||
    (currentUser?.userId && student.userId && String(currentUser.userId) === String(student.userId))
  );

  const cleanName = (val) => String(val || "").trim().toLowerCase();
  const studentNameStr = cleanName(student.Name || student.name);
  const currentUserNameStr = cleanName(currentUser?.name);
  const nameMatches = Boolean(
    currentUserNameStr &&
    studentNameStr &&
    (studentNameStr === currentUserNameStr || studentNameStr.includes(currentUserNameStr) || currentUserNameStr.includes(studentNameStr))
  );

  const isOwnStudent = Boolean(
    idMatches ||
    emailMatches ||
    enrolMatches ||
    (nameMatches && (
      emailMatches ||
      enrolMatches ||
      (cleanAuthEmail && studentEmails.some((se) => se.split("@")[1] && se.split("@")[1] === cleanAuthEmail.split("@")[1]))
    ))
  );

  const isAdminView = auth?.role === "admin" && auth?.viewMode === "admin";
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
            <UserAvatar
              src={student.avatar || student.photoURL}
              name={student.Name}
              className="avatar"
              size={52}
            />

            <div className="profile-meta">
              <div className="name-row">
                <h2>{student.Name}</h2>
                <div className="social-icons">
                  {student.LINKEDIN && (
                    <a href={fixLink(student.LINKEDIN)} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()} title="LinkedIn">
                      <LinkedInIcon />
                    </a>
                  )}
                  {student.GITHUB && (
                    <a href={fixLink(student.GITHUB)} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()} title="GitHub">
                      <GitHubIcon />
                    </a>
                  )}
                </div>
              </div>

              <div className="card-meta-line" style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <span className="badge">{student.POSITION}</span>
                <span className="cluster-pill">{student.CLUSTER || "Unknown"}</span>
                {isAdminView && isUserAdmin && (
                  <span className="badge" style={{ background: "rgba(234, 179, 8, 0.2)", color: "#eab308", border: "1px solid rgba(234, 179, 8, 0.4)" }}>
                    👑 Admin
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

        {targetActivity > 0 && (
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
        )}

        {student.ACTIVITY < avgActivity  && <p className="low">↓ {difference} below avg</p>}
        {student.ACTIVITY > avgActivity  && <p className="high">↑ {difference} above avg</p>}
        {Math.abs(student.ACTIVITY - avgActivity) < 0.01 && <p className="equal">= At average</p>}



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
