// src/components/Navbar.jsx
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import NotificationCenter from "./NotificationCenter";

const TEAM_LINKS = [
  { key: "my-tasks", icon: "📥", label: "My Tasks & Deliverables" },
  { key: "hackathons", icon: "🏆", label: "Hackathons" },
  { key: "gallery", icon: "🖼️", label: "Gallery" },
  { key: "projects", icon: "💻", label: "Projects" },
  { key: "certificates", icon: "📜", label: "Certificates" },
  { key: "opportunities", icon: "🚀", label: "Opportunities" },
];

export default function Navbar({ page, setPage, search, setSearch }) {
  const { auth, isTeamMember, logout, toggleViewMode } = useAuth();

  const roleLabel =
    auth.role === "admin"
      ? auth.viewMode === "admin"
        ? "👑 Admin"
        : "👁 Admin (Member View)"
      : auth.role === "student"
      ? "🎓 Team Member"
      : "👀 Public";

  const pageSearchLabels = {
    dashboard: "Search students…",
    leaderboard: "Search leaderboard…",
    "assign-tasks": "Search task assignments…",
    "my-tasks": "Search my tasks…",
    hackathons: "Search hackathons…",
    gallery: "Search gallery…",
    projects: "Search projects…",
    certificates: "Search certificates…",
    opportunities: "Search opportunities…",
  };

  return (
    <>
      <header className="nav">
        <div className="logo-wrap">
          <div className="logo-icon">
            <img
              src={logo}
              alt="Bug Slayers Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "14px" }}
            />
          </div>
          <h1 className="logo">
            Bug <span className="highlight">Slayers</span>
          </h1>
        </div>

        <div className="nav-right">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input
              className="search"
              placeholder={pageSearchLabels[page] || "Search…"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="controls">
            <button
              className={page === "dashboard" ? "active" : ""}
              onClick={() => setPage("dashboard")}
            >
              🏠 <span>Dashboard</span>
            </button>

            <button
              className={page === "leaderboard" ? "active" : ""}
              onClick={() => setPage("leaderboard")}
            >
              🥇 <span>Leaderboard</span>
            </button>

            {auth.role === "admin" && auth.viewMode === "admin" && (
              <>
                <button
                  className={page === "manage-users" ? "active" : ""}
                  onClick={() => setPage("manage-users")}
                >
                  👥 <span>Manage Members</span>
                </button>
                <button
                  className={page === "assign-tasks" ? "active" : ""}
                  onClick={() => setPage("assign-tasks")}
                >
                  📋 <span>Assign Tasks</span>
                </button>
              </>
            )}

            {auth.role === "admin" && (
              <button className="view-toggle-btn" onClick={toggleViewMode} title="Toggle admin/member view">
                {auth.viewMode === "admin" ? "🔀 Member View" : "🔀 Admin View"}
              </button>
            )}

            {auth.isLoggedIn && (
              <button
                className={page === "profile" ? "active" : ""}
                onClick={() => setPage("profile")}
              >
                👤 <span>Profile</span>
              </button>
            )}

            {auth.isLoggedIn && (
              <NotificationCenter onSelectTask={() => setPage("my-tasks")} />
            )}

            <button className="role-btn" type="button" disabled>{roleLabel}</button>
            <button type="button" onClick={logout}>🚪 Logout</button>
          </div>
        </div>
      </header>

      {isTeamMember && (
        <nav className="team-subnav" aria-label="Private team pages">
          <div className="team-subnav-label">
            <span>🔒</span>
            <div>
              <strong>Private Team Hub</strong>
              <small>Visible only to registered group members</small>
            </div>
          </div>

          <div className="team-subnav-links">
            {TEAM_LINKS.map((link) => (
              <button
                type="button"
                key={link.key}
                className={page === link.key ? "active" : ""}
                onClick={() => setPage(link.key)}
              >
                <span>{link.icon}</span> {link.label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
