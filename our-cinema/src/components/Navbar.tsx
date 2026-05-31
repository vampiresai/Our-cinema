import { Film, LogOut, Heart, Bell, Gift, Users } from "lucide-react";
import { User, AppNotification } from "../types";
import React, { useState } from "react";
import { UserAvatar } from "../utils/avatars";

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onlineCount: number;
  triggerRomanticAction: (type: "heart_shower" | "thinking_of_you" | "date_mode_on") => void;
  notifications: AppNotification[];
  clearNotifications: () => void;
  isInRoom: boolean;
  roomId: string;
}

export default function Navbar({
  currentUser,
  onLogout,
  onlineCount,
  triggerRomanticAction,
  notifications,
  clearNotifications,
  isInRoom,
  roomId,
}: NavbarProps) {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass px-4 py-3 select-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* LOGO */}
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-lg bg-[#FF4E7E] flex items-center justify-center text-white shadow">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold tracking-tight text-white">
              Our Cinema
            </h1>
            <span className="text-[10px] text-[#FF4E7E] font-mono tracking-wider uppercase block -mt-1 font-bold">
              Love & Film Lounge
            </span>
          </div>
        </div>

        {/* Sync Room Status */}
        {isInRoom && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4E7E] animate-pulse"></span>
            <span className="text-gray-300">Room Linked:</span>
            <span className="font-mono text-white font-bold">{roomId}</span>
          </div>
        )}

        {/* MIDDLE ACTIONS: ROMANTIC CONTROLS */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={() => triggerRomanticAction("thinking_of_you")}
            title="Send 'Thinking of you' romantic notification hint!"
            className="px-2 sm:px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 active:translate-y-[1px] text-[11px] sm:text-xs text-white flex items-center gap-1 transition-all cursor-pointer font-medium"
          >
            <Gift className="w-3.5 h-3.5 text-[#FF4E7E]" />
            <span className="hidden sm:inline">Thinking of You</span>
            <span className="sm:hidden">Thinking</span>
          </button>

          <button
            onClick={() => triggerRomanticAction("heart_shower")}
            title="Erupt a dynamic beautiful heart burst particle overlay on both screens!"
            className="px-2 sm:px-3 py-1.5 rounded-full bg-[#FF4E7E] hover:bg-[#FF4E7E]/90 text-white active:translate-y-[1px] text-[11px] sm:text-xs font-bold flex items-center gap-1 transition-all shadow-lg cursor-pointer"
          >
            <Heart className="w-3.5 h-3.5 fill-white animate-pulse" />
            <span>Send Hearts</span>
          </button>
        </div>

        {/* RIGHTSIDE ACTIONS AND PROFILE */}
        <div className="flex items-center gap-3">
          {/* Active online members status */}
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <Users className="w-4 h-4 text-[#FF4E7E]" />
            <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              {onlineCount} active
            </span>
          </div>

          {/* Notifications Trigger and Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-1.5 rounded-full hover:bg-white/5 text-[#FF4E7E] transition-all cursor-pointer"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-[#FF4E7E] text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-xl glass-panel text-white shadow-2xl z-50 p-4 border border-white/10 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                    Couple Alerts Feed
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={clearNotifications}
                      className="text-[10px] text-[#FF4E7E] hover:underline cursor-pointer font-medium"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">
                      No notifications yet.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-2.5 rounded-lg text-xs border ${
                          n.read
                            ? "bg-white/5 border-white/5 opacity-80"
                            : "bg-[#FF4E7E]/10 border-[#FF4E7E]/20"
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium mb-1">
                          <span className="text-[#FF4E7E] text-[11px]">{n.title}</span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(n.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-100 leading-tight font-light">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile identifier */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <span
              className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-pink-400"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              <UserAvatar avatar={currentUser.avatar} className="w-4 h-4" filled />
            </span>
            <div className="hidden lg:block text-left text-xs selection:bg-[#FF4E7E]/60">
              <div className="font-bold text-white leading-tight">
                {currentUser.name}
              </div>
              <div className="text-[10px] uppercase font-mono tracking-wider font-semibold opacity-75 text-gray-400">
                {currentUser.role}
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Logout Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </nav>
  );
}
