import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Database, getDatabase } from "firebase/database";
import { getFirebaseConfig } from "./config/env";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let rtdbInstance: Database | undefined;

function initFirebase(): void {
  if (authInstance) return;
  const config = getFirebaseConfig();
  if (!config) {
    throw new Error("Firebase is not configured. Add VITE_FIREBASE_* to .env (see .env.example).");
  }
  app = initializeApp(config);
  authInstance = getAuth(app);
  rtdbInstance = getDatabase(app);
}

export function getFirebaseAuth(): Auth {
  initFirebase();
  return authInstance!;
}

export function getRtdb(): Database {
  initFirebase();
  return rtdbInstance!;
}
