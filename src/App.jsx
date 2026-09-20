// src/App.jsx
import { lazy, Suspense, useState, useEffect } from "react";
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
const Courses = lazy(() => import("./pages/Courses"));
const AdminSubmissionsReview = lazy(() => import("./pages/AdminSubmissionsReview"));
const UserRosterAdmin = lazy(() => import("./pages/UserRosterAdmin"));

import UnifiedLoader from "./components/UnifiedLoader";
import { initGlobalPrefetchPipeline, prefetchPage } from "./utils/prefetcher";

const PAGE_BACKGROUNDS = {
  dashboard: "/bg-dashboard.jpg",
  courses: "/bg-courses.jpg",
  leaderboard: "/bg-leaderboard.jpg",
  opportunities: "/bg-opportunities.jpg",
  hackathons: "/bg-hackathons.jpg",
  projects: "/bg-dashboard.jpg",
  gallery: "/bg-courses.jpg",
  certificates: "/bg-opportunities.jpg",
  profile: "/bg-profile.jpg",
  "manage-users": "/bg-profile.jpg",
  "assign-tasks": "/bg-dashboard.jpg",
  "review-deliverables": "/bg-dashboard.jpg",
  "my-tasks": "/bg-dashboard.jpg",
};

export default function App() {
  const { auth, isTeamMember } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [search, setSearch] = useState("");

  // Start the background prefetch pipeline as soon as the user is authenticated
  useEffect(() => {
    if (auth?.isLoggedIn) {
      initGlobalPrefetchPipeline(auth.role);
    }
  }, [auth?.isLoggedIn, auth?.role]);

  const visiblePage =
    !isTeamMember && TEAM_PAGE_KEYS.includes(page) ? "dashboard" : page;

  const changePage = (nextPage) => {
    const allowedPage =
      !isTeamMember && TEAM_PAGE_KEYS.includes(nextPage) ? "dashboard" : nextPage;
    prefetchPage(allowedPage);
    setSearch("");
    setPage(allowedPage);
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const pageContent = document.querySelector(".page-content");
    if (pageContent) pageContent.scrollTop = 0;
  }, [visiblePage]);

  const currentBg = PAGE_BACKGROUNDS[visiblePage] || "/bg-dashboard.jpg";

  return (
    <LoginGate>
      <div className={`app page-${visiblePage}`}>
        {/* Dynamic Thematic Page Background with Slow Ambient Ken-Burns Motion & Contrast Overlay */}
        <div className="dynamic-page-bg-wrapper">
          <div
            key={currentBg}
            className="dynamic-page-bg-image"
            style={{ backgroundImage: `url('${currentBg}')` }}
          />
          <div className="dynamic-page-bg-overlay" />
        </div>

        <Navbar
          page={visiblePage}
          setPage={changePage}
          search={search}
          setSearch={setSearch}
        />

        <main className="page-content">
          <Suspense fallback={<UnifiedLoader title="Loading…" subtitle="" minHeight="420px" />}>
            {visiblePage === "dashboard" && <Dashboard search={search} setPage={changePage} />}
            {visiblePage === "leaderboard" && <Leaderboard search={search} />}
            {visiblePage === "courses" && <Courses search={search} />}
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

