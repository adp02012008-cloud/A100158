// src/App.jsx
import { lazy, Suspense, useState } from "react";
import Navbar from "./components/Navbar";
import LoginGate from "./components/LoginGate";
import InstallPWA from "./components/InstallPWA";
import { useAuth } from "./context/AuthContext";
import { TEAM_PAGE_KEYS } from "./config/teamSections";
import "./App.css";

// Lazy-loaded page components for fast initial load & progressive chunking
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const TaskAssignmentAdmin = lazy(() => import("./pages/TaskAssignmentAdmin"));
const MyTasksMember = lazy(() => import("./pages/MyTasksMember"));
const Hackathons = lazy(() => import("./pages/Hackathons"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Projects = lazy(() => import("./pages/Projects"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Opportunities = lazy(() => import("./pages/Opportunities"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminSubmissionsReview = lazy(() => import("./pages/AdminSubmissionsReview"));
const UserRosterAdmin = lazy(() => import("./pages/UserRosterAdmin"));

function PageLoadingSkeleton() {
  return (
    <div className="page-skeleton-container" style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
      <div className="loading-circle-container" style={{ padding: "0 0 32px 0" }}>
        <div className="circle-spinner" />
        <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>Loading page content…</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            style={{
              height: "140px",
              borderRadius: "12px",
              background: "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)",
              backgroundSize: "200% 100%",
              animation: "skeleton-shimmer 1.5s infinite",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { auth, isTeamMember } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");

  const visiblePage =
    !isTeamMember && TEAM_PAGE_KEYS.includes(page) ? "dashboard" : page;

  const changePage = (nextPage) => {
    const allowedPage =
      !isTeamMember && TEAM_PAGE_KEYS.includes(nextPage) ? "dashboard" : nextPage;
    setSearch("");
    setPage(allowedPage);
  };

  return (
    <LoginGate>
      <div className="app">
        <Navbar
          page={visiblePage}
          setPage={changePage}
          search={search}
          setSearch={setSearch}
        />

        <main className="page-content">
          <Suspense fallback={<PageLoadingSkeleton />}>
            {visiblePage === "dashboard" && <Dashboard search={search} setPage={changePage} />}
            {visiblePage === "leaderboard" && <Leaderboard search={search} />}
            {visiblePage === "profile" && <Profile />}
            {auth.role === "admin" && visiblePage === "manage-users" && (
              <UserRosterAdmin search={search} />
            )}
            {auth.role === "admin" && visiblePage === "assign-tasks" && (
              <TaskAssignmentAdmin search={search} />
            )}
            {auth.role === "admin" && visiblePage === "review-deliverables" && (
              <AdminSubmissionsReview search={search} />
            )}

            {isTeamMember && visiblePage === "my-tasks" && <MyTasksMember search={search} />}
            {isTeamMember && visiblePage === "hackathons" && <Hackathons search={search} />}
            {isTeamMember && visiblePage === "gallery" && <Gallery search={search} />}
            {isTeamMember && visiblePage === "projects" && <Projects search={search} />}
            {isTeamMember && visiblePage === "certificates" && <Certificates search={search} />}
            {isTeamMember && visiblePage === "opportunities" && <Opportunities search={search} />}
          </Suspense>
        </main>
        
        <InstallPWA />
      </div>
    </LoginGate>
  );
}

