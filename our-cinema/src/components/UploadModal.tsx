import React, { useState, useRef } from "react";
import {
  X, UploadCloud, Film, Image as ImageIcon, AlertCircle,
  FolderOpen, Clapperboard, GripVertical, ChevronUp, ChevronDown,
} from "lucide-react";
import { motion } from "motion/react";
import { guessEpisodeNumber, isVideoFile } from "../utils/watchParty";
import { hasLocalMediaServer } from "../config/api";
import {
  createMovieMetadata,
  uploadCover,
  uploadMovieVideo,
  uploadEpisodeVideo,
} from "../services/movieService";

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

interface EpisodeFile {
  file: File;
  episodeNumber: number;
  title: string;
}

export default function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
  const [uploadType, setUploadType] = useState<"movie" | "series">("movie");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Romance & Drama");
  const [duration, setDuration] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [episodeFiles, setEpisodeFiles] = useState<EpisodeFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image (JPG, PNG, WebP).");
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
    setErrorMessage("");
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f): f is File => f instanceof File && isVideoFile(f.name));
    if (files.length === 0) {
      setErrorMessage("No video files found in the selected folder.");
      return;
    }
    const mapped: EpisodeFile[] = files
      .map((file) => ({
        file,
        episodeNumber: guessEpisodeNumber(file.name) ?? 0,
        title: file.name.replace(/\.[^.]+$/, ""),
      }))
      .sort((a, b) => (a.episodeNumber && b.episodeNumber ? a.episodeNumber - b.episodeNumber : a.file.name.localeCompare(b.file.name)));
    mapped.forEach((ep, idx) => { if (!ep.episodeNumber) ep.episodeNumber = idx + 1; });
    setEpisodeFiles(mapped);
    setErrorMessage("");
  };

  const updateEpisodeNumber = (index: number, num: number) => {
    setEpisodeFiles((prev) => prev.map((ep, i) => (i === index ? { ...ep, episodeNumber: Math.max(1, num) } : ep)));
  };

  const moveEpisode = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= episodeFiles.length) return;
    setEpisodeFiles((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy.map((ep, i) => ({ ...ep, episodeNumber: i + 1 }));
    });
  };

  const startUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category) {
      setErrorMessage("Please fill in title, category, and description.");
      return;
    }
    if (uploadType === "movie" && !videoFile) {
      setErrorMessage("Please select a movie file.");
      return;
    }
    if (uploadType === "series" && episodeFiles.length === 0) {
      setErrorMessage("Please select a folder with episode files.");
      return;
    }

    setErrorMessage("");
    setIsUploading(true);
    setUploadPercent(0);
      setStatusMessage("Creating listing...");

    try {
      const movieId = await createMovieMetadata({
        title,
        description,
        category,
        type: uploadType,
        duration: duration ? Number(duration) * 60 : 360,
        episodeCount: uploadType === "series" ? episodeFiles.length : undefined,
      });

      if (coverFile) {
        setStatusMessage("Uploading cover image...");
        await uploadCover(movieId, coverFile);
      }

      if (uploadType === "movie" && videoFile) {
        setStatusMessage("Saving to local uploads folder...");
        await uploadMovieVideo(movieId, videoFile, setUploadPercent);
      } else {
        const total = episodeFiles.length;
        for (let i = 0; i < total; i++) {
          const ep = episodeFiles[i];
          const sizeMb = (ep.file.size / (1024 * 1024)).toFixed(1);
          setStatusMessage(
            `Uploading episode ${ep.episodeNumber} (${i + 1}/${total}) — ${sizeMb} MB…`
          );
          setUploadPercent(Math.floor((i / total) * 100));
          const basePct = Math.floor((i / total) * 100);
          const slice = Math.floor(100 / total);
          await uploadEpisodeVideo(movieId, ep.episodeNumber, ep.file, (chunkPct) => {
            const overall = basePct + Math.floor((chunkPct / 100) * slice);
            setUploadPercent(Math.min(99, Math.max(1, overall)));
          });
        }
      }

      setStatusMessage("Upload complete!");
      setUploadPercent(100);
      setTimeout(() => {
        setIsUploading(false);
        onUploadComplete();
        onClose();
      }, 1000);
    } catch (err: unknown) {
      console.error("Upload error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl rounded-2xl glass p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button onClick={onClose} disabled={isUploading} className="absolute top-4 right-4 text-gray-400 hover:text-white transition disabled:opacity-35 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Clapperboard className="w-5 h-5 text-pink-500" />
          <h2 className="text-xl font-serif font-bold text-white">Upload Content</h2>
        </div>

        <div className="flex gap-2 mb-4 p-1 bg-black/30 rounded-lg border border-white/10">
          <button type="button" onClick={() => { setUploadType("movie"); setEpisodeFiles([]); }} disabled={isUploading}
            className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${uploadType === "movie" ? "bg-pink-500 text-white" : "text-gray-400 hover:text-white"}`}>
            <Film className="w-3.5 h-3.5" /> Single Movie
          </button>
          <button type="button" onClick={() => { setUploadType("series"); setVideoFile(null); }} disabled={isUploading}
            className={`flex-1 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${uploadType === "series" ? "bg-pink-500 text-white" : "text-gray-400 hover:text-white"}`}>
            <FolderOpen className="w-3.5 h-3.5" /> TV Series
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-600/40 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMessage}</span>
          </div>
        )}

        {!hasLocalMediaServer() && (
          <div className="mb-4 p-3 rounded-lg bg-amber-900/25 border border-amber-600/30 text-amber-100 text-xs leading-relaxed">
            Uploads are not available on Firebase Hosting alone. Open your{" "}
            <span className="font-mono">*.onrender.com</span> URL, or run{" "}
            <span className="font-mono">npm run dev</span> locally.
          </div>
        )}

        <form onSubmit={startUpload} className="space-y-4">
          {uploadType === "movie" ? (
            !videoFile ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-pink-500/40 rounded-xl p-8 text-center bg-black/25 cursor-pointer transition group">
                <UploadCloud className="w-9 h-9 mx-auto text-pink-500/70 group-hover:text-pink-500 transition mb-2" />
                <p className="text-xs font-medium text-gray-200">Drop a movie file or click to browse</p>
                <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={(e) => e.target.files?.[0] && setVideoFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <Film className="w-4 h-4 text-pink-400 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-white truncate">{videoFile.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={() => setVideoFile(null)} disabled={isUploading} className="text-pink-400 text-[10px] font-bold cursor-pointer">Change</button>
              </div>
            )
          ) : episodeFiles.length === 0 ? (
            <div onClick={() => folderInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-pink-500/40 rounded-xl p-8 text-center bg-black/25 cursor-pointer transition group">
              <FolderOpen className="w-9 h-9 mx-auto text-pink-500/70 group-hover:text-pink-500 transition mb-2" />
              <p className="text-xs font-medium text-gray-200">Select a folder with episode files</p>
              <input type="file" ref={folderInputRef} className="hidden" {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)} multiple onChange={handleFolderSelect} />
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <div className="px-3 py-2 bg-white/5 border-b border-white/10 flex justify-between">
                <span className="text-[10px] font-mono uppercase text-gray-400">{episodeFiles.length} episodes</span>
                <button type="button" onClick={() => setEpisodeFiles([])} disabled={isUploading} className="text-[10px] text-pink-400 cursor-pointer">Change folder</button>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-white/5">
                {episodeFiles.map((ep, idx) => (
                  <div key={ep.file.name + idx} className="flex items-center gap-2 px-3 py-2 text-xs">
                    <GripVertical className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <input type="number" min={1} value={ep.episodeNumber} onChange={(e) => updateEpisodeNumber(idx, Number(e.target.value))} disabled={isUploading}
                      className="w-12 py-0.5 px-1 rounded bg-black/40 border border-white/10 text-center text-[11px] text-white font-mono" />
                    <span className="truncate text-gray-300 flex-grow">{ep.file.name}</span>
                    <div className="flex flex-col shrink-0">
                      <button type="button" onClick={() => moveEpisode(idx, -1)} disabled={idx === 0 || isUploading} className="text-gray-500 hover:text-white disabled:opacity-30 cursor-pointer"><ChevronUp className="w-3 h-3" /></button>
                      <button type="button" onClick={() => moveEpisode(idx, 1)} disabled={idx === episodeFiles.length - 1 || isUploading} className="text-gray-500 hover:text-white disabled:opacity-30 cursor-pointer"><ChevronDown className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1">Title</label>
                <input type="text" required disabled={isUploading} className="w-full p-2 rounded-lg text-xs glass-input text-white" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1">Category</label>
                <select required disabled={isUploading} className="w-full p-2 rounded-lg text-xs glass-input text-white" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Romance & Drama" className="bg-black">Romance & Drama</option>
                  <option value="TV Series" className="bg-black">TV Series</option>
                  <option value="Anime & Fantasy" className="bg-black">Anime & Fantasy</option>
                  <option value="Adventure Thriller" className="bg-black">Adventure Thriller</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1.5">Cover Image</label>
              {coverPreview ? (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10">
                  <img src={coverPreview} alt="Cover" className="w-14 h-20 object-cover rounded-md" />
                  <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }} disabled={isUploading} className="text-[10px] text-pink-400 cursor-pointer">Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => coverInputRef.current?.click()} disabled={isUploading}
                  className="w-full p-3 rounded-lg border border-dashed border-white/15 hover:border-pink-500/40 text-xs text-gray-300 flex items-center justify-center gap-2 cursor-pointer">
                  <ImageIcon className="w-4 h-4 text-pink-400" /> Upload poster / cover
                </button>
              )}
              <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={handleCoverSelect} />
            </div>

            {uploadType === "movie" && (
              <div>
                <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1">Duration (min)</label>
                <input type="number" disabled={isUploading} className="w-full p-2 rounded-lg text-xs glass-input text-white" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-mono text-gray-500 mb-1">Description</label>
              <textarea required rows={2} disabled={isUploading} className="w-full p-2 rounded-lg text-xs glass-input resize-none text-white" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {isUploading && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <div className="flex justify-between text-[11px] text-gray-300">
                <span className="animate-pulse">{statusMessage}</span>
                <span className="font-mono font-bold text-pink-400">{uploadPercent}%</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-pink-500 h-full transition-all" style={{ width: `${uploadPercent}%` }} />
              </div>
            </div>
          )}

          {!isUploading && (
            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 text-xs rounded-lg hover:bg-white/5 cursor-pointer">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-pink-500 hover:bg-pink-500/90 text-white text-xs font-bold rounded-lg cursor-pointer">Upload</button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
