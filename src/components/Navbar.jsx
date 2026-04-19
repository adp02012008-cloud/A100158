// src/components/Navbar.jsx
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

export default function Navbar({ page, setPage, dark, setDark, search, setSearch }) {
  const { auth, effectiveRole, logout, toggleViewMode } = useAuth();

  const roleLabel =
    auth.role === "admin"
      ? auth.viewMode === "admin"
        ? "👑 Admin"
        : "👁 Admin (Student View)"
      : auth.role === "student"
      ? "🎓 Student"
      : "👀 Public";

  return (
    <div className="nav">
      <div className="logo-wrap">
        <div className="logo-icon">
          <img src={logo} alt="Bug Slayers Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "14px" }} />
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
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            🏆 <span>Leaderboard</span>
          </button>

          <button onClick={() => setDark(!dark)}>
            {dark ? "☀️" : "🌙"}
          </button>

          {/* Admin-only: switch between admin and student view */}
          {auth.role === "admin" && (
            <button className="view-toggle-btn" onClick={toggleViewMode} title="Toggle view mode">
              {auth.viewMode === "admin" ? "🔀 Student View" : "🔀 Admin View"}
            </button>
          )}

          <button className="role-btn" type="button" disabled>
            {roleLabel}
          </button>

          <button type="button" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
}