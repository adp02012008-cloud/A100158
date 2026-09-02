// src/components/Navbar.jsx - Executive SaaS Navigation Bar
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import NotificationCenter from "./NotificationCenter";

// Crisp modern SVG vector icons
const Icons = {
  Dashboard: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  Leaderboard: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34" />
      <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  TeamHub: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  AdminTools: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Members: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Tasks: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  Reviews: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  ),
  MyTasks: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  Hackathons: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  ),
  Gallery: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  Projects: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Certificates: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  ),
  Opportunities: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Profile: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Logout: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  SwitchView: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M4 20L21 3" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  ),
  Search: () => (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="nav-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Check: () => (
    <svg className="nav-check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
};

const TEAM_LINKS = [
  { key: "my-tasks", icon: Icons.MyTasks, label: "Tasks & Deliverables", desc: "View assignments & submission status" },
  { key: "hackathons", icon: Icons.Hackathons, label: "Hackathons", desc: "Team competitions & track records" },
  { key: "gallery", icon: Icons.Gallery, label: "Gallery", desc: "Event photos & team memories" },
  { key: "projects", icon: Icons.Projects, label: "Projects", desc: "Featured student applications & code" },
  { key: "certificates", icon: Icons.Certificates, label: "Certificates", desc: "Credentials & verified completions" },
  { key: "opportunities", icon: Icons.Opportunities, label: "Opportunities", desc: "Jobs, internships & referrals" },
];

const ADMIN_LINKS = [
  { key: "manage-users", icon: Icons.Members, label: "Manage Members", desc: "User permissions & directory" },
  { key: "assign-tasks", icon: Icons.Tasks, label: "Assign Tasks", desc: "Create & distribute task assignments" },
  { key: "review-deliverables", icon: Icons.Reviews, label: "Review Deliverables", desc: "Evaluate student code submissions" },
];

