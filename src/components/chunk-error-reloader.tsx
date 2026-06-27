"use client";

import { useEffect } from "react";

/**
 * Recovers from ChunkLoadError. When a JS/CSS chunk fails to load — e.g. a stale
 * browser tab after a new deploy (or, in dev, after a rebuild changed the chunk
 * hashes) — this reloads the page once to fetch the fresh chunks, instead of
 * leaving the user stuck on an error overlay. A session guard prevents reload
 * loops if the failure is genuinely persistent.
 */
const RELOAD_GUARD = "chunk-reload-attempt";

function isChunkError(message?: string | null): boolean {
  if (!message) return false;
  return /ChunkLoadError|Loading chunk [^\s]+ failed|Loading CSS chunk|error loading dynamically imported module|Importing a module script failed/i.test(
    message,
  );
}

export function ChunkErrorReloader() {
  useEffect(() => {
    // Only clear the guard once the page has stayed stable for a few seconds, so
    // a persistent chunk failure can't trigger an endless reload loop.
    const clearTimer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_GUARD);
      } catch {
        /* ignore */
      }
    }, 4000);

    const recover = (message?: string | null) => {
      if (!isChunkError(message)) return;
      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_GUARD) === "1";
      } catch {
        /* ignore */
      }
      if (alreadyTried) return; // already reloaded once — surface the real error
      try {
        sessionStorage.setItem(RELOAD_GUARD, "1");
      } catch {
        /* ignore */
      }
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => recover(e.message || e.error?.message);
    const onRejection = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      recover(typeof reason === "string" ? reason : reason?.message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

export default ChunkErrorReloader;
