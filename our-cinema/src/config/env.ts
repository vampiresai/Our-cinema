/** Client-side env (Vite). Secrets live in .env locally or Render dashboard — never in git. */

import type { FirebaseOptions } from "firebase/app";

const REQUIRED_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_FIREBASE_DATABASE_URL",
] as const satisfies readonly (keyof ImportMetaEnv)[];

function envValue(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  return typeof value === "string" ? value.trim() : "";
}

function optional(name: keyof ImportMetaEnv, fallback: string): string {
  const value = envValue(name);
  return value.length > 0 ? value : fallback;
}

/** Keys missing from .env / Render environment */
export function getMissingEnvKeys(): string[] {
  return REQUIRED_KEYS.filter((key) => !envValue(key));
}

export function isEnvConfigured(): boolean {
  return getMissingEnvKeys().length === 0;
}

export function getFirebaseConfig(): FirebaseOptions | null {
  if (!isEnvConfigured()) return null;
  return {
    apiKey: envValue("VITE_FIREBASE_API_KEY"),
    authDomain: envValue("VITE_FIREBASE_AUTH_DOMAIN"),
    projectId: envValue("VITE_FIREBASE_PROJECT_ID"),
    storageBucket: optional("VITE_FIREBASE_STORAGE_BUCKET", ""),
    messagingSenderId: envValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
    appId: envValue("VITE_FIREBASE_APP_ID"),
    databaseURL: envValue("VITE_FIREBASE_DATABASE_URL"),
  };
}

/** Email allowed to upload movies (must match Firebase Realtime DB rules) */
export const UPLOADER_EMAIL = optional("VITE_UPLOADER_EMAIL", "sahil.ramesar@gmail.com");

/** True when UI + /api run on the same host (Render, local dev). Defaults on in production builds. */
export const BUNDLE_API =
  import.meta.env.DEV ||
  optional("VITE_BUNDLE_API", import.meta.env.PROD ? "true" : "false") === "true";
