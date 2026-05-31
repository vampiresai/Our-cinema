import { BUNDLE_API } from "./env";

/** Optional override if API is on another domain. Leave empty on Render (same service). */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";
}

export function apiUrl(path: string): string {
  return `${getApiBase()}${path}`;
}

function isFirebaseHostingOnly(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.endsWith(".web.app") || host.endsWith(".firebaseapp.com");
}

/** Disk uploads via Express /api (local dev, Render, or separate API URL). */
export function hasLocalMediaServer(): boolean {
  if (Boolean(getApiBase())) return true;
  if (BUNDLE_API && !isFirebaseHostingOnly()) return true;
  return false;
}
