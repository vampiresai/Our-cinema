import React, { useState } from "react";
import { Film, Heart, Eye, EyeOff, Lock, Mail, User as UserIcon, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { loginWithEmail } from "../services/authService";
import { User } from "../types";
import { SAHIL_EMAIL } from "../utils/avatars";

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

function getWelcomeName(name: string, email: string): string {
  if (email.toLowerCase() === SAHIL_EMAIL) return "Sahil";
  const lower = name.toLowerCase();
  if (lower.includes("veeasha") || lower.includes("veasha")) return "Pookie";
  return name || "Pookie";
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [welcome, setWelcome] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const user = await loginWithEmail(email.trim(), password, name.trim());
      const greet = getWelcomeName(name.trim() || user.name, email.trim());
      setWelcome(greet);
      setTimeout(() => onLoginSuccess(user), 1600);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "code" in err
          ? (err as { code: string }).code === "auth/invalid-credential"
            ? "Invalid email or password"
            : (err as { message?: string }).message || "Login failed"
          : "Something went wrong. Try again.";
      setError(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden px-4">
      <div className="atmosphere" />

      <AnimatePresence>
        {welcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#050505]"
          >
            <Heart className="w-14 h-14 text-pink-500 fill-pink-500/30 animate-heartbeat" />
            <h1 className="text-4xl font-serif font-bold text-white">
              Welcome, <span className="text-pink-400">{welcome}</span>
            </h1>
            <p className="text-sm text-gray-400">Entering your cinema…</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-8 rounded-2xl glass relative z-10 shadow-2xl"
      >
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#FF4E7E] text-white rounded-full flex items-center justify-center shadow-lg border border-[#FF4E7E]/20">
          <Heart className="w-6 h-6 animate-heartbeat fill-white" />
        </div>

        <div className="text-center mt-4 mb-8">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Film className="w-7 h-7 text-[#FF4E7E] animate-spin-slow" />
            <h1 className="text-3xl font-serif font-bold tracking-tight text-white">Our Cinema</h1>
          </div>
          <p className="text-sm text-gray-400">Just for us</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 p-3 rounded bg-[#FF4E7E]/10 border border-[#FF4E7E]/30 text-[#FF4E7E] text-xs text-center font-medium"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1.5 pl-1">
              Your Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#FF4E7E]">
                <UserIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                className="w-full py-2.5 pl-10 pr-4 rounded-lg text-sm glass-input text-white"
                placeholder="Sahil or Veeasha…"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1.5 pl-1">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#FF4E7E]">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                className="w-full py-2.5 pl-10 pr-4 rounded-lg text-sm glass-input text-white"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 tracking-wider uppercase mb-1.5 pl-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#FF4E7E]">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full py-2.5 pl-10 pr-10 rounded-lg text-sm glass-input text-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#FF4E7E] hover:text-[#FF4E7E]/80"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#FF4E7E] hover:bg-[#FF4E7E]/90 text-white font-bold text-sm rounded-lg shadow-lg active:translate-y-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
          >
            {isLoading ? "Signing in…" : "Enter Our Cinema"}
            <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
