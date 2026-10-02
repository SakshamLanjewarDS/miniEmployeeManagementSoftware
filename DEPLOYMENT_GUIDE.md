# 100% DESIGN Studio OS — Complete Deployment & App Installation Guide

This guide explains how to deploy **100% DESIGN Studio OS** to production and install the native application icon across all devices (iPhones, Android phones, Windows laptops, and MacBooks).

---

## Part 1: Installing the App Icon on All Devices

**100% DESIGN Studio OS** is built as an installable **Progressive Web App (PWA)** with native home screen icons, offline shell caching, standalone fullscreen display, and app shortcuts.

### Important Requirement for Mobile Installation:
> [!IMPORTANT]
> Mobile browsers (iOS Safari and Android Chrome) only allow installing web apps when accessed over **HTTPS** (or `localhost`). If running on a local Wi-Fi network, use a free secure tunnel such as **Cloudflare Tunnel** or **ngrok** so devices get a secure `https://` link.

---

### 1. iPhone & iPad (iOS Safari)
1. Open **Safari** on your iPhone or iPad.
2. Navigate to your deployed URL (e.g., `https://your-studio-app.com`).
3. Tap the **Share** button (the square with an arrow pointing up at the bottom of the screen).
4. Scroll down in the share sheet and tap **"Add to Home Screen"**.
5. The gold and royal navy **100% DESIGN** icon and the name **Studio OS** will appear. Tap **Add** in the top-right corner.
6. The app is now placed on your home screen alongside native apps and launches in fullscreen without Safari browser toolbars.

---

### 2. Android Phone & Tablet (Chrome / Samsung Internet)
1. Open **Google Chrome** or **Samsung Internet** on your Android device.
2. Navigate to your deployed URL (e.g., `https://your-studio-app.com`).
3. Tap the **"Install App"** button in the app topbar / sidebar, **OR** tap the Chrome menu (**⋮** three vertical dots in the top-right corner).
4. Tap **"Install app"** or **"Add to Home screen"**.
5. Tap **Install** on the prompt.
6. Android will place the adaptive maskable icon on your phone launcher. Long-pressing the icon reveals quick shortcuts (Site Visits, Projects, Drawings).

---

### 3. Windows Laptop & PC (Google Chrome or Microsoft Edge)
1. Open the website in **Google Chrome** or **Microsoft Edge**.
2. Look at the right side of the URL address bar at the top:
   - In **Chrome**: Click the small **"Install 100% DESIGN Studio OS"** icon (monitor with down arrow).
   - In **Edge**: Click the **"App available. Install"** icon (three squares with a plus).
   - Or click the **"Install Studio App"** button in the sidebar / top bar.
3. Click **Install**.
4. Windows will create a standalone desktop app window, add a desktop shortcut, and pin it to your **Start Menu** and **Taskbar**.

---

### 4. MacBook & iMac (Safari or Chrome on macOS)
- **Safari (macOS Sonoma 14+)**:
  1. Open the website in Safari.
  2. In the top menu bar, click **File > Add to Dock...**.
  3. Confirm the name **Studio OS** and click **Add**. The icon appears in your Mac Dock and Launchpad.
- **Chrome / Edge on Mac**:
  1. Click the **Install** icon in the URL address bar.
  2. Click **Install**. The app will be placed in your `Applications` folder and Dock.

---

## Part 2: Deployment Options

Choose the deployment method that fits your setup:

### Option A: Railway (Recommended — Fastest Cloud Deployment)
Railway natively supports Next.js, MySQL, and persistent disk storage in a few clicks.

1. Go to [Railway.app](https://railway.app) and create an account.
2. Click **New Project** > **Provision MySQL**.
   - Note down the `DATABASE_URL` from the MySQL service variables.
3. Click **New** > **GitHub Repo** > Select your `miniEmployeeManagementSoftware` repository.
4. In the app service settings, set the **Environment Variables**:
   - `DATABASE_URL`: `${{MySQL.DATABASE_URL}}` (or paste your MySQL connection string)
   - `SESSION_SECRET`: `d100_architecture_studio_multi_tenant_secret_key_prod_64bytes_hex_secure_token`
   - `NEXT_PUBLIC_APP_NAME`: `100% DESIGN Studio OS`
   - `APP_DEFAULT_TIMEZONE`: `Asia/Kolkata`
   - `APP_DEFAULT_CURRENCY`: `INR`
   - `NODE_ENV`: `production`
   - `STORAGE_LOCAL_ROOT`: `/app/storage/uploads`
5. In **Volumes**, attach a persistent volume to `/app/storage/uploads` (for PDF drawings and photo attachments).
6. Click **Deploy**. Railway will run `npm run build` and launch the app with a public `https://*.up.railway.app` domain.

---

### Option B: Docker Compose (Self-Hosted on VPS, Ubuntu, or Office Server)
The repository includes a ready-to-run `Dockerfile` and `docker-compose.yml` that bundles MySQL 8.0 and the Next.js app.

1. Install **Docker** and **Docker Compose** on your server.
2. Clone or copy the project folder to the server:
   ```bash
   git clone <your-repo-url>
   cd miniEmployeeManagementSoftware
   ```
3. (Optional) Customize passwords in `.env` or `docker-compose.yml`.
4. Start the stack:
   ```bash
   docker compose up -d --build
   ```
5. Seed initial demo data (if needed):
   ```bash
   docker compose exec app npm run db:seed
   ```
6. Your application is now live at `http://your-server-ip:3000` with data stored safely in Docker volumes (`mysql_data` and `app_storage`).

---

### Option C: Local Windows / Office Network with Free Cloudflare HTTPS
If you want to run the software on your current Windows laptop/PC and share it securely with colleagues on their phones and laptops right now:

1. **Start the production server on Windows**:
   ```powershell
   npm run build
   npm run start
   ```
2. **Expose with Cloudflare Tunnel (Free HTTPS & Instant PWA)**:
   - Download the single executable `cloudflared.exe` from [Cloudflare Releases](https://github.com/cloudflare/cloudflared/releases).
   - In PowerShell, run:
     ```powershell
     .\cloudflared.exe tunnel --url http://localhost:3000
     ```
   - Cloudflare will output a public HTTPS URL like:
     ```
     https://xxxx-xx-xx-xx.trycloudflare.com
     ```
   - Send this link to anyone on iPhone, Android, or laptop. They can immediately open it, log in, and tap **"Install App"** to get the icon on their home screen!

---

### Option D: Vercel + Cloud Database
If deploying to Vercel:
1. Push code to GitHub.
2. Import project into [Vercel](https://vercel.com).
3. Connect a remote MySQL database (e.g. from Railway MySQL, PlanetScale, Aiven, or Supabase).
4. Add environment variables in Vercel project settings:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `NEXT_PUBLIC_APP_NAME`
5. *Note*: Because Vercel functions have an ephemeral filesystem, drawing files saved to `./storage/uploads` will not persist across Vercel function instances. For long-term file attachments on Vercel, integrate S3 or Cloudinary, or use Railway/Docker (Option A or B).

---

## Default Login Credentials (from Seed)

- **Organization**: `100percentdesign`
- **Owner / Principal Architect**:
  - Employee ID: `EMP001` or `admin@100percentdesign.in`
  - Password: `Password@123`
- **Project Manager**:
  - Employee ID: `EMP002` or `pm@100percentdesign.in`
  - Password: `Password@123`
- **Employee / Site Architect**:
  - Employee ID: `EMP003` or `architect@100percentdesign.in`
  - Password: `Password@123`
