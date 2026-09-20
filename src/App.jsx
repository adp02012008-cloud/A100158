// src/App.jsx
import { Suspense, useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import LoginGate from "./components/LoginGate";
import InstallPWA from "./components/InstallPWA";
import { useAuth } from "./context/AuthContext";
import { TEAM_PAGE_KEYS } from "./config/teamSections";
import { safeLazy } from "./utils/chunkRecovery";
import "./App.css";

// Resilient lazy-loaded page components with automatic stale-chunk recovery
const Dashboard = safeLazy(() => import("./pages/Dashboard"));
const Leaderboard = safeLazy(() => import("./pages/Leaderboard"));
const TaskAssignmentAdmin = safeLazy(() => import("./pages/TaskAssignmentAdmin"));
const MyTasksMember = safeLazy(() => import("./pages/MyTasksMember"));
const Hackathons = safeLazy(() => import("./pages/Hackathons"));
const Gallery = safeLazy(() => import("./pages/Gallery"));
const Projects = safeLazy(() => import("./pages/Projects"));
const Certificates = safeLazy(() => import("./pages/Certificates"));
const Opportunities = safeLazy(() => import("./pages/Opportunities"));
const Profile = safeLazy(() => import("./pages/Profile"));
const Courses = safeLazy(() => import("./pages/Courses"));
const AdminSubmissionsReview = safeLazy(() => import("./pages/AdminSubmissionsReview"));
const UserRosterAdmin = safeLazy(() => import("./pages/UserRosterAdmin"));

import UnifiedLoader from "./components/UnifiedLoader";
import { initGlobalPrefetchPipeline, prefetchPage } from "./utils/prefetcher";



const VALID_PAGES = [
  "dashboard",
  "leaderboard",
  "courses",
  "profile",
  "manage-users",
  "assign-tasks",
  "review-deliverables",
  "my-tasks",
  "hackathons",
  "gallery",
  "projects",
  "certificates",
  "opportunities",
];

function getPageFromPath(pathname = "/") {
  const clean = pathname.replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!clean || clean === "dashboard") return "dashboard";
  if (VALID_PAGES.includes(clean)) return clean;
  return "dashboard";
}

function getPathFromPage(targetPage) {
  if (!targetPage || targetPage === "dashboard") return "/";
  return `/${targetPage}`;
}

const PAGE_TITLES = {
  dashboard: "Bug Slayers | Team Dashboard",
  courses: "Courses | Bug Slayers",
  leaderboard: "Leaderboard | Bug Slayers",
  profile: "My Profile | Bug Slayers",
  opportunities: "Opportunities | Bug Slayers",
  hackathons: "Hackathons | Bug Slayers",
  projects: "Projects | Bug Slayers",
  gallery: "Gallery | Bug Slayers",
  certificates: "Certificates | Bug Slayers",
  "manage-users": "Manage Users | Bug Slayers Admin",
  "assign-tasks": "Assign Tasks | Bug Slayers Admin",
  "review-deliverables": "Review Deliverables | Bug Slayers Admin",
  "my-tasks": "My Tasks | Bug Slayers",
};

export default function App() {
  const { auth, isTeamMember } = useAuth();
  const [page, setPage] = useState(() => {
    if (typeof window !== "undefined") {
      return getPageFromPath(window.location.pathname);
    }
    return "dashboard";
  });
  const [search, setSearch] = useState("");

  // Start the speculative background prefetch pipeline immediately on mount and whenever role updates
  useEffect(() => {
    initGlobalPrefetchPipeline(auth?.role || "member");
  }, [auth?.isLoggedIn, auth?.role]);

  const visiblePage =
    !isTeamMember && TEAM_PAGE_KEYS.includes(page) ? "dashboard" : page;

  const changePage = (nextPage, replace = false) => {
    const allowedPage =
      !isTeamMember && TEAM_PAGE_KEYS.includes(nextPage) ? "dashboard" : nextPage;
    prefetchPage(allowedPage);
    setSearch("");
    setPage(allowedPage);

    const targetPath = getPathFromPage(allowedPage);
    if (typeof window !== "undefined" && window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ page: allowedPage }, "", targetPath);
      } else {
        window.history.pushState({ page: allowedPage }, "", targetPath);
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Synchronize browser history on Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const pageFromUrl = getPageFromPath(window.location.pathname);
      const allowedPage =
        !isTeamMember && TEAM_PAGE_KEYS.includes(pageFromUrl) ? "dashboard" : pageFromUrl;
      setSearch("");
      setPage(allowedPage);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isTeamMember]);

  // Synchronize initial URL or normalized path & update document title
  useEffect(() => {
    const currentPath = window.location.pathname;
    const expectedPath = getPathFromPage(visiblePage);
    if (currentPath !== expectedPath) {
      window.history.replaceState({ page: visiblePage }, "", expectedPath);
    }
    document.title = PAGE_TITLES[visiblePage] || "Bug Slayers | Team Dashboard";

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const pageContent = document.querySelector(".page-content");
    if (pageContent) pageContent.scrollTop = 0;
  }, [visiblePage]);

  return (
    <>
      <div className={`dynamic-theme-bg theme-${visiblePage}`} aria-hidden="true">
        <div className="dynamic-theme-glow-top" />
        <div className="dynamic-theme-glow-bottom" />
      </div>

      <LoginGate>
        <div className={`app page-${visiblePage}`}>

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
    </>
  );
}

