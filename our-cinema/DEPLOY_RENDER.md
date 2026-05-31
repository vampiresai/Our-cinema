# Deploy Our Cinema on Render

One **Web Service** serves the React UI, upload API, video streaming, and Socket.IO watch parties.

## Before you push to GitHub

1. Copy `.env.example` → `.env` and fill in values from [Firebase Console](https://console.firebase.google.com/) → Project settings → Your apps.
2. Confirm `.env` and `uploads/` are **not** tracked (`git status` should not list them).
3. If Firebase config was ever committed in old builds, rotate the API key in Google Cloud Console (optional hardening).

## Render setup

### Option A — Blueprint

1. Push this repo to GitHub (no `.env`, no `uploads/`).
2. [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint** → select the repo.
3. When prompted, set every `sync: false` variable (all `VITE_FIREBASE_*`, `VITE_UPLOADER_EMAIL`).
4. Deploy. Open the service URL (e.g. `https://our-cinema-xxxx.onrender.com`).

### Option B — Manual Web Service

| Setting | Value |
|--------|--------|
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

**Environment variables** (required at **build** time for Vite):

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `VITE_BUNDLE_API` | `true` |
| `VITE_FIREBASE_API_KEY` | from Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `your-project` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | numeric |
| `VITE_FIREBASE_APP_ID` | `1:...:web:...` |
| `VITE_FIREBASE_DATABASE_URL` | `https://your-project-default-rtdb.firebaseio.com` |
| `VITE_UPLOADER_EMAIL` | same email as in `database.rules.json` |

Render sets `PORT` automatically; do not hardcode it.

## Firebase after deploy

1. **Authentication** → Settings → **Authorized domains** → add your Render hostname (`*.onrender.com` or the exact URL).
2. Publish Realtime Database rules: `firebase deploy --only database` (from a machine with Firebase CLI).
3. Ensure `database.rules.json` uses the same email as `VITE_UPLOADER_EMAIL`.

## Uploads & disk

- Videos and covers are stored in `uploads/` on the server.
- **Free tier**: disk is **ephemeral** — uploads are lost when the service restarts or redeploys.
- For persistence, add a [Render persistent disk](https://render.com/docs/disks) mounted at `uploads` (paid add-on).

## Local development

```bash
cp .env.example .env
# fill .env, then:
npm install
npm run dev
```

Open `http://localhost:3000` — uploads work against local `uploads/`.

## Firebase Hosting only (not recommended for uploads)

`npm run build:hosting` + `firebase deploy --only hosting` serves the UI only. Upload/stream APIs need the full Render (or local `npm run dev`) stack.
