import React, { useState, useRef } from "react";
import { User, Movie, CoupleStats } from "../types";
import { Search, Heart, Sparkles, MessageSquare, Play, Upload, Star, Clock, Trash2, Calendar, Film, Info, Users, ListVideo, ImagePlus } from "lucide-react";
import { canUpload } from "../utils/avatars";
import CoverImage from "./CoverImage";
import { getThumbnailUrl, hasCover } from "../utils/media";
import { motion } from "motion/react";

interface LibraryProps {
  currentUser: User;
  movies: Movie[];
  onSelectMovie: (movie: Movie, launchRoom: boolean) => void;
  onLikeMovie: (movieId: string) => void;
  onAddReview: (movieId: string, rating: number, comment: string) => void;
  onDeleteMovie: (movieId: string) => void;
  onOpenUpload: () => void;
  onEditCover: (movieId: string, file: File) => void;
  coupleStats: CoupleStats;
}

export default function Library({
  currentUser,
  movies,
  onSelectMovie,
  onLikeMovie,
  onAddReview,
  onDeleteMovie,
  onOpenUpload,
  onEditCover,
  coupleStats,
}: LibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeDetailMovie, setActiveDetailMovie] = useState<Movie | null>(null);
  const coverInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const isAdmin = canUpload(currentUser);

  // Review form states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Group Categories
  const categories = ["All", ...Array.from(new Set(movies.map((m) => m.category)))];

  // Filter movies
  const filteredMovies = movies.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pick first movie for Hero Banner background fallback
  const heroMovie = movies[0];

  const handleReviewSubmit = async (e: React.FormEvent, movieId: string) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setIsSubmittingReview(true);
    await onAddReview(movieId, rating, comment);
    setComment("");
    setIsSubmittingReview(false);
    
    // Refresh detail modal dataset
    const updated = movies.find((m) => m.id === movieId);
    if (updated) {
      setActiveDetailMovie(updated);
    }
  };

  return (
    <div className="pt-24 pb-24 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto selection:bg-[#FF4E7E] select-none">
      
      {/* 1. COUPLE STATS BENTO WIDGET */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl glass flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-[#FF4E7E]/10 flex items-center justify-center text-[#FF4E7E]">
            <Heart className="w-5 h-5 fill-[#FF4E7E]/20" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Days Together</div>
            <div className="text-lg font-bold font-mono text-white">{coupleStats.daysTogether} Days</div>
          </div>
        </div>

        <div className="p-4 rounded-xl glass flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-[#FF4E7E]/10 flex items-center justify-center text-[#FF4E7E]">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Films Watched</div>
            <div className="text-lg font-bold font-mono text-white">{coupleStats.moviesWatched} Cozy Sessions</div>
          </div>
        </div>

        <div className="p-4 rounded-xl glass flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-[#FF4E7E]/10 flex items-center justify-center text-[#FF4E7E]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Love Letters Chat</div>
            <div className="text-lg font-bold font-mono text-white">{coupleStats.chatMessagesCount} Sent</div>
          </div>
        </div>

        <div className="p-4 rounded-xl glass flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-[#FF4E7E]/10 flex items-center justify-center text-[#FF4E7E]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Hearts Swapped</div>
            <div className="text-lg font-bold font-mono text-white">{coupleStats.heartTapsCount} Shaken</div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC HERO BANNER */}
      {heroMovie && (
        <div className="relative w-full rounded-2xl overflow-hidden mb-12 shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/40 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-10"></div>
          {hasCover(heroMovie) ? (
            <img
              src={getThumbnailUrl(heroMovie)}
              alt={heroMovie.title}
              className="w-full h-[320px] md:h-[450px] object-cover object-top opacity-60 scale-100 hover:scale-105 transition-transform duration-1000"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-[320px] md:h-[450px] bg-gradient-to-br from-pink-950/60 via-black to-purple-950/40 flex items-center justify-center">
              <Film className="w-16 h-16 text-pink-500/30" />
            </div>
          )}
          <div className="absolute bottom-8 left-8 right-8 z-20 max-w-lg">
            <div className="flex items-center space-x-2 text-[#FF4E7E] text-xs font-bold uppercase tracking-widest mb-4">
              <span className="flex h-2 w-2 rounded-full bg-[#FF4E7E] animate-pulse"></span>
              <span>Playing Together Now</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold font-serif leading-none mb-4 tracking-tight text-white">
              {heroMovie.title}
            </h1>
            <p className="text-gray-300 text-sm line-clamp-2 mb-6 leading-relaxed max-w-md">
              {heroMovie.description}
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => onSelectMovie(heroMovie, true)}
                className="px-8 py-3 bg-white hover:bg-gray-100 text-black font-bold rounded-xl flex items-center space-x-2 text-xs transition active:scale-95 cursor-pointer shadow-lg"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Watch Together</span>
              </button>
              <button
                onClick={() => setActiveDetailMovie(heroMovie)}
                className="px-8 py-3 glass hover:bg-white/10 text-white font-bold rounded-xl flex items-center space-x-2 text-xs transition active:scale-95 cursor-pointer"
              >
                <span className="flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Details</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROW HEADER WITH FILTERS AND SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-serif font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF4E7E]" /> Cinema Archives
          </h3>
          <p className="text-xs text-[#FF4E7E]/80">Search and stream what makes our hearts click</p>
        </div>

        {/* Action button triggers */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {canUpload(currentUser) && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 bg-[#FF4E7E]/20 hover:bg-[#FF4E7E]/35 border border-[#FF4E7E]/35 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#FF4E7E]" />
              Upload Film
            </button>
          )}

          <div className="relative w-48 sm:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#FF4E7E]/70">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 rounded-lg text-xs glass-input"
              placeholder="Search movie favorites..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* CATEGORIES BUTTON FILTER */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer select-none whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-[#FF4E7E] border-[#FF4E7E] text-white font-semibold"
                : "bg-white/5 border-white/10 text-gray-300 hover:border-[#FF4E7E]/30"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. GRID LISTINGS */}
      {filteredMovies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-black/40 border border-pink-500/10 text-pink-400/70">
          <Film className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
          <h4 className="text-sm font-bold text-gray-200">No cozy releases spotted match criteria</h4>
          <p className="text-xs max-w-xs mx-auto mt-1 text-gray-400">Try tweaking your title lookup terms or add some fresh film logs to get streaming!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMovies.map((movie) => {
            const hasCurrentUserLiked = movie.likes?.includes(currentUser.id) || false;
            return (
              <motion.div
                key={movie.id}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="group relative rounded-xl overflow-hidden glass flex flex-col justify-between hover:border-[#FF4E7E]/30 transition-all shadow-lg"
              >
                {/* Visual Cover Poster */}
                <div className="relative aspect-video w-full overflow-hidden bg-[#050505]">
                  <CoverImage
                    movie={movie}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    iconClassName="w-12 h-12"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  
                  {/* Category Pill Tag */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 font-mono text-[9px] bg-[#050505]/80 border border-[#FF4E7E]/20 text-[#FF4E7E] rounded font-semibold uppercase flex items-center gap-1">
                    {movie.type === "series" && <ListVideo className="w-2.5 h-2.5" />}
                    {movie.category}
                  </span>

                  {/* Play / Edit Cover Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-[#050505]/75 transition-opacity duration-300">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSelectMovie(movie, true)}
                        className="p-3 bg-[#FF4E7E] hover:bg-[#FF4E7E]/90 rounded-full text-white transform hover:scale-110 active:scale-95 transition cursor-pointer"
                        title="Watch Together"
                      >
                        <Play className="w-5 h-5 fill-white pl-0.5" />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => coverInputRefs.current[movie.id]?.click()}
                            className="p-3 bg-black/60 hover:bg-white/10 rounded-full text-pink-300 hover:text-white border border-white/10 transform hover:scale-110 active:scale-95 transition cursor-pointer"
                            title="Change cover image"
                          >
                            <ImagePlus className="w-4 h-4" />
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => { coverInputRefs.current[movie.id] = el; }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onEditCover(movie.id, file);
                              e.target.value = "";
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-serif font-bold text-white group-hover:text-[#FF4E7E] transition-colors text-base line-clamp-1">
                        {movie.title}
                      </h4>
                      <div className="flex items-center gap-1 font-mono text-[9px] text-[#FF4E7E]">
                        <Clock className="w-3.5 h-3.5" />
                        {Math.floor(movie.duration / 60)}m
                      </div>
                    </div>
                    <p className="text-xs text-gray-300 font-light line-clamp-2 leading-relaxed mb-4">
                      {movie.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-gray-300">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onLikeMovie(movie.id)}
                        className={`flex items-center gap-1 hover:text-[#FF4E7E] transition cursor-pointer ${
                          hasCurrentUserLiked ? "text-[#FF4E7E] font-bold" : ""
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${hasCurrentUserLiked ? "fill-[#FF4E7E] text-[#FF4E7E]" : ""}`} />
                        <span>{movie.likes?.length || 0}</span>
                      </button>

                      <div className="flex items-center gap-1 text-[11px]">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        <span>{movie.reviews?.length || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveDetailMovie(movie)}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white uppercase font-mono tracking-wider font-bold text-[9px] cursor-pointer"
                      >
                        Launch
                      </button>

                      {canUpload(currentUser) && (
                        <button
                          onClick={() => {
                            if (confirm(`Remove film log '${movie.title}'?`)) {
                              onDeleteMovie(movie.id);
                            }
                          }}
                          className="p-1 hover:text-red-500 text-gray-500 transition cursor-pointer"
                          title="Delete film registry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </motion.div>
            );
          })}
        </div>
      )}

      {/* 5. MOVIE DETAIL / REVIEW DRAWER MODAL */}
      {activeDetailMovie && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl rounded-2xl glass shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Header poster detail banner */}
            <div className="relative aspect-video w-full bg-black">
              <CoverImage
                movie={activeDetailMovie}
                className="w-full h-full object-cover opacity-70"
                iconClassName="w-14 h-14"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] to-transparent"></div>
              
              <button
                onClick={() => setActiveDetailMovie(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/65 border border-white/15 text-white flex items-center justify-center font-bold text-xs hover:bg-black/95 transition cursor-pointer"
              >
                ✕
              </button>

              <div className="absolute bottom-4 left-4 right-4">
                <span className="px-2 py-0.5 bg-[#FF4E7E] rounded font-mono text-[8px] uppercase tracking-wider text-white font-bold">
                  {activeDetailMovie.category}
                </span>
                <h3 className="text-2xl font-serif font-extrabold text-white mt-1">
                  {activeDetailMovie.title}
                </h3>
              </div>
            </div>

            {/* Description and reviews */}
            <div className="p-6 space-y-6">
              <div>
                <p className="text-xs text-gray-200 leading-relaxed font-light mb-4">
                  {activeDetailMovie.description}
                </p>
                
                <div className="flex flex-wrap gap-4 text-xs font-mono text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-[#FF4E7E]" />
                    <span>Duration: {Math.floor(activeDetailMovie.duration / 60)} minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-[#FF4E7E]" />
                    <span>Uploaded: {new Date(activeDetailMovie.uploadDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    onSelectMovie(activeDetailMovie, false);
                    setActiveDetailMovie(null);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg active:scale-95 transition cursor-pointer"
                >
                  Watch Solo
                </button>
                <button
                  onClick={() => {
                    onSelectMovie(activeDetailMovie, true);
                    setActiveDetailMovie(null);
                  }}
                  className="px-5 py-2 bg-[#FF4E7E] hover:bg-[#FF4E7E]/95 text-white text-xs font-semibold rounded-lg active:scale-95 transition flex items-center gap-1.5 shadow-xl cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white pl-0.5" />
                  Watch Together
                </button>
              </div>

              {/* Reviews stream */}
              <div className="border-t border-white/5 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-200 mb-3 pl-1 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-[#FF4E7E] fill-[#FF4E7E]/20" />
                  Love Notes & Reviews ({activeDetailMovie.reviews?.length || 0})
                </h4>

                <div className="space-y-3 mb-6">
                  {(!activeDetailMovie.reviews || activeDetailMovie.reviews.length === 0) ? (
                    <p className="text-xs text-gray-400 font-light italic pl-1">
                      No reviews yet. Write one together.
                    </p>
                  ) : (
                    activeDetailMovie.reviews.map((r) => (
                      <div key={r.id} className="p-3 rounded-lg bg-white/5 border border-white/5 text-[11px]">
                        <div className="flex items-center justify-between mb-1 text-gray-200">
                          <span className="font-semibold">{r.userName}</span>
                          <span className="text-[10px] opacity-75 font-mono">{new Date(r.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#FF4E7E] mb-1.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`w-3 h-3 ${idx < r.rating ? "fill-[#FF4E7E] text-[#FF4E7E]" : "opacity-35"}`}
                            />
                          ))}
                        </div>
                        <p className="text-gray-100 leading-relaxed font-light">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Submissions form */}
                <form onSubmit={(e) => handleReviewSubmit(e, activeDetailMovie.id)} className="space-y-3 bg-[#050505]/45 p-3.5 rounded-xl border border-[#FF4E7E]/10">
                  <div className="flex items-center justify-between text-xs text-gray-300">
                    <span>Rate our stream:</span>
                    <div className="flex items-center gap-1.5 cursor-pointer">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const score = idx + 1;
                        return (
                          <Star
                            key={idx}
                            onClick={() => setRating(score)}
                            className={`w-4 h-4 cursor-pointer transition hover:scale-110 active:scale-95 ${
                              score <= rating ? "text-[#FF4E7E] fill-[#FF4E7E]/30" : "text-gray-500"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative">
                    <textarea
                      required
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-lg glass-input pr-10 resize-none font-light"
                      placeholder="Write a sweet cozy thought or film opinion..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="absolute right-2.5 bottom-2.5 px-3 py-1 bg-[#FF4E7E] hover:bg-[#FF4E7E]/90 text-white rounded text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmittingReview ? "Saving..." : "Log Note"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
