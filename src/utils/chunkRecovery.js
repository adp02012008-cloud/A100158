// src/utils/chunkRecovery.js
// Self-healing Stale Chunk & Module Script MIME Type Auto-Recovery Engine
import { lazy } from "react";

const CHUNK_RECOVERY_KEY = "bugslayers_chunk_recovery_ts";
const RECOVERY_COOLDOWN_MS = 15000; // Prevent infinite reload loops

/**
 * Checks if an error is caused by a missing chunk, stale deployment, or MIME type mismatch
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const message = (error.message || error.reason?.message || String(error)).toLowerCase();
  
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("expected a javascript-or-wasm module script") ||
    message.includes("mime type") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("chunkloaderror") ||
    message.includes("loading chunk") ||
    message.includes("dynamically imported module")
  );
}

/**
 * Clears old browser caches and performs a single guarded reload to fetch the latest assets
 */
export function recoverFromStaleChunk(reason = "stale_chunk") {
  try {
    const now = Date.now();
    const lastRecovery = sessionStorage.getItem(CHUNK_RECOVERY_KEY);
    if (lastRecovery && now - parseInt(lastRecovery, 10) < RECOVERY_COOLDOWN_MS) {
      console.warn(`[ChunkRecovery] Suppression active. Already recovered ${now - parseInt(lastRecovery, 10)}ms ago. Reason:`, reason);
      return false;
    }

    sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(now));
    console.info(`[ChunkRecovery] Stale deployment detected (${reason}). Purging stale caches and refreshing to latest version...`);

    // Clean up cache storage if available
    if (typeof window !== "undefined" && "caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name).catch(() => {});
        });
      }).catch(() => {});
    }

    // Force fetch latest index.html from server
    window.location.reload();
    return true;
  } catch (e) {
    window.location.reload();
    return true;
  }
}

/**
 * Initializes global event listeners for Vite dynamic preloading and module script errors
 */
export function initChunkRecovery() {
  if (typeof window === "undefined") return;

  // 1. Vite's native dynamic import preload error event
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromStaleChunk("vite:preloadError");
  });

  // 2. Global runtime script error listener
  window.addEventListener("error", (event) => {
    if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
      event.preventDefault?.();
      recoverFromStaleChunk(event.message || "script_error");
    }
  });

  // 3. Unhandled promise rejections (often how dynamic import() failures bubble up)
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault?.();
      recoverFromStaleChunk(event.reason?.message || "unhandled_chunk_rejection");
    }
  });
}

/**
 * A resilient drop-in replacement for React.lazy that catches stale deployment chunk failures
 * and immediately triggers recovery before React crashes or unmounts the view.
 */
export function safeLazy(dynamicImportFn) {
  return lazy(async () => {
    try {
      return await dynamicImportFn();
    } catch (err) {
      if (isChunkLoadError(err)) {
        const recovered = recoverFromStaleChunk(err.message || "safeLazy_failure");
        if (recovered) {
          // Keep promise pending so React Suspense displays loader during the reload
          return new Promise(() => {});
        }
      }
      throw err;
    }
  });
}
