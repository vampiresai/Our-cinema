import React from "react";
import {
  Clapperboard,
  Heart,
  Film,
  UserCircle,
  Sparkles,
  Popcorn,
  LucideIcon,
} from "lucide-react";

const AVATAR_MAP: Record<string, LucideIcon> = {
  popcorn: Popcorn,
  heart: Heart,
  film: Film,
  clapperboard: Clapperboard,
  sparkles: Sparkles,
  user: UserCircle,
};

const LEGACY_EMOJI: Record<string, string> = {
  "🍿": "popcorn",
  "💖": "heart",
  "🎬": "film",
  "✨": "sparkles",
};

export function resolveAvatarKey(avatar: string): string {
  if (LEGACY_EMOJI[avatar]) return LEGACY_EMOJI[avatar];
  if (AVATAR_MAP[avatar]) return avatar;
  return "user";
}

export function UserAvatar({
  avatar,
  className = "w-4 h-4",
  filled = false,
}: {
  avatar: string;
  className?: string;
  filled?: boolean;
}) {
  const key = resolveAvatarKey(avatar);
  const Icon = AVATAR_MAP[key] || UserCircle;
  const fillClass =
    filled || key === "heart" || key === "popcorn"
      ? "fill-current opacity-80"
      : "";
  return <Icon className={`${className} ${fillClass}`} />;
}

import { UPLOADER_EMAIL } from "../config/env";

export const SAHIL_EMAIL = UPLOADER_EMAIL;
export function canUpload(user: { email: string }): boolean {
  return user.email.toLowerCase() === UPLOADER_EMAIL.toLowerCase();
}
