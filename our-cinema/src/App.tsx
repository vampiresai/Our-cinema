import React, { useState, useEffect, useCallback } from "react";
import { User, Movie, CoupleStats, AppNotification } from "./types";
import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Library from "./components/Library";
import UploadModal from "./components/UploadModal";
import PlayerScreen from "./components/PlayerScreen";
import { io, Socket } from "socket.io-client";
import { Heart } from "lucide-react";
import {
  buildWatchPartyUrl,
  parseWatchPartyParams,
  clearWatchPartyParams,
  DEFAULT_ROOM_ID,
} from "./utils/watchParty";
import { subscribeToAuth, logoutUser } from "./services/authService";
import { fetchMovies, toggleLike, addReview, deleteMovie, uploadCover } from "./services/movieService";
import { fetchStats, logWatchHistory, incrementHeartTaps } from "./services/statsService";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [coupleStats, setCoupleStats] = useState<CoupleStats>({
    moviesWatched: 0,
    chatMessagesCount: 0,
    heartTapsCount: 0,
    daysTogether: 0,
  });

  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ movieId: string; roomId: string } | null>(null);

  useEffect(() => {
    return subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    const { movieId, roomId } = parseWatchPartyParams();
    if (movieId && roomId) setPendingInvite({ movieId, roomId });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    loadMovies();
    loadStats();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io();
    setSocket(socketInstance);

    socketInstance.on("room-presence-updated", ({ users }) => {
      setOnlineCount(Object.keys(users).length);
    });

    socketInstance.on("room-sync", ({ roomState }) => {
      if (roomState?.users) setOnlineCount(Object.keys(roomState.users).length);
    });

    socketInstance.on("romantic-buzz-alert", ({ id, senderName, type, message }) => {
      setNotifications((prev) => [
        {
          id,
          title: type === "heart_shower" ? "Hearts Burst" : "Loving Alert",
          message: `${senderName} ${message}`,
          type: "romantic",
          timestamp: new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
      incrementHeartTaps().then(() => loadStats());
    });

    return () => socketInstance.disconnect();
  }, [currentUser]);

  useEffect(() => {
    if (!pendingInvite || movies.length === 0 || activeMovie) return;
    const movie = movies.find((m) => m.id === pendingInvite.movieId);
    if (movie) {
      setActiveMovie(movie);
      setActiveRoomId(pendingInvite.roomId);
      clearWatchPartyParams();
      setPendingInvite(null);
    }
  }, [pendingInvite, movies, activeMovie]);

  const loadMovies = async () => {
    try {
      setMovies(await fetchMovies());
    } catch (err) {
      console.error("Failed to load movies:", err);
    }
  };

  const loadStats = async () => {
    try {
      setCoupleStats(await fetchStats());
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setActiveMovie(null);
    setActiveRoomId(null);
    clearWatchPartyParams();
    if (socket) socket.disconnect();
    setMovies([]);
  };

  const handleSelectMovie = useCallback(
    (movie: Movie, launchRoom: boolean) => {
      setActiveMovie(movie);
      if (launchRoom) {
        const roomId = DEFAULT_ROOM_ID;
        setActiveRoomId(roomId);
        window.history.replaceState({}, "", buildWatchPartyUrl(movie.id, roomId));
        socket?.emit("change-movie", { roomId, movieId: movie.id, episode: 1 });
        if (currentUser) {
          logWatchHistory(currentUser, movie.id, movie.title).then(() => loadStats());
        }
      } else {
        setActiveRoomId(null);
        clearWatchPartyParams();
      }
    },
    [socket, currentUser]
  );

  const handleLikeMovie = async (movieId: string) => {
    if (!currentUser) return;
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;
    const isLiked = movie.likes?.includes(currentUser.id);
    try {
      await toggleLike(movieId, currentUser.id, !!isLiked);
      loadMovies();
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleAddReview = async (movieId: string, rating: number, comment: string) => {
    if (!currentUser) return;
    try {
      await addReview(movieId, currentUser, rating, comment);
      loadMovies();
    } catch (err) {
      console.error("Failed to add review:", err);
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;
    try {
      await deleteMovie(movieId);
      loadMovies();
    } catch (err) {
      console.error("Failed to delete movie:", err);
    }
  };

  const handleEditCover = async (movieId: string, file: File) => {
    try {
      await uploadCover(movieId, file);
      loadMovies();
    } catch (err) {
      console.error("Failed to update cover:", err);
    }
  };

  const triggerRomanticAction = (type: "heart_shower" | "thinking_of_you" | "date_mode_on") => {
    if (!socket || !currentUser) return;
    const textAlert = type === "heart_shower" ? "sent a shower of hearts" : "is thinking of you";
    socket.emit("romantic-buzz", {
      roomId: activeRoomId || DEFAULT_ROOM_ID,
      userId: currentUser.id,
      userName: currentUser.name,
      type,
      message: textAlert,
    });
    incrementHeartTaps().then(() => loadStats());
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={setCurrentUser} />;
  }

  if (activeMovie) {
    const isWatchParty = !!activeRoomId && !activeRoomId.startsWith("solo-");
    return (
      <PlayerScreen
        currentUser={currentUser}
        movie={activeMovie}
        socket={socket}
        roomId={activeRoomId || `solo-${activeMovie.id}`}
        isWatchParty={isWatchParty}
        watchPartyUrl={isWatchParty ? buildWatchPartyUrl(activeMovie.id, activeRoomId!) : undefined}
        onBack={() => {
          setActiveMovie(null);
          setActiveRoomId(null);
          clearWatchPartyParams();
          loadMovies();
        }}
        triggerRomanticAction={triggerRomanticAction}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-x-hidden">
      <div className="atmosphere" />

      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onlineCount={onlineCount}
        triggerRomanticAction={triggerRomanticAction}
        notifications={notifications}
        clearNotifications={() => setNotifications([])}
        isInRoom={!!activeRoomId}
        roomId={activeRoomId || DEFAULT_ROOM_ID}
      />

      <Library
        currentUser={currentUser}
        movies={movies}
        onSelectMovie={handleSelectMovie}
        onLikeMovie={handleLikeMovie}
        onAddReview={handleAddReview}
        onDeleteMovie={handleDeleteMovie}
        onOpenUpload={() => setIsUploadOpen(true)}
        onEditCover={handleEditCover}
        coupleStats={coupleStats}
      />

      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={() => {
            loadMovies();
            loadStats();
          }}
        />
      )}

    </div>
  );
}
