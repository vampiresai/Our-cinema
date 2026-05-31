import { ref, get, set, update, remove } from "firebase/database";
import { getRtdb } from "../firebase";
import { apiUrl, hasLocalMediaServer } from "../config/api";
import { Movie, Review, User, Episode } from "../types";

const CHUNK_SIZE = 4 * 1024 * 1024;

const LOCAL_MSG =
  "Uploads need the full app server. Use your Render URL (e.g. your-app.onrender.com), not Firebase Hosting. Or run npm run dev locally.";

function mapEntry(id: string, data: Record<string, unknown>): Movie {
  const rawLikes = data.likes;
  let likes: string[] = [];
  if (Array.isArray(rawLikes)) {
    likes = rawLikes as string[];
  } else if (rawLikes && typeof rawLikes === "object") {
    likes = Object.values(rawLikes as Record<string, string>);
  }

  return {
    id,
    title: (data.title as string) || "",
    description: (data.description as string) || "",
    category: (data.category as string) || "",
    type: (data.type as Movie["type"]) || "movie",
    duration: (data.duration as number) || 0,
    thumbnail: (data.thumbnail as string) || "",
    thumbnailPath: (data.thumbnailPath as string) || "",
    storagePath: (data.storagePath as string) || "",
    filePath: (data.filePath as string) || (data.storagePath as string) || "",
    episodes: Array.isArray(data.episodes) ? (data.episodes as Episode[]) : [],
    uploadDate: (data.uploadDate as string) || new Date().toISOString(),
    views: (data.views as number) || 0,
    likes,
    reviews: Array.isArray(data.reviews) ? (data.reviews as Review[]) : [],
  };
}

function isAbsoluteUrl(path: string): boolean {
  return path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:");
}

function resolveStreamUrl(pathOrUrl: string): string {
  if (!pathOrUrl) throw new Error("Video not uploaded yet");
  if (pathOrUrl.includes("firebasestorage.googleapis.com")) return pathOrUrl;
  if (isAbsoluteUrl(pathOrUrl) && !pathOrUrl.startsWith("/api/")) return pathOrUrl;
  if (pathOrUrl.startsWith("/api/stream/")) return apiUrl(pathOrUrl);
  if (!hasLocalMediaServer()) throw new Error(LOCAL_MSG);
  return apiUrl(`/api/stream/${pathOrUrl.replace(/^\//, "")}`);
}

function resolveThumbUrl(thumbnail: string): string {
  if (!thumbnail) return "";
  if (isAbsoluteUrl(thumbnail)) return thumbnail;
  if (thumbnail.startsWith("/api/thumbnails/")) return apiUrl(thumbnail);
  return apiUrl(`/api/thumbnails/${thumbnail.replace(/^\//, "")}`);
}

export async function fetchMovies(): Promise<Movie[]> {
  const snap = await get(ref(getRtdb(), "movies"));
  if (!snap.exists()) return [];
  const movies: Movie[] = [];
  snap.forEach((child) => {
    movies.push(mapEntry(child.key!, child.val() as Record<string, unknown>));
  });
  return movies
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .map((m) => ({ ...m, thumbnail: m.thumbnail ? resolveThumbUrl(m.thumbnail) : "" }));
}

export async function resolveVideoUrl(movie: Movie, episodeNumber?: number): Promise<string> {
  let path = movie.storagePath || movie.filePath || "";
  if (movie.type === "series" && movie.episodes?.length) {
    const ep = movie.episodes.find((e) => e.number === episodeNumber) || movie.episodes[0];
    path = ep.storagePath || ep.filePath || "";
  }
  return resolveStreamUrl(path);
}

export async function createMovieMetadata(data: {
  title: string;
  description: string;
  category: string;
  type: "movie" | "series";
  duration: number;
  episodeCount?: number;
}): Promise<string> {
  const id = "m" + Date.now();
  const movie: Record<string, unknown> = {
    title: data.title,
    description: data.description,
    category: data.category,
    type: data.type,
    duration: data.duration,
    thumbnail: "",
    storagePath: "",
    uploadDate: new Date().toISOString(),
    views: 0,
    likes: [],
    reviews: [],
  };
  if (data.type === "series") {
    const count = data.episodeCount || 1;
    movie.episodes = Array.from({ length: count }, (_, i) => ({
      number: i + 1,
      title: `Episode ${i + 1}`,
      storagePath: "",
      filePath: "",
      duration: 0,
    }));
  }
  await set(ref(getRtdb(), `movies/${id}`), movie);
  return id;
}

