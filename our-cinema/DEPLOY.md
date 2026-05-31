# Deploy media server (videos + watch party) — free, no Firebase Storage

Your **UI** stays on Firebase Hosting. Your **videos** run on a free Node server (`server.ts`).

## Part 1 — Deploy `server.ts` on Render (free)

1. Push this project to **GitHub** (if it is not there yet).

2. Go to [https://render.com](https://render.com) → sign up → **New** → **Web Service**.

3. Connect your GitHub repo.

4. Use these settings:

   | Setting | Value |
   |--------|--------|
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |
   | **Environment** | Add `NODE_ENV` = `production` |

   Or use **New → Blueprint** and point at `render.yaml` in this repo.

5. Click **Create Web Service**. Wait until the deploy is **Live**.

6. Copy your service URL, e.g. `https://our-cinema-media.onrender.com`  
   (no trailing slash)

**Note:** On Render’s free plan, uploaded videos may be **deleted when the service restarts**. For a personal cinema that is usually fine; re-upload if needed.

---

## Part 2 — Point Firebase Hosting at that server

On your PC, in the project folder:

**Windows (PowerShell):**

```powershell
cd c:\Users\rames\Downloads\our-cinema
$env:VITE_API_BASE_URL="https://YOUR-SERVICE.onrender.com"
npm run build:hosting
npx firebase deploy --only hosting
```

Replace `YOUR-SERVICE` with your real Render hostname.

**Mac/Linux:**

```bash
VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com npm run build:hosting
firebase deploy --only hosting
```

---

## Part 3 — Test

1. Open **https://pookie-4b24a.web.app** (hard refresh: Ctrl+Shift+R).
2. Log in as Sahil.
3. Upload a **cover** (works without Render).
4. Upload a **video** — should upload to Render, not Firebase Storage.
5. Play the video and try a watch party.

---

## Easier option: everything on your PC

Skip Render. On your computer only:

```bash
npm run dev
```

Open `http://localhost:3000` — uploads and watch parties all work locally. No Firebase Storage, no paid hosting.

---

## Railway / Fly.io

Same idea as Render:

- **Build:** `npm install && npm run build`
- **Start:** `NODE_ENV=production npm start`
- Set `PORT` from the platform (already supported in `server.ts`)
- Use the public URL as `VITE_API_BASE_URL` when building the frontend
