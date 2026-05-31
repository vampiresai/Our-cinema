import { getMissingEnvKeys } from "../config/env";

export default function ConfigSetup() {
  const missing = getMissingEnvKeys();

  return (
    <div className="min-h-screen bg-[#050505] text-[#f3f0f7] flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl border border-pink-500/30 bg-[#121212] p-8 shadow-xl">
        <h1 className="text-2xl font-serif font-bold text-pink-400 mb-2">Our Cinema — setup needed</h1>
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
          Firebase environment variables are missing, so the app cannot start. This usually means you
          have not created a <code className="text-pink-300">.env</code> file yet.
        </p>
        <ol className="text-sm text-gray-300 space-y-2 mb-6 list-decimal list-inside">
          <li>
            Copy <code className="text-pink-300">.env.example</code> to{" "}
            <code className="text-pink-300">.env</code>
          </li>
          <li>
            Fill values from Firebase Console → Project settings → Your apps → Web app
          </li>
          <li>
            Restart: <code className="text-pink-300">npm run dev</code>
          </li>
        </ol>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Missing variables</p>
        <ul className="text-xs font-mono text-amber-200/90 space-y-1 bg-black/40 rounded-lg p-3 border border-white/10">
          {missing.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
