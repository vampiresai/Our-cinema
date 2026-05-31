import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { ref, get, set, update } from "firebase/database";
import { getFirebaseAuth, getRtdb } from "../firebase";
import { User } from "../types";
import { SAHIL_EMAIL } from "../utils/avatars";

function defaultAvatar(email: string): string {
  return email.toLowerCase() === SAHIL_EMAIL ? "popcorn" : "heart";
}

function defaultRole(email: string): "admin" | "viewer" {
  return email.toLowerCase() === SAHIL_EMAIL ? "admin" : "viewer";
}

export async function ensureUserProfile(fbUser: FirebaseUser): Promise<User> {
  const email = fbUser.email || "";
  const userRef = ref(getRtdb(), `users/${fbUser.uid}`);
  const snap = await get(userRef);

  await update(userRef, { lastActive: Date.now() });

  if (snap.exists()) {
    const data = snap.val() as Record<string, string>;
    return {
      id: fbUser.uid,
      name: data.name || fbUser.displayName || email.split("@")[0],
      email: data.email || email,
      role: (data.role as User["role"]) || defaultRole(email),
      avatar: data.avatar || defaultAvatar(email),
      lastActive: new Date().toISOString(),
    };
  }

  const profile: User = {
    id: fbUser.uid,
    name: fbUser.displayName || email.split("@")[0] || "Guest",
    email,
    role: defaultRole(email),
    avatar: defaultAvatar(email),
    lastActive: new Date().toISOString(),
  };

  await set(userRef, {
    name: profile.name,
    email: profile.email,
    role: profile.role,
    avatar: profile.avatar,
    lastActive: Date.now(),
  });

  return profile;
}

export async function loginWithEmail(email: string, password: string, displayName?: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const profile = await ensureUserProfile(cred.user);
  if (displayName) {
    const userRef = ref(getRtdb(), `users/${cred.user.uid}`);
    await update(userRef, { name: displayName });
    profile.name = displayName;
  }
  return profile;
}

export async function logoutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    try {
      const profile = await ensureUserProfile(fbUser);
      callback(profile);
    } catch {
      callback(null);
    }
  });
}
