import React from "react";
import { Film } from "lucide-react";
import { Movie } from "../types";
import { getThumbnailUrl, hasCover } from "../utils/media";

interface CoverImageProps {
  movie: Movie;
  className?: string;
  iconClassName?: string;
}

export default function CoverImage({ movie, className = "", iconClassName = "w-10 h-10" }: CoverImageProps) {
  const src = getThumbnailUrl(movie);

  if (!hasCover(movie) || !src) {
    return (
      <div className={`bg-gradient-to-br from-pink-950/80 via-[#0a0a0a] to-purple-950/60 flex items-center justify-center ${className}`}>
        <Film className={`${iconClassName} text-pink-500/40`} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={movie.title}
      className={className}
      referrerPolicy="no-referrer"
    />
  );
}