function requireLocal(): void {
  if (!hasLocalMediaServer()) throw new Error(LOCAL_MSG);
}

async function postBinary(url: string, data: ArrayBuffer): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: data,
  });
  const raw = await res.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      res.ok
        ? "Upload failed — server returned HTML instead of JSON. Use http://localhost:3000 with npm run dev"
        : `Upload failed (HTTP ${res.status}). Is npm run dev running?`
    );
  }
  return { ok: res.ok, status: res.status, data: parsed };
}

async function chunkedUpload(
  movieId: string,
  file: File,
  episodeNumber?: number,
  onProgress?: (pct: number) => void
): Promise<string> {
  requireLocal();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let filePath = "";
  onProgress?.(1);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, Math.min((i + 1) * CHUNK_SIZE, file.size));
    const params = new URLSearchParams({
      movieId,
      chunkIndex: String(i),
      totalChunks: String(totalChunks),
      fileName: file.name,
    });
    if (episodeNumber !== undefined) params.set("episodeNumber", String(episodeNumber));

    const { ok, data } = await postBinary(
      apiUrl(`/api/upload-chunk?${params}`),
      await chunk.arrayBuffer()
    );

    if (!ok) {
      throw new Error((data.error as string) || `Upload failed at chunk ${i + 1}/${totalChunks}`);
    }

    if (data.completed) filePath = (data.filePath as string) || "";
    onProgress?.(Math.max(1, Math.floor(((i + 1) / totalChunks) * 100)));
  }

  return filePath;
}

export async function uploadCover(movieId: string, file: File): Promise<void> {
  requireLocal();
  const params = new URLSearchParams({ movieId, fileName: file.name });
  const { ok, data } = await postBinary(
    apiUrl(`/api/upload-thumbnail?${params}`),
    await file.arrayBuffer()
  );
  if (!ok) throw new Error((data.error as string) || "Cover upload failed");
  await update(ref(getRtdb(), `movies/${movieId}`), {
    thumbnail: data.url as string,
  });
}

export async function uploadMovieVideo(
  movieId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const filePath = await chunkedUpload(movieId, file, undefined, onProgress);
  await update(ref(getRtdb(), `movies/${movieId}`), { storagePath: filePath, filePath });
}

export async function uploadEpisodeVideo(
  movieId: string,
  episodeNumber: number,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const filePath = await chunkedUpload(movieId, file, episodeNumber, onProgress);
  const snap = await get(ref(getRtdb(), `movies/${movieId}`));
  if (!snap.exists()) return;
  const data = snap.val() as Record<string, unknown>;
  const episodes: Episode[] = Array.isArray(data.episodes) ? [...(data.episodes as Episode[])] : [];
  const idx = episodes.findIndex((e) => e.number === episodeNumber);
  const entry: Episode = {
    number: episodeNumber,
    title: episodes[idx]?.title || `Episode ${episodeNumber}`,
    storagePath: filePath,
    filePath,
    duration: 0,
  };
  if (idx >= 0) episodes[idx] = entry;
  else episodes.push(entry);
  await update(ref(getRtdb(), `movies/${movieId}`), { episodes });
}

export async function deleteMovie(movieId: string): Promise<void> {
  await remove(ref(getRtdb(), `movies/${movieId}`));
}

export async function toggleLike(movieId: string, user: User): Promise<void> {
  const snap = await get(ref(getRtdb(), `movies/${movieId}/likes`));
  let likes: string[] = [];
  if (snap.exists()) {
    const val = snap.val();
    likes = Array.isArray(val) ? val : Object.values(val as Record<string, string>);
  }
  const idx = likes.indexOf(user.id);
  if (idx >= 0) likes.splice(idx, 1);
  else likes.push(user.id);
  await set(ref(getRtdb(), `movies/${movieId}/likes`), likes);
}

export async function addReview(movieId: string, review: Review): Promise<void> {
  const snap = await get(ref(getRtdb(), `movies/${movieId}/reviews`));
  let reviews: Review[] = [];
  if (snap.exists()) {
    const val = snap.val();
    reviews = Array.isArray(val) ? val : Object.values(val as Record<string, Review>);
  }
  reviews.push(review);
  await set(ref(getRtdb(), `movies/${movieId}/reviews`), reviews);
}
