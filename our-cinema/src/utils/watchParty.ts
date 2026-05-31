export const DEFAULT_ROOM_ID = "room-love";

export function buildWatchPartyUrl(movieId: string, roomId: string = DEFAULT_ROOM_ID): string {
  const url = new URL(window.location.origin);
  url.searchParams.set("watch", movieId);
  url.searchParams.set("room", roomId);
  return url.toString();
}

export function parseWatchPartyParams(): { movieId: string | null; roomId: string | null } {
  const params = new URLSearchParams(window.location.search);
  return {
    movieId: params.get("watch"),
    roomId: params.get("room"),
  };
}

export function clearWatchPartyParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete("watch");
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url.pathname + url.search);
}

/** Guess episode number from common filename patterns */
export function guessEpisodeNumber(filename: string): number | null {
  const base = filename.replace(/\.[^.]+$/, "");

  const patterns = [
    /[Ss](\d{1,2})[Ee](\d{1,3})/,
    /(\d{1,2})x(\d{1,3})/,
    /[Ee][Pp]?\.?\s*(\d{1,3})/,
    /[Ee]pisode\s*(\d{1,3})/i,
    /(?:^|[\s._-])(\d{1,2})(?:[\s._-]|$)/,
  ];

  for (const pattern of patterns) {
    const match = base.match(pattern);
    if (match) {
      const num = parseInt(match[match.length - 1], 10);
      if (num >= 1 && num <= 999) return num;
    }
  }
  return null;
}

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm|m4v|wmv|flv)$/i;

export function isVideoFile(name: string): boolean {
  return VIDEO_EXT.test(name);
}
