export type UserRole = "admin" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string; // Icon key: popcorn, heart, film, etc.
  lastActive: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Episode {
  number: number;
  title: string;
  storagePath?: string;
  filePath?: string;
  duration: number;
}

export interface Movie {
  id: string;
  title: string;
  description: string;
  category: string;
  type?: "movie" | "series";
  duration: number;
  thumbnail: string;
  thumbnailPath?: string;
  storagePath?: string;
  filePath?: string;
  episodes?: Episode[];
  uploadDate: string;
  views: number;
  likes: string[]; // List of user IDs who liked it
  reviews: Review[];
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  userName: string;
  movieId: string;
  movieTitle: string;
  watchedAt: string;
  completed: boolean;
}

export interface CoupleStats {
  moviesWatched: number;
  chatMessagesCount: number;
  heartTapsCount: number;
  daysTogether: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  text: string;
  timestamp: string;
  reactions?: { [key: string]: string[] };
  isSystem?: boolean;
}

export interface WatchRoom {
  id: string;
  hostId: string;
  currentMovieId: string | null;
  activeEpisode?: number;
  state: "playing" | "paused";
  currentTime: number;
  playbackSpeed: number;
  users: { [userId: string]: { name: string; avatar: string; isTyping: boolean; isVoiceConnected: boolean; role?: string } };
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: "upload" | "invitation" | "join" | "chat" | "romantic";
  timestamp: string;
  read: boolean;
}
