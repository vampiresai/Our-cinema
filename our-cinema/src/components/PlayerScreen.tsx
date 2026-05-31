import React, { useState, useEffect, useRef, useCallback } from "react";
import { User, Movie, ChatMessage, WatchRoom } from "../types";
import { Socket } from "socket.io-client";
import {
  Play, Pause, RotateCw, Volume2, VolumeX, Maximize2,
  ChevronLeft, Send, Sparkles, Heart, Mic, MessageCircle,
  Loader2, Link2, Check, RefreshCw, PauseCircle, Gift, ListVideo,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserAvatar } from "../utils/avatars";
import { resolveVideoUrl } from "../services/movieService";
import { subscribeMessages, sendChatMessage } from "../services/statsService";

interface PlayerScreenProps {
  currentUser: User;
  movie: Movie;
  socket: Socket | null;
  roomId: string;
  isWatchParty: boolean;
  watchPartyUrl?: string;
  onBack: () => void;
  triggerRomanticAction: (type: "heart_shower" | "thinking_of_you" | "date_mode_on") => void;
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
  scale: number;
  color: string;
}

export default function PlayerScreen({
  currentUser,
  movie,
  socket,
  roomId,
  isWatchParty,
  watchPartyUrl,
  onBack,
  triggerRomanticAction,
}: PlayerScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isRemoteUpdate = useRef(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(movie.duration || 100);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showControls, setShowControls] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [linkCopied, setLinkCopied] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoError, setVideoError] = useState<string | null>(null);
  const hasAnnouncedJoin = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [roomUsers, setRoomUsers] = useState<WatchRoom["users"]>({});
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceVolumeScale, setVoiceVolumeScale] = useState<number[]>([12, 24, 8, 48, 16, 32, 10]);

  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [loveBuzzAlert, setLoveBuzzAlert] = useState<string | null>(null);
  const [showNextEpisode, setShowNextEpisode] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSeries = movie.type === "series" && movie.episodes && movie.episodes.length > 0;

  const applyRemotePlayback = useCallback(
    (state: string, remoteTime: number, remoteSpeed: number, episode?: number) => {
      if (!videoRef.current) return;

      isRemoteUpdate.current = true;

      if (episode !== undefined && episode !== activeEpisode && isSeries) {
        setActiveEpisode(episode);
        return;
      }

      if (videoRef.current.playbackRate !== remoteSpeed) {
        videoRef.current.playbackRate = remoteSpeed;
        setPlaybackSpeed(remoteSpeed);
      }

      if (state === "playing" && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      } else if (state === "paused" && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlaying(false);
      }

      const delta = Math.abs(videoRef.current.currentTime - remoteTime);
      if (delta > 0.8) {
        videoRef.current.currentTime = remoteTime;
        setCurrentTime(remoteTime);
      }

      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 200);
    },
    [activeEpisode, isSeries]
  );

  const emitSync = useCallback(
    (state: "playing" | "paused", time: number, speed: number, episode?: number) => {
      if (!socket || !isWatchParty) return;
      socket.emit("sync-playback", {
        roomId,
        state,
        currentTime: time,
        playbackSpeed: speed,
        episode: episode ?? activeEpisode,
      });
    },
    [socket, isWatchParty, roomId, activeEpisode]
  );

  useEffect(() => {
    if (!socket) return;

    socket.emit("join-room", { roomId, user: currentUser, movieId: isWatchParty ? movie.id : undefined });

    socket.on("room-sync", ({ roomState }) => {
      if (roomState) {
        setRoomUsers(roomState.users);
        if (isWatchParty && roomState.currentTime !== undefined) {
          applyRemotePlayback(
            roomState.state,
            roomState.currentTime,
            roomState.playbackSpeed ?? 1,
            roomState.activeEpisode ?? 1
          );
          if (roomState.activeEpisode) setActiveEpisode(roomState.activeEpisode);
        }
      }
      setIsLoading(false);
    });

    socket.on("room-presence-updated", ({ users }) => setRoomUsers(users));

    socket.on("playback-synced", ({ state, currentTime: remoteTime, playbackSpeed: remoteSpeed, episode }) => {
      applyRemotePlayback(state, remoteTime, remoteSpeed, episode);
    });

    socket.on("room-movie-updated", ({ movieId, episode }) => {
      if (movieId === movie.id && episode) setActiveEpisode(episode);
    });


    socket.on("typing-status-updated", ({ userId, isTyping: partnerIsTyping }) => {
      if (userId !== currentUser.id) setPartnerTyping(partnerIsTyping);
    });

    socket.on("romantic-buzz-alert", ({ type, senderName, message }) => {
      if (type === "heart_shower") createHeartsBurst();
      setLoveBuzzAlert(`${senderName} ${message}`);
      setTimeout(() => setLoveBuzzAlert(null), 4000);
    });

    socket.on("partner-joined", ({ userName }: { userName: string }) => {
      setLoveBuzzAlert(`${userName} joined the watch party`);
      setTimeout(() => setLoveBuzzAlert(null), 3500);
    });

    socket.on("voice-signal-received", async ({ signal, senderId }) => {
      if (!peerConnection.current) return;
      try {
        if (signal.sdp) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === "offer") {
            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);
            socket.emit("voice-signal", { roomId, signal: { sdp: answer }, target: senderId, senderId: currentUser.id });
          }
        } else if (signal.candidate) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn("WebRTC Signal handling error:", err);
      }
    });

    return () => {
      socket.off("room-sync");
      socket.off("room-presence-updated");
      socket.off("playback-synced");
      socket.off("room-movie-updated");
      socket.off("typing-status-updated");
      socket.off("romantic-buzz-alert");
      socket.off("partner-joined");
      socket.off("voice-signal-received");
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [socket, roomId, movie.id, isWatchParty, currentUser, applyRemotePlayback]);

  useEffect(() => {
    const unsub = subscribeMessages(roomId, setMessages);
    return unsub;
  }, [roomId]);

  // Announce join once per session via socket (not persisted to DB)
  useEffect(() => {
    if (!hasAnnouncedJoin.current && isWatchParty && socket) {
      hasAnnouncedJoin.current = true;
      socket.emit("user-joined-announce", { roomId, userName: currentUser.name });
    }
  }, [roomId, isWatchParty, socket, currentUser.name]);

  useEffect(() => {
    let cancelled = false;
    setVideoError(null);
    setVideoUrl("");
    setCurrentTime(0);
    setIsPlaying(false);
    setIsLoading(true);
    setShowNextEpisode(false);

    resolveVideoUrl(movie, activeEpisode)
      .then((url) => {
        if (!cancelled) {
          setVideoUrl(url);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setVideoError(err instanceof Error ? err.message : "Video not available");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [movie, activeEpisode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping, showChat]);

  const hideControlsSoon = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => setShowControls(false), 2500);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    hideControlsSoon();
  };

  const handleMouseLeave = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    setShowControls(false);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!socket) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit("typing-status", { roomId, userId: currentUser.id, isTyping: true });
    }

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit("typing-status", { roomId, userId: currentUser.id, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendChatMessage(roomId, currentUser, newMessage.trim());
    setNewMessage("");
    if (isTyping && socket) {
      setIsTyping(false);
      socket.emit("typing-status", { roomId, userId: currentUser.id, isTyping: false });
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    const nextState = isPlaying ? "paused" : "playing";
    isRemoteUpdate.current = true;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);

    emitSync(nextState, videoRef.current.currentTime, playbackSpeed);
    setTimeout(() => { isRemoteUpdate.current = false; }, 200);
  };

  const handleVideoPlay = () => {
    if (isRemoteUpdate.current) {
      setIsPlaying(true);
      return;
    }
    setIsPlaying(true);
    if (videoRef.current && isWatchParty) {
      emitSync("playing", videoRef.current.currentTime, playbackSpeed);
    }
  };

  const handleVideoPause = () => {
    if (isRemoteUpdate.current) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(false);
    if (videoRef.current && isWatchParty) {
      emitSync("paused", videoRef.current.currentTime, playbackSpeed);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const targetTime = Number(e.target.value);
    isRemoteUpdate.current = true;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    emitSync(isPlaying ? "playing" : "paused", targetTime, playbackSpeed);
    setTimeout(() => { isRemoteUpdate.current = false; }, 200);
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    isRemoteUpdate.current = true;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    emitSync(isPlaying ? "playing" : "paused", videoRef.current.currentTime, speed);
    setTimeout(() => { isRemoteUpdate.current = false; }, 200);
  };

  const handleSkip = (seconds: number) => {
    if (!videoRef.current) return;
    let targetTime = videoRef.current.currentTime + seconds;
    targetTime = Math.max(0, Math.min(duration, targetTime));
    isRemoteUpdate.current = true;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    emitSync(isPlaying ? "playing" : "paused", targetTime, playbackSpeed);
    setTimeout(() => { isRemoteUpdate.current = false; }, 200);
  };

  const handleEpisodeChange = (ep: number) => {
    setActiveEpisode(ep);
    if (socket && isWatchParty) {
      socket.emit("change-movie", { roomId, movieId: movie.id, episode: ep });
    }
  };

  const copyWatchLink = async () => {
    if (!watchPartyUrl) return;
    try {
      await navigator.clipboard.writeText(watchPartyUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      /* clipboard blocked */
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleFullScreen = () => {
    const container = document.getElementById("cinema-theatre-wrapper");
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const createHeartsBurst = () => {
    const colors = ["#ec4899", "#db2777", "#be185d", "#f472b6", "#a78bfa", "#f5d0fe"];
    const newHearts: FloatingHeart[] = Array.from({ length: 12 }, (_, i) => ({
      id: Math.random() + i,
      x: Math.floor(Math.random() * 80) + 10,
      y: Math.floor(Math.random() * 20) + 70,
      scale: Math.random() * 1.2 + 0.6,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setFloatingHearts((prev) => [...prev, ...newHearts]);
    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => !newHearts.includes(h)));
    }, 4500);
  };

  const activateVoiceChat = async () => {
    if (isVoiceConnected) {
      localStream.current?.getTracks().forEach((track) => track.stop());
      peerConnection.current?.close();
      setIsVoiceConnected(false);
      socket?.emit("voice-status-change", { roomId, userId: currentUser.id, isConnected: false });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null);
      if (stream) localStream.current = stream;

      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      stream?.getTracks().forEach((track) => peerConnection.current?.addTrack(track, stream));

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit("voice-signal", { roomId, signal: { candidate: event.candidate }, target: null, senderId: currentUser.id });
        }
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket?.emit("voice-signal", { roomId, signal: { sdp: offer }, target: null, senderId: currentUser.id });
      setIsVoiceConnected(true);
      socket?.emit("voice-status-change", { roomId, userId: currentUser.id, isConnected: true });

      const interval = setInterval(() => {
        setVoiceVolumeScale(Array.from({ length: 7 }, () => Math.floor(Math.random() * 40) + 8));
      }, 150);
      setTimeout(() => clearInterval(interval), 60000);
    } catch {
      setIsVoiceConnected(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      id="cinema-theatre-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`fixed inset-0 bg-black z-50 flex flex-col md:flex-row overflow-hidden select-none ${!showControls ? "cursor-none" : ""}`}
    >
      <AnimatePresence>
        {loveBuzzAlert && (
          <motion.div
            initial={{ opacity: 0, y: -45, scale: 0.9 }}
            animate={{ opacity: 1, y: 15, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full bg-pink-900/90 border border-pink-500/40 text-white text-xs font-medium shadow-2xl z-50 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-300" />
            <span>{loveBuzzAlert}</span>
            <Heart className="w-3.5 h-3.5 fill-pink-300 text-pink-300" />
          </motion.div>
        )}
      </AnimatePresence>

      {floatingHearts.map((h) => (
        <Heart
          key={h.id}
          className="absolute z-40 pointer-events-none animate-floatUp fill-current"
          style={{
            left: `${h.x}%`,
            top: `${h.y}%`,
            color: h.color,
            width: `${h.scale * 1.25}rem`,
            height: `${h.scale * 1.25}rem`,
            filter: `drop-shadow(0 0 8px ${h.color}80)`,
          }}
        />
      ))}

      <div className="flex-grow flex flex-col relative justify-center bg-black min-w-0">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0c0916]/95 z-30 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <Loader2 className="w-9 h-9 text-pink-500 animate-spin" />
            <h3 className="text-sm font-serif font-semibold text-pink-200">Entering theatre...</h3>
            <p className="text-[10px] text-pink-400/70 font-mono">Syncing playback</p>
          </div>
        )}

        {videoError && !isLoading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/90">
            <p className="text-sm text-pink-300">{videoError}</p>
            <p className="text-xs text-gray-500">Make sure the video file has been uploaded to the server</p>
          </div>
        )}

        {videoUrl && (
        <video
          ref={videoRef}
          key={videoUrl}
          src={videoUrl}
          onClick={handlePlayPause}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onLoadedData={() => setIsLoading(false)}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onDurationChange={() => {
            if (videoRef.current) setDuration(videoRef.current.duration);
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (isSeries && movie.episodes) {
              const nextEp = movie.episodes.find((e) => e.number === activeEpisode + 1);
              if (nextEp) setShowNextEpisode(true);
            }
          }}
          onError={(e) => {
            setIsLoading(false);
            const code = (e.currentTarget as HTMLVideoElement).error?.code;
            const msgs: Record<number, string> = { 1: "Playback aborted", 2: "Network error loading video", 3: "Video decode error", 4: "Video not found or not yet uploaded" };
            setVideoError(msgs[code ?? 4] || "Video not available");
          }}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />
        )}

        {/* Next Episode overlay */}
        <AnimatePresence>
          {showNextEpisode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/80"
            >
              <p className="text-xs font-mono uppercase tracking-widest text-pink-400">Up Next</p>
              <h3 className="text-xl font-serif font-bold text-white">
                Episode {activeEpisode + 1}
                {movie.episodes?.find(e => e.number === activeEpisode + 1)?.title !== `Episode ${activeEpisode + 1}`
                  ? `: ${movie.episodes?.find(e => e.number === activeEpisode + 1)?.title}`
                  : ""}
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowNextEpisode(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 text-xs hover:bg-white/10 transition cursor-pointer"
                >
                  Stay Here
                </button>
                <button
                  onClick={() => handleEpisodeChange(activeEpisode + 1)}
                  className="px-5 py-2 rounded-lg bg-pink-500 hover:bg-pink-500/90 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" /> Play Next Episode
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/70 z-20 flex flex-col justify-between p-3 md:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={onBack}
                  className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-pink-400 text-xs hover:bg-black/80 transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Exit</span>
                </button>

                <div className="flex-grow text-center min-w-0 px-2">
                  <h3 className="text-sm font-serif font-bold text-white truncate">{movie.title}</h3>
                  {isWatchParty && (
                    <p className="text-[9px] font-mono tracking-widest text-pink-400/80 uppercase flex items-center justify-center gap-1">
                      <RefreshCw className="w-2.5 h-2.5" />
                      Synced watch party
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isWatchParty && watchPartyUrl && (
                    <button
                      onClick={copyWatchLink}
                      className="px-2 py-1.5 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] hover:bg-pink-500/25 transition flex items-center gap-1 cursor-pointer"
                      title="Copy invite link for your partner"
                    >
                      {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{linkCopied ? "Copied!" : "Invite"}</span>
                    </button>
                  )}

                  {(Object.entries(roomUsers) as [string, WatchRoom["users"][string]][]).map(([uid, u]) => (
                    <span
                      key={uid}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center relative ${
                        u.role === "admin" ? "border-pink-500/60 bg-pink-500/10 text-pink-400" : "border-white/20 bg-white/5 text-pink-300"
                      }`}
                      title={u.name}
                    >
                      <UserAvatar avatar={u.avatar} className="w-3.5 h-3.5" filled />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-black ${
                        u.isVoiceConnected ? "bg-emerald-500" : "bg-zinc-600"
                      }`} />
                    </span>
                  ))}
                </div>
              </div>

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                {!isPlaying && showControls && (
                  <button
                    onClick={handlePlayPause}
                    className="w-14 h-14 rounded-full bg-pink-500/90 text-white flex items-center justify-center hover:bg-pink-500 active:scale-95 transition pointer-events-auto shadow-2xl cursor-pointer pl-1"
                  >
                    <Play className="w-7 h-7 fill-white" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {isSeries && (
                  <div className="flex items-center gap-2">
                    <ListVideo className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <select
                      value={activeEpisode}
                      onChange={(e) => handleEpisodeChange(Number(e.target.value))}
                      className="text-[10px] bg-black/70 text-pink-200 rounded-lg border border-white/10 px-2 py-1 font-mono flex-1 max-w-xs"
                    >
                      {movie.episodes!.map((ep) => (
                        <option key={ep.number} value={ep.number} className="bg-black">
                          Ep {ep.number}{ep.title !== `Episode ${ep.number}` ? `: ${ep.title}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-pink-300/80 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    {isWatchParty && (
                      <span className="flex items-center gap-1 text-pink-400/70 uppercase tracking-wider text-[9px]">
                        {isPlaying ? (
                          <><RefreshCw className="w-3 h-3" /> Linked</>
                        ) : (
                          <><PauseCircle className="w-3 h-3" /> Paused for both</>
                        )}
                      </span>
                    )}
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeekChange}
                    className="w-full accent-pink-500 bg-white/10 h-1 rounded-full cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <button onClick={handlePlayPause} className="p-1.5 text-white hover:text-pink-400 transition cursor-pointer">
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                    </button>
                    <button onClick={() => handleSkip(-10)} className="p-1.5 text-pink-200/80 hover:text-white transition cursor-pointer" title="-10s">
                      <RotateCw className="w-4 h-4 scale-x-[-1]" />
                    </button>
                    <button onClick={() => handleSkip(10)} className="p-1.5 text-pink-200/80 hover:text-white transition cursor-pointer" title="+10s">
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-1 group/vol">
                      <button onClick={toggleMute} className="text-white hover:text-pink-400 cursor-pointer p-1">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-0 overflow-hidden group-hover/vol:w-14 accent-pink-500 h-0.5 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-full border border-pink-500/15">
                    <button
                      onClick={() => triggerRomanticAction("thinking_of_you")}
                      className="p-1 text-pink-300 hover:text-white transition cursor-pointer"
                      title="Thinking of you"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerRomanticAction("heart_shower")}
                      className="p-1 text-pink-400 hover:text-white transition cursor-pointer"
                      title="Send hearts"
                    >
                      <Heart className="w-4 h-4 fill-pink-500/40" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={playbackSpeed}
                      onChange={(e) => handleSpeedChange(Number(e.target.value))}
                      className="text-[10px] bg-black/70 text-pink-200 rounded border border-white/10 px-1.5 py-0.5 font-mono"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1.0}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2.0}>2x</option>
                    </select>
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className={`p-1.5 rounded hover:bg-white/5 transition cursor-pointer ${showChat ? "text-pink-400" : "text-white/60"}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={toggleFullScreen} className="p-1.5 text-white hover:text-pink-400 cursor-pointer">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 glass border-t md:border-t-0 md:border-l border-white/10 h-64 md:h-full flex flex-col z-20 w-[300px] max-w-full"
          >
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between gap-2 min-h-[44px]">
              <div className="flex items-center gap-2 min-w-0">
                <Mic className={`w-3.5 h-3.5 shrink-0 ${isVoiceConnected ? "text-emerald-400" : "text-pink-400/70"}`} />
                <span className="text-[10px] font-medium text-gray-300 truncate">
                  {isVoiceConnected ? "Voice on" : "Voice off"}
                </span>
              </div>
              {isVoiceConnected && (
                <div className="flex items-end gap-px h-4">
                  {voiceVolumeScale.slice(0, 5).map((h, i) => (
                    <div key={i} className="bg-emerald-500/80 w-0.5 rounded-full transition-all" style={{ height: `${Math.min(h, 100)}%` }} />
                  ))}
                </div>
              )}
              <button
                onClick={activateVoiceChat}
                className={`px-2 py-1 rounded-md text-[9px] font-semibold uppercase tracking-wide shrink-0 cursor-pointer ${
                  isVoiceConnected ? "bg-red-900/30 border border-red-700/40 text-red-200" : "bg-pink-500/90 text-white hover:bg-pink-500"
                }`}
              >
                {isVoiceConnected ? "Leave" : "Join"}
              </button>
            </div>

            <div className="flex-grow px-3 py-2 overflow-y-auto space-y-2.5 scrollbar min-h-0">
              {messages.map((m) => {
                if (m.isSystem) {
                  return (
                    <div key={m.id} className="text-center py-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-[9px] text-pink-300/90">
                        {m.text}
                      </span>
                    </div>
                  );
                }

                const isMe = m.userId === currentUser.id;
                return (
                  <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isMe ? "bg-pink-500/15 border border-pink-500/30 text-pink-400" : "bg-white/5 border border-white/15 text-pink-300"
                    }`}>
                      <UserAvatar avatar={m.avatar} className="w-3 h-3" filled />
                    </span>
                    <div className={`space-y-0.5 max-w-[78%] ${isMe ? "items-end" : ""}`}>
                      <div className={`flex items-center gap-1 text-[8px] text-gray-500 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="font-semibold text-gray-400">{m.userName.split(" ")[0]}</span>
                        <span className="font-mono opacity-60">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed break-words ${
                        isMe ? "bg-pink-500 text-white rounded-tr-sm" : "bg-white/5 text-gray-100 rounded-tl-sm border border-white/8"
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  </div>
                );
              })}

              {partnerTyping && (
                <div className="flex gap-1.5 items-center pl-1">
                  <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1 h-1 bg-pink-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                  <span className="text-[9px] text-gray-500 italic">typing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="px-2.5 py-2 border-t border-white/10 flex gap-1.5 items-center bg-black/40">
              <input
                type="text"
                required
                className="flex-grow min-w-0 py-1.5 px-2.5 rounded-lg text-[11px] glass-input"
                placeholder="Message..."
                value={newMessage}
                onChange={handleTyping}
              />
              <button
                type="submit"
                className="p-1.5 bg-pink-500 hover:bg-pink-500/90 text-white rounded-lg transition shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
