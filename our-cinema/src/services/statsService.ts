import {
  ref,
  get,
  set,
  push,
  query,
  orderByChild,
  limitToLast,
  onValue,
} from "firebase/database";
import { getRtdb } from "../firebase";
import { CoupleStats, ChatMessage, User } from "../types";

const statsRef = () => ref(getRtdb(), "stats/global");

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

export async function fetchStats(): Promise<CoupleStats> {
  const snap = await get(statsRef());
  if (!snap.exists()) {
    const empty: CoupleStats = {
      moviesWatched: 0,
      chatMessagesCount: 0,
      heartTapsCount: 0,
      daysTogether: 0,
    };
    await set(statsRef(), empty);
    return empty;
  }
  return snap.val() as CoupleStats;
}

export async function logWatchHistory(
  user: User,
  movieId: string,
  movieTitle: string
): Promise<void> {
  await push(ref(getRtdb(), "watchHistory"), {
    userId: user.id,
    userName: user.name,
    movieId,
    movieTitle,
    watchedAt: new Date().toISOString(),
    completed: false,
  });
  const snap = await get(ref(getRtdb(), "stats/global/moviesWatched"));
  await set(ref(getRtdb(), "stats/global/moviesWatched"), (snap.val() || 0) + 1);
}

export async function incrementHeartTaps(): Promise<void> {
  const snap = await get(ref(getRtdb(), "stats/global/heartTapsCount"));
  await set(ref(getRtdb(), "stats/global/heartTapsCount"), (snap.val() || 0) + 1);
}

// ---------------------------------------------------------------------------
// chat (Realtime DB listener)
// ---------------------------------------------------------------------------

export function subscribeMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const msgsRef = query(
    ref(getRtdb(), `rooms/${roomId}/messages`),
    orderByChild("timestamp"),
    limitToLast(200)
  );

  const handler = onValue(msgsRef, (snap) => {
    const msgs: ChatMessage[] = [];
    snap.forEach((child) => {
      const d = child.val() as Record<string, unknown>;
      const ts = d.timestamp;
      const timestamp =
        typeof ts === "number"
          ? new Date(ts).toISOString()
          : (ts as string) || new Date().toISOString();
      msgs.push({
        id: child.key!,
        userId: d.userId as string,
        userName: d.userName as string,
        avatar: d.avatar as string,
        text: d.text as string,
        timestamp,
        isSystem: d.isSystem as boolean | undefined,
      });
    });
    callback(msgs);
  });

  return () => handler();
}

export async function sendChatMessage(
  roomId: string,
  user: User,
  text: string
): Promise<void> {
  await push(ref(getRtdb(), `rooms/${roomId}/messages`), {
    userId: user.id,
    userName: user.name,
    avatar: user.avatar,
    text,
    timestamp: Date.now(),
  });
  const cSnap = await get(ref(getRtdb(), "stats/global/chatMessagesCount"));
  await set(ref(getRtdb(), "stats/global/chatMessagesCount"), (cSnap.val() || 0) + 1);
}

export async function addSystemMessage(
  roomId: string,
  text: string
): Promise<void> {
  await push(ref(getRtdb(), `rooms/${roomId}/messages`), {
    userId: "system",
    userName: "Our Cinema",
    avatar: "film",
    text,
    timestamp: Date.now(),
    isSystem: true,
  });
}
