import { Movie } from "../types";
import { apiUrl } from "../config/api";

export function getThumbnailUrl(movie: Movie): string {
  const t = movie.thumbnail || "";
  if (!t) return "";
  if (t.startsWith("http") || t.startsWith("data:")) return t;
  if (t.startsWith("/api/")) return apiUrl(t);
  return apiUrl(`/api/thumbnails/${t}`);
}

export function hasCover(movie: Movie): boolean {
  return Boolean(movie.thumbnail || movie.thumbnailPath);
}