export default function Navbar({ page, setPage, search, setSearch }) {
  const { auth, currentUser, isTeamMember, logout, toggleViewMode } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const teamDropdownRef = useRef(null);
  const adminDropdownRef = useRef(null);
  const userDropdownRef = useRef(null);

  const handleNavClick = (targetPage) => {
    setPage(targetPage);
    setMobileMenuOpen(false);
    setTeamDropdownOpen(false);
    setAdminDropdownOpen(false);
    setUserDropdownOpen(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target)) {
        setTeamDropdownOpen(false);
      }
      if (adminDropdownRef.current && !adminDropdownRef.current.contains(e.target)) {
        setAdminDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = auth.role === "admin";
  const isAdminView = isAdmin && auth.viewMode === "admin";

  const isTeamPageActive = TEAM_LINKS.some((l) => l.key === page);
  const currentTeamLink = TEAM_LINKS.find((l) => l.key === page);

  const isAdminPageActive = ADMIN_LINKS.some((l) => l.key === page);
  const currentAdminLink = ADMIN_LINKS.find((l) => l.key === page);

  const displayName = currentUser?.name || auth.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const pageSearchLabels = {
    dashboard: "Search students, courses…",
    leaderboard: "Search leaderboard…",
    "manage-users": "Search members…",
    "assign-tasks": "Search tasks…",
    "review-deliverables": "Search submissions…",
    "my-tasks": "Search assigned tasks…",
    hackathons: "Search hackathons…",
    gallery: "Search gallery…",
    projects: "Search projects…",
    certificates: "Search certificates…",
    opportunities: "Search opportunities…",
  };

  return (
    <header className="navbar-sticky-wrapper">
      <div className={`navbar-card ${mobileMenuOpen ? "menu-open" : ""}`}>
        <div className="nav-main-bar">
          {/* Left: Brand Identity */}
          <div className="nav-brand-section">
            <div
              className="logo-wrap"
              onClick={() => handleNavClick("dashboard")}
              role="button"
              tabIndex={0}
            >
              <div className="logo-icon-glow">
                <img src={logo} alt="Bug Slayers" className="logo-img" />
              </div>
              <div className="brand-text">
                <span className="brand-title">
                  Bug <span className="highlight-text">Slayers</span>
                </span>
                <span className={`brand-badge ${isAdmin ? "admin" : isTeamMember ? "member" : "public"}`}>
                  {isAdmin ? (auth.viewMode === "admin" ? "Admin" : "Member View") : isTeamMember ? "Member" : "Public"}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Desktop Navigation Tabs */}
          <nav className="nav-links-center" aria-label="Primary Navigation">
            <button
              type="button"
              className={`nav-tab-btn ${page === "dashboard" ? "active" : ""}`}
              onClick={() => handleNavClick("dashboard")}
            >
              <Icons.Dashboard />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              className={`nav-tab-btn ${page === "leaderboard" ? "active" : ""}`}
              onClick={() => handleNavClick("leaderboard")}
            >
              <Icons.Leaderboard />
              <span>Leaderboard</span>
            </button>

            {/* Team Hub Dropdown */}
            {isTeamMember && (
              <div className="nav-dropdown-wrap" ref={teamDropdownRef}>
                <button
                  type="button"
                  className={`nav-tab-btn dropdown-trigger ${isTeamPageActive ? "active" : ""}`}
                  onClick={() => {
                    setTeamDropdownOpen(!teamDropdownOpen);
                    setAdminDropdownOpen(false);
                    setUserDropdownOpen(false);
                  }}
                  aria-expanded={teamDropdownOpen}
                >
                  <Icons.TeamHub />
                  <span>{isTeamPageActive && currentTeamLink ? currentTeamLink.label : "Team Hub"}</span>
                  <Icons.ChevronDown />
                </button>

                {teamDropdownOpen && (
                  <div className="nav-dropdown-menu luxury-dropdown">
                    <div className="dropdown-header">Private Team Workspace</div>
                    <div className="dropdown-menu-list">
                      {TEAM_LINKS.map((link) => {
                        const IconComp = link.icon;
                        const isCurrent = page === link.key;
                        return (
                          <button
                            key={link.key}
                            type="button"
                            className={`luxury-dropdown-item ${isCurrent ? "active" : ""}`}
                            onClick={() => handleNavClick(link.key)}
                          >
                            <div className="dropdown-icon-box">
                              <IconComp />
                            </div>
                            <div className="dropdown-item-meta">
                              <span className="dropdown-item-label">{link.label}</span>
                              <span className="dropdown-item-desc">{link.desc}</span>
                            </div>
                            {isCurrent && <Icons.Check />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin Tools Dropdown (when in Admin mode) */}
            {isAdminView && (
              <div className="nav-dropdown-wrap" ref={adminDropdownRef}>
                <button
                  type="button"
                  className={`nav-tab-btn dropdown-trigger ${isAdminPageActive ? "active" : ""}`}
                  onClick={() => {
                    setAdminDropdownOpen(!adminDropdownOpen);
                    setTeamDropdownOpen(false);
                    setUserDropdownOpen(false);
                  }}
                  aria-expanded={adminDropdownOpen}
                >
                  <Icons.AdminTools />
                  <span>{isAdminPageActive && currentAdminLink ? currentAdminLink.label : "Admin Tools"}</span>
                  <Icons.ChevronDown />
                </button>

                {adminDropdownOpen && (
                  <div className="nav-dropdown-menu luxury-dropdown">
                    <div className="dropdown-header">System Administration</div>
                    <div className="dropdown-menu-list">
                      {ADMIN_LINKS.map((link) => {
                        const IconComp = link.icon;
                        const isCurrent = page === link.key;
                        return (
                          <button
                            key={link.key}
                            type="button"
                            className={`luxury-dropdown-item ${isCurrent ? "active" : ""}`}
                            onClick={() => handleNavClick(link.key)}
                          >
                            <div className="dropdown-icon-box admin-box">
                              <IconComp />
                            </div>
                            <div className="dropdown-item-meta">
                              <span className="dropdown-item-label">{link.label}</span>
                              <span className="dropdown-item-desc">{link.desc}</span>
                            </div>
                            {isCurrent && <Icons.Check />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right: Actions, Search, Notifications & User Avatar Menu */}
          <div className="nav-actions-right">
            {/* Search Input */}
            <div className="search-wrap">
              <span className="search-icon">
                <Icons.Search />
              </span>
              <input
                type="text"
                className="search-input"
                placeholder={pageSearchLabels[page] || "Search…"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearch("")}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Notification Center */}
            {auth.isLoggedIn && (
              <div className="nav-notif-wrap">
                <NotificationCenter onSelectTask={() => handleNavClick("my-tasks")} />
              </div>
            )}

            {/* User Profile Avatar Menu */}
            {auth.isLoggedIn && (
              <div className="nav-dropdown-wrap" ref={userDropdownRef}>
                <button
                  type="button"
                  className={`user-avatar-btn ${userDropdownOpen ? "active" : ""}`}
                  onClick={() => {
                    setUserDropdownOpen(!userDropdownOpen);
                    setTeamDropdownOpen(false);
                    setAdminDropdownOpen(false);
                  }}
                  title={auth.email}
                  aria-label="User Account Menu"
                >
                  <span className="avatar-initials">{initials}</span>
                  <div className="avatar-status-dot" />
                </button>

                {userDropdownOpen && (
                  <div className="nav-dropdown-menu user-profile-dropdown">
                    {/* User Summary Card */}
                    <div className="dropdown-user-header">
                      <div className="dropdown-user-avatar">{initials}</div>
                      <div className="dropdown-user-details">
                        <strong className="dropdown-user-name">{displayName}</strong>
                        <span className="dropdown-user-email">{auth.email}</span>
                      </div>
                    </div>

                    <div className="dropdown-divider" />

                    {/* Menu Actions */}
                    <div className="dropdown-menu-list">
                      <button
                        type="button"
                        className={`luxury-dropdown-item ${page === "profile" ? "active" : ""}`}
                        onClick={() => handleNavClick("profile")}
                      >
                        <div className="dropdown-icon-box">
                          <Icons.Profile />
                        </div>
                        <div className="dropdown-item-meta">
                          <span className="dropdown-item-label">My Profile & Portfolio</span>
                          <span className="dropdown-item-desc">Showcase, courses & credentials</span>
                        </div>
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          className="luxury-dropdown-item"
                          onClick={() => {
                            toggleViewMode();
                            setUserDropdownOpen(false);
                          }}
                        >
                          <div className="dropdown-icon-box mode-box">
                            <Icons.SwitchView />
                          </div>
                          <div className="dropdown-item-meta">
                            <span className="dropdown-item-label">
                              {auth.viewMode === "admin" ? "Switch to Member View" : "Switch to Admin View"}
                            </span>
                            <span className="dropdown-item-desc">
                              {auth.viewMode === "admin" ? "Preview student dashboard experience" : "Access admin controls and grading"}
                            </span>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="dropdown-divider" />

                    <button
                      type="button"
                      className="dropdown-logout-action"
                      onClick={() => {
                        logout();
                        setUserDropdownOpen(false);
                      }}
                    >
                      <Icons.Logout />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Animated Hamburger */}
            <button
              type="button"
              className={`mobile-hamburger-btn ${mobileMenuOpen ? "active" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>
        </div>

        {/* Mobile Slide-Out Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer-overlay">
            {/* User Profile Card */}
            <div className="mobile-user-card">
              <div className="mobile-avatar">{initials}</div>
              <div className="mobile-user-info">
                <strong className="mobile-user-name">{displayName}</strong>
                <span className="mobile-user-email">{auth.email}</span>
              </div>
              <span className={`brand-badge ${isAdmin ? "admin" : isTeamMember ? "member" : "public"}`}>
                {isAdmin ? (auth.viewMode === "admin" ? "Admin" : "Member View") : isTeamMember ? "Member" : "Public"}
              </span>
            </div>

            {/* Mobile Navigation Content */}
            <div className="mobile-drawer-content">
              {/* Main Section */}
              <div className="mobile-nav-group">
                <div className="mobile-group-title">Main Portal</div>
                <button
                  type="button"
                  className={`mobile-nav-item ${page === "dashboard" ? "active" : ""}`}
                  onClick={() => handleNavClick("dashboard")}
                >
                  <Icons.Dashboard />
                  <span>Dashboard</span>
                </button>
                <button
                  type="button"
                  className={`mobile-nav-item ${page === "leaderboard" ? "active" : ""}`}
                  onClick={() => handleNavClick("leaderboard")}
                >
                  <Icons.Leaderboard />
                  <span>Leaderboard</span>
                </button>
                {auth.isLoggedIn && (
                  <button
                    type="button"
                    className={`mobile-nav-item ${page === "profile" ? "active" : ""}`}
                    onClick={() => handleNavClick("profile")}
                  >
                    <Icons.Profile />
                    <span>My Profile</span>
                  </button>
                )}
              </div>

              {/* Team Workspace */}
              {isTeamMember && (
                <div className="mobile-nav-group">
                  <div className="mobile-group-title">Private Team Workspace</div>
                  <div className="mobile-subgrid">
                    {TEAM_LINKS.map((link) => {
                      const IconComp = link.icon;
                      return (
                        <button
                          key={link.key}
                          type="button"
                          className={`mobile-nav-item ${page === link.key ? "active" : ""}`}
                          onClick={() => handleNavClick(link.key)}
                        >
                          <IconComp />
                          <span>{link.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Admin Tools (If Admin) */}
              {isAdmin && (
                <div className="mobile-nav-group">
                  <div className="mobile-group-title">System Administration</div>
                  {ADMIN_LINKS.map((link) => {
                    const IconComp = link.icon;
                    return (
                      <button
                        key={link.key}
                        type="button"
                        className={`mobile-nav-item ${page === link.key ? "active" : ""}`}
                        onClick={() => handleNavClick(link.key)}
                      >
                        <IconComp />
                        <span>{link.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mobile Footer */}
            <div className="mobile-drawer-footer">
              {isAdmin && (
                <button
                  type="button"
                  className={`mobile-view-toggle ${auth.viewMode === "admin" ? "is-admin" : "is-member"}`}
                  onClick={() => {
                    toggleViewMode();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icons.SwitchView />
                  <span>{auth.viewMode === "admin" ? "Switch to Member View" : "Switch to Admin View"}</span>
                </button>
              )}

              <button
                type="button"
                className="mobile-logout-btn"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
              >
                <Icons.Logout />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
