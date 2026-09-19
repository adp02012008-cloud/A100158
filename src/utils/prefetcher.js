// src/utils/prefetcher.js - YouTube-style Intelligent Background Preloader
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
  projects: ["/submissions?status=APPROVED&publicView=true", "/users"],
  showcase: ["/submissions?status=APPROVED&publicView=true", "/users"],
  leaderboard: ["/users/dashboard"],
  "my-tasks": ["/tasks", "/submissions"],
  opportunities: ["/opportunities"],
  hackathons: ["/hackathons"],
  gallery: ["/gallery"],
  certificates: ["/certificates"],
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
 * Preload API endpoints for a specific page
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
 * Fast hover / focus prefetcher: called when user hovers or taps a nav item.
 * Runs instantly during the 150-300ms before click, ensuring zero latency on click.
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
 * Executes tasks during browser idle periods with non-blocking priority
 */
function runWhenIdle(callback, timeout = 1200) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 200);
  }
}

let pipelineStarted = false;

/**
 * Global Background Prefetch Pipeline
 * Sequentially loads the remaining site chunks & data in the background
 * once the user is authenticated and the active page has rendered.
 */
export function initGlobalPrefetchPipeline(userRole = "member") {
  if (pipelineStarted) return;
  pipelineStarted = true;

  // Staggered queue so background work never starves the main thread
  const primaryPages = ["courses", "projects", "leaderboard", "opportunities"];
  const secondaryPages = ["my-tasks", "hackathons", "gallery", "certificates", "profile"];
  const adminPages = userRole === "admin" ? ["assign-tasks", "review-deliverables", "manage-users"] : [];

  const fullQueue = [...primaryPages, ...secondaryPages, ...adminPages];

  // Wait 400ms after login so current page is 100% painted first
  setTimeout(() => {
    let index = 0;

    function processNext() {
      if (index >= fullQueue.length) return;
      const pageKey = fullQueue[index++];

      runWhenIdle(() => {
        prefetchPage(pageKey);
        // Continue to the next after a short breathing interval
        setTimeout(processNext, 180);
      });
    }

    processNext();
  }, 400);
}
