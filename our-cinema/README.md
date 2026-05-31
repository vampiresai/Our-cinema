# Our Cinema

Private couple's movie app: Firebase Auth + Realtime Database for metadata, local disk for videos, Socket.IO for watch parties.

## Quick start (local)

```bash
cp .env.example .env
# Edit .env with Firebase web app config from the Firebase console
npm install
npm run dev
```

## Deploy

See **[DEPLOY_RENDER.md](./DEPLOY_RENDER.md)** for Render (recommended full stack).

## Security

- Never commit `.env`, `uploads/`, or Firebase admin JSON keys.
- Client Firebase keys are injected at build time via `VITE_*` variables (see `.env.example`).
- Keep `VITE_UPLOADER_EMAIL` in sync with `database.rules.json`.
