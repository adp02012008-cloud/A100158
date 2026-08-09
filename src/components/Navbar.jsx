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
        : "👁 Member View"
      : auth.role === "student"
      ? "🎓 Member"
      : "👀 Public";

  const pageSearchLabels = {
    dashboard: "Search students…",
    leaderboard: "Search leaderboard…",
    "manage-users": "Search members…",
    "assign-tasks": "Search assignments…",
    "my-tasks": "Search my tasks…",
    hackathons: "Search hackathons…",
    gallery: "Search gallery…",
    projects: "Search projects…",
    certificates: "Search certificates…",
    opportunities: "Search opportunities…",
  };

  return (
    <header className="navbar-sticky-wrapper">
      <div className="navbar-card">
        {/* Top Header Row */}
        <div className="nav-top-row">
          <div className="logo-wrap" onClick={() => setPage("dashboard")} style={{ cursor: "pointer" }}>
            <div className="logo-icon">
              <img
                src={logo}
                alt="Bug Slayers Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "10px" }}
              />
            </div>
            <h1 className="logo">
              Bug <span className="highlight">Slayers</span>
            </h1>
          </div>

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
              type="button"
              className={`nav-link-btn ${page === "dashboard" ? "active" : ""}`}
              onClick={() => setPage("dashboard")}
            >
              🏠 <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`nav-link-btn ${page === "leaderboard" ? "active" : ""}`}
              onClick={() => setPage("leaderboard")}
            >
              🥇 <span>Leaderboard</span>
            </button>

            {auth.role === "admin" && auth.viewMode === "admin" && (
              <>
                <button
                  type="button"
                  className={`nav-link-btn ${page === "manage-users" ? "active" : ""}`}
                  onClick={() => setPage("manage-users")}
                >
                  👥 <span>Manage Members</span>
                </button>
                <button
                  type="button"
                  className={`nav-link-btn ${page === "assign-tasks" ? "active" : ""}`}
                  onClick={() => setPage("assign-tasks")}
                >
                  📋 <span>Assign Tasks</span>
                </button>
              </>
            )}

            {auth.role === "admin" && (
              <button
                type="button"
                className="view-toggle-btn"
                onClick={toggleViewMode}
                title="Toggle view mode"
              >
                {auth.viewMode === "admin" ? "🔀 Member View" : "🔀 Admin View"}
              </button>
            )}

            {auth.isLoggedIn && (
              <button
                type="button"
                className={`nav-link-btn ${page === "profile" ? "active" : ""}`}
                onClick={() => setPage("profile")}
              >
                👤 <span>Profile</span>
              </button>
            )}

            {auth.isLoggedIn && (
              <NotificationCenter onSelectTask={() => setPage("my-tasks")} />
            )}

            <button className="role-btn" type="button" disabled>{roleLabel}</button>
            <button className="logout-btn" type="button" onClick={logout}>🚪 Logout</button>
          </div>
        </div>

        {/* Secondary Subnav Row (Team Links) */}
        {isTeamMember && (
          <div className="team-subnav-row">
            <div className="team-subnav-label">
              <span>🔒</span>
              <strong>Private Team Hub</strong>
            </div>

            <div className="team-subnav-links">
              {TEAM_LINKS.map((link) => (
                <button
                  type="button"
                  key={link.key}
                  className={`subnav-link-btn ${page === link.key ? "active" : ""}`}
                  onClick={() => setPage(link.key)}
                >
                  <span>{link.icon}</span> {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
