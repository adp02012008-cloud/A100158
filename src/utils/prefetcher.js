// src/utils/prefetcher.js - High-Performance Speculative Background Preloading Engine
import { prefetchApi, getCachedApi } from "./api";

// Page component module chunk loaders
const PAGE_CHUNK_LOADERS = {
  dashboard: () => import("../pages/Dashboard"),
  courses: () => import("../pages/Courses"),
  projects: () => import("../pages/Projects"),
  showcase: () => import("../pages/ApprovedProjectsShowcase"),
  leaderboard: () => import("../pages/Leaderboard"),
  "my-tasks": () => import("../pages/MyTasksMember"),
  opportunities: () => import("../pages/Opportunities"),
  hackathons: () => import("../pages/Hackathons"),
  gallery: () => import("../pages/Gallery"),
  certificates: () => import("../pages/Certificates"),
  profile: () => import("../pages/Profile"),
  "manage-users": () => import("../pages/UserRosterAdmin"),
  "assign-tasks": () => import("../pages/TaskAssignmentAdmin"),
  "review-deliverables": () => import("../pages/AdminSubmissionsReview"),
};

// Endpoints required by each page for zero-spinner instant navigation
const PAGE_ENDPOINTS = {
  dashboard: ["/users/dashboard", "/clusters"],
  courses: ["/courses", "/courses/progress"],
  projects: ["/submissions?status=APPROVED&publicView=true", "/users", "/projects"],
  showcase: ["/submissions?status=APPROVED&publicView=true", "/users", "/projects"],
  leaderboard: ["/users/dashboard"],
  "my-tasks": ["/tasks", "/submissions"],
  opportunities: ["/opportunities"],
  hackathons: ["/hackathons"],
  gallery: ["/gallery"],
  certificates: ["/certificates"],
  profile: ["/users/me", "/submissions?status=APPROVED&publicView=true", "/hackathons", "/certificates", "/courses/progress"],
  "manage-users": ["/users/dashboard", "/users/assignable"],
  "assign-tasks": ["/tasks", "/users/assignable"],
  "review-deliverables": ["/submissions", "/reviews", "/tasks"],
};

const preloadedChunks = new Set();
const preloadedEndpoints = new Set();

/**
 * Preload a single JS chunk dynamically
 */
export function preloadPageChunk(pageKey) {
  if (preloadedChunks.has(pageKey)) return;
  const loader = PAGE_CHUNK_LOADERS[pageKey];
  if (loader) {
    preloadedChunks.add(pageKey);
    loader().catch(() => {
      preloadedChunks.delete(pageKey);
    });
  }
}

/**
 * Preload API endpoints for a specific page into memory cache
 */
export function preloadPageData(pageKey) {
  const endpoints = PAGE_ENDPOINTS[pageKey] || [];
  endpoints.forEach((endpoint) => {
    if (!preloadedEndpoints.has(endpoint)) {
      preloadedEndpoints.add(endpoint);
      prefetchApi(endpoint).catch(() => {
        preloadedEndpoints.delete(endpoint);
      });
    }
  });
}

/**
 * Fast hover / focus / touch prefetcher:
 * Runs instantly when hovering or tapping near a nav item.
 */
export function prefetchPage(pageKey) {
  preloadPageChunk(pageKey);
  preloadPageData(pageKey);
  if (pageKey === "projects") {
    preloadPageChunk("showcase");
    preloadPageData("showcase");
  }
}

/**
 * Executes tasks during browser idle periods without starving main thread UI
 */
function runWhenIdle(callback, timeout = 1000) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 80);
  }
}

let pipelineRunForRole = "";

/**
 * Global Background Speculative Preload Pipeline
 * Runs quietly in the background while the user stays on their current page,
 * ensuring all other pages have their code chunks and API data preloaded
 * before the user ever clicks on them.
 */
export function initGlobalPrefetchPipeline(userRole = "member") {
  const roleKey = String(userRole || "member").toLowerCase();
  if (pipelineRunForRole === roleKey) return;
  pipelineRunForRole = roleKey;

  // Staggered priority tiers
  const primaryPages = ["courses", "leaderboard", "opportunities", "projects"];
  const secondaryPages = ["profile", "my-tasks", "hackathons", "gallery", "certificates"];
  const adminPages = roleKey === "admin" ? ["manage-users", "assign-tasks", "review-deliverables"] : [];

  // 1. Warm primary pages swiftly after initial render (100ms)
  setTimeout(() => {
    primaryPages.forEach((pageKey) => {
      runWhenIdle(() => {
        prefetchPage(pageKey);
      }, 600);
    });
  }, 100);

  // 2. Warm secondary pages sequentially during idle frames
  setTimeout(() => {
    let index = 0;
    const remaining = [...secondaryPages, ...adminPages];

    function processNext() {
      if (index >= remaining.length) return;
      const pageKey = remaining[index++];

      runWhenIdle(() => {
        prefetchPage(pageKey);
        setTimeout(processNext, 120);
      }, 800);
    }

    processNext();
  }, 600);
}
