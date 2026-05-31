import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const PORT = Number(process.env.PORT) || 3000;
/** Override if C: is full, e.g. D:\\our-cinema-uploads */
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
const THUMBS_DIR = path.join(UPLOADS_DIR, "thumbnails");
const chunkDir = path.join(UPLOADS_DIR, ".chunks");

[UPLOADS_DIR, THUMBS_DIR, chunkDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json({ limit: "2mb" }));
const uploadBody = express.raw({ type: () => true, limit: "100mb" });

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function clearPartialChunks(key: string): void {
  ensureDir(chunkDir);
  for (const name of fs.readdirSync(chunkDir)) {
    if (name.startsWith(`${key}_chunk_`)) {
      try {
        fs.unlinkSync(path.join(chunkDir, name));
      } catch {
        /* ignore */
      }
    }
  }
}

app.use("/api/stream", express.static(UPLOADS_DIR, { acceptRanges: true }));
app.use("/api/thumbnails", express.static(THUMBS_DIR));

app.post("/api/upload-thumbnail", uploadBody, (req, res) => {
  const movieId = sanitizeId(String(req.query.movieId || ""));
  const fileName = String(req.query.fileName || "");
  if (!movieId || !fileName || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: "Missing movieId, fileName or file data" });
    return;
  }
  const ext = (fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const outputName = `${movieId}.${ext}`;
  try {
    ensureDir(THUMBS_DIR);
    fs.writeFileSync(path.join(THUMBS_DIR, outputName), req.body);
    res.json({ url: `/api/thumbnails/${outputName}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to save thumbnail: ${msg}` });
  }
});

app.post("/api/upload-chunk", uploadBody, (req, res) => {
  const movieId = sanitizeId(String(req.query.movieId || ""));
  const ci = Number(req.query.chunkIndex);
  const tc = Number(req.query.totalChunks);
  const fileName = String(req.query.fileName || "");
  const epRaw = req.query.episodeNumber;
  const epNum = epRaw !== undefined && epRaw !== "" ? Number(epRaw) : undefined;

  if (!movieId || isNaN(ci) || isNaN(tc) || tc < 1 || !fileName || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: "Missing fields or empty body" });
    return;
  }

  const key = epNum !== undefined && !isNaN(epNum) ? `${movieId}_ep${epNum}` : movieId;
  if (ci === 0) clearPartialChunks(key);

  try {
    ensureDir(chunkDir);
    fs.writeFileSync(path.join(chunkDir, `${key}_chunk_${ci}`), req.body);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to save chunk: ${msg}` });
    return;
  }

  const allPresent = Array.from({ length: tc }, (_, i) =>
    fs.existsSync(path.join(chunkDir, `${key}_chunk_${i}`))
  ).every(Boolean);

  if (!allPresent) {
    res.json({ completed: false });
    return;
  }

  const ext = (fileName.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  let relPath: string;
  if (epNum !== undefined && !isNaN(epNum)) {
    ensureDir(path.join(UPLOADS_DIR, movieId));
    relPath = `${movieId}/ep${epNum}.${ext}`;
  } else {
    relPath = `${movieId}.${ext}`;
  }
  const finalPath = path.join(UPLOADS_DIR, relPath);

  try {
    const out = fs.openSync(finalPath, "w");
    for (let i = 0; i < tc; i++) {
      const cPath = path.join(chunkDir, `${key}_chunk_${i}`);
      fs.writeSync(out, fs.readFileSync(cPath));
      fs.unlinkSync(cPath);
    }
    fs.closeSync(out);
    res.json({ completed: true, filePath: relPath });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to merge chunks: ${msg}` });
  }
});

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", storage: "local + firebase-auth + firebase-rtdb" });
});

interface RoomState {
  roomId: string;
  activeMovieId: string | null;
  activeEpisode: number;
  state: "playing" | "paused";
  currentTime: number;
  playbackSpeed: number;
  users: Record<string, { name: string; avatar: string; role: string; isTyping: boolean; isVoiceConnected: boolean }>;
}

const activeRooms: Record<string, RoomState> = {};

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, user, movieId }: { roomId: string; user: { id: string; name: string; avatar: string; role: string }; movieId?: string }) => {
    if (!roomId || !user) return;
    socket.join(roomId);
    socket.data.userId = user.id;
    socket.data.roomId = roomId;
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = {
        roomId,
        activeMovieId: movieId || null,
        activeEpisode: 1,
        state: "paused",
        currentTime: 0,
        playbackSpeed: 1,
        users: {},
      };
    }
    if (movieId) activeRooms[roomId].activeMovieId = movieId;
    activeRooms[roomId].users[user.id] = {
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      isTyping: false,
      isVoiceConnected: false,
    };
    io.to(roomId).emit("room-sync", { roomState: activeRooms[roomId] });
  });

  socket.on("change-movie", ({ roomId, movieId, episode }) => {
    if (!roomId || !activeRooms[roomId]) return;
    activeRooms[roomId].activeMovieId = movieId;
    activeRooms[roomId].activeEpisode = episode || 1;
    activeRooms[roomId].currentTime = 0;
    activeRooms[roomId].state = "paused";
    io.to(roomId).emit("room-movie-updated", { movieId, episode: episode || 1 });
  });

  socket.on("sync-playback", ({ roomId, state, currentTime, playbackSpeed, episode }) => {
    if (!roomId || !activeRooms[roomId]) return;
    activeRooms[roomId].state = state;
    activeRooms[roomId].currentTime = currentTime;
    activeRooms[roomId].playbackSpeed = playbackSpeed;
    if (episode !== undefined) activeRooms[roomId].activeEpisode = episode;
    socket.to(roomId).emit("playback-synced", {
      state,
      currentTime,
      playbackSpeed,
      episode: activeRooms[roomId].activeEpisode,
      senderId: socket.data.userId,
    });
  });

  socket.on("typing-status", ({ roomId, userId, isTyping }) => {
    if (!roomId || !activeRooms[roomId]?.users[userId]) return;
    activeRooms[roomId].users[userId].isTyping = isTyping;
    socket.to(roomId).emit("typing-status-updated", { userId, isTyping });
  });

  socket.on("romantic-buzz", ({ roomId, userId, userName, type, message }) => {
    if (!roomId || !userId) return;
    io.to(roomId).emit("romantic-buzz-alert", {
      id: "bz_" + Date.now(),
      senderName: userName || "Partner",
      senderId: userId,
      type,
      message: message || "is thinking of you",
    });
  });

  socket.on("user-joined-announce", ({ roomId, userName }) => {
    if (!roomId) return;
    socket.to(roomId).emit("partner-joined", { userName });
  });

  socket.on("voice-signal", ({ roomId, signal, target, senderId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("voice-signal-received", { signal, target, senderId });
  });

  socket.on("voice-status-change", ({ roomId, userId, isConnected }) => {
    if (!roomId || !activeRooms[roomId]?.users[userId]) return;
    activeRooms[roomId].users[userId].isVoiceConnected = isConnected;
    io.to(roomId).emit("room-sync", { roomState: activeRooms[roomId] });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    const userId = socket.data.userId as string | undefined;
    if (roomId && userId && activeRooms[roomId]) {
      delete activeRooms[roomId].users[userId];
      if (Object.keys(activeRooms[roomId].users).length === 0) delete activeRooms[roomId];
      else io.to(roomId).emit("room-presence-updated", { users: activeRooms[roomId].users, leftUserId: userId });
    }
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use((req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
        next();
        return;
      }
      vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: "index.html" }));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Our Cinema running on http://localhost:${PORT}`);
  });
}

startServer();
