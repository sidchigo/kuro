# kuro.

> **One film. One sentence. Three nightmares.**  
> A deterministic horror movie discovery engine with a neo-brutalist Japanese editorial grid aesthetic (inspired by `finders-tokyo.co.jp`).

[![Deploy to Production](https://github.com/sidchigo/kuro/actions/workflows/deploy.yml/badge.svg)](https://github.com/sidchigo/kuro/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![SvelteKit 2](https://img.shields.io/badge/SvelteKit-2.x-E62E25.svg)](https://kit.svelte.dev/)
[![Svelte 5](https://img.shields.io/badge/Svelte-5.x_(Runes)-FF6B00.svg)](https://svelte.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-00E676.svg)](https://tailwindcss.com/)

Live Deployment: **[https://kuro.siddheshnaik.dev](https://kuro.siddheshnaik.dev)**

---

## Architecture & Tech Stack

- **Framework**: [SvelteKit 2](https://kit.svelte.dev/) (SSR + API endpoints)
- **UI & State**: [Svelte 5](https://svelte.dev/) with fine-grained Runes (`$state`, `$derived`, `$effect`)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) adhering to a strict neo-brutalist design system (hairline `#262629` borders, `0px !important` border-radius, zero shadows, stark `#0A0A0B` obsidian background)
- **Typography**: Instrument Serif, IBM Plex Mono, Inter
- **On-Device Embedding & Semantic Reranking**:
  - Client-side semantic inference powered by `@huggingface/transformers` running `xenova/all-MiniLM-L6-v2` in a dedicated Web Worker.
  - Accelerated with ONNX Runtime WebAssembly and SIMD multithreading.
  - High-performance cosine similarity reranking with persistent IndexedDB vector caching.
  - Zero third-party LLM API fees or latency bottlenecks for discovery.
- **Persistence & ORM**: [Drizzle ORM](https://orm.drizzle.team/) with [LibSQL / SQLite](https://github.com/tursodatabase/libsql). Runs locally as a standalone file (`data/kuro.db`) with zero external database dependencies, or seamlessly connects to Turso for remote clustering.
- **Authentication**: Dual-provider architecture:
  - **1-Click Google OAuth 2.0**: Production sign-in with automatic token rotation.
  - **Local Credentials**: Built-in Username/Password registration and login with salted `scrypt` hashing for local clones, self-hosting, and offline development.
  - **RBAC**: Multi-user permissions (`Admin` and `Member`) with a pre-seeded local administrator account (`admin` / `kuroadmin123`).
- **CI/CD & Hosting**: Automated GitHub Actions deployment pipeline deploying directly to an Oracle Cloud VM running Node 20 via `systemd`, reverse-proxied by Nginx with Let's Encrypt SSL and Cloudflare edge caching.

---

## Features

### 1. 3-Column Editorial Grid Layout
- **Left Column**: Oversized brand wordmark (`kuro.`), dynamic TMDB poster stage with director, year, language, and runtime badges, plus a 1-click `[RANDOM HORROR FILM] SHUFFLE` roll.
- **Center Column (430px Core)**: 
  - `01 / STARTING FILM`: Active seed film summary with quick-change modal and watchlist/seen toggles.
  - `02 / WHAT STAYED WITH YOU`: High-contrast Sentence Canvas with a 140-character pitch limit and starter prompts.
  - `03 / POOL & TRIGGER`: Preset filters (`ALL` | `CULT GEMS` | `FOREIGN`) and trigger button.
  - `04 / RESULTS STACK`: Reranked discovery cards with match percentages, shared horror DNA tags, contextual pitch sentences, and honest caveats (`CATCH`).
- **Right Column (My Archive)**: Real-time user drawer featuring:
  - **Plan to Watch**: Watchlist dynamically ranked by taste affinity against films you've already seen.
  - **Recent Searches**: Remembers your recent seed films and pitches for 1-click restoration.
  - **Already Seen**: Blacklists previously watched films from candidate generation with interactive 1–5 star ratings.

### 2. 4-Slot Accent Theme Switcher
Customizable accent theme with instantaneous zero-flicker propagation across logo dots, highlights, star ratings, and the Sentence Canvas:
- **Crimson** (`#E62E25` — Default)
- **Amber** (`#FF6B00`)
- **Acid** (`#00E676`)
- **Custom Color Chooser**: Native color picker swatch allowing users to select any hex accent.
- *Persistence*: Saved in `localStorage` for guests and synchronized via debounced database updates for logged-in users.

### 3. Dedicated Administrative & Archive Hubs
- **`/archive`**: Full-screen dedicated management interface for Plan to Watch, Already Seen, and Search History with instant search filtering.
- **`/admin`**: Administrative control panel featuring:
  - **Users Directory**: Role toggle (`Admin` / `Member`), account deletion, and usage telemetry.
  - **Discovery Audit**: Real-time log of recent search queries, seeds, candidate counts, and match results.
  - **System Metrics**: Visual overview of total users, discoveries, and active sessions.

---

## Directory Structure

```text
kuro/
├── .github/workflows/       # GitHub Actions automated VM deployment pipeline
├── data/                    # Local SQLite database storage (auto-created)
├── static/                  # Static assets (favicons, self-cleanup sw.js)
├── src/
│   ├── components/          # Svelte 5 UI components
│   │   ├── AuthModal.svelte         # Dual Google & Local credentials modal
│   │   ├── KuroApp.svelte           # Main reactive shell coordinator
│   │   ├── LeftColumn.svelte        # Brand header & poster stage
│   │   ├── RightColumn.svelte       # Archive sidebar & theme switcher
│   │   ├── SentenceCanvas.svelte    # 140-char pitch textarea
│   │   ├── PresetTrigger.svelte     # Presets (All / Cult / Foreign) & Run
│   │   ├── ResultsStack.svelte      # 3-nightmare match cards
│   │   └── TopBar.svelte            # Header bar with auth controls
│   ├── lib/                 # Core utilities & services
│   │   ├── client/          # Discovery client & taste affinity scoring
│   │   ├── stores/          # Svelte 5 reactive stores (library, theme)
│   │   ├── auth.ts          # Session management & scrypt hashing
│   │   ├── db.ts            # Drizzle ORM client & automated migrations
│   │   ├── embeddings.ts    # On-device vector embeddings & cache
│   │   ├── schema.ts        # Database schema definitions
│   │   └── tmdb.ts          # Resilient TMDB API integration
│   ├── routes/              # SvelteKit pages & API endpoints
│   │   ├── admin/           # Dedicated Admin Panel
│   │   ├── archive/         # Dedicated User Archive
│   │   └── api/             # REST endpoints (auth, discover, user library)
│   └── workers/             # Dedicated embedding Web Worker (ONNX runtime)
├── svelte.config.js         # SvelteKit adapter configuration (Node / Vercel)
├── tailwind.config.mjs      # Tailwind configuration & typography
└── vite.config.ts           # Vite build pipeline with WebAssembly support
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### 2. Installation
```bash
git clone https://github.com/sidchigo/kuro.git
cd kuro
npm install
```

### 3. Environment Setup
Copy the sample environment file:
```bash
cp .env.example .env
```

Configure your `.env` variables:
```env
# TMDB API Key (Required for posters and movie metadata)
# Get a free key at: https://www.themoviedb.org/settings/api
TMDB_API_KEY=your_tmdb_api_key_here

# Optional: Google OAuth (For 1-click sign-in)
# If omitted, local username & password auth works out of the box with zero setup!
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAIL=your_email@gmail.com

# Optional: Database configuration (Defaults to local file at data/kuro.db)
# DATABASE_URL=libsql://your-database.turso.io
# DATABASE_AUTH_TOKEN=your_turso_token
```

### 4. Development
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

> [!TIP]
> You can immediately log in as the default administrator using:
> - **Username**: `admin`
> - **Password**: `kuroadmin123`

---

## Visual Database Studio

Kuro includes [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview) for exploring and managing database tables directly in your browser:

```bash
npm run db:studio
```
Opens Drizzle Studio at `https://local.drizzle.studio`.

---

## Production Build & Deployment

### Manual Build
```bash
npm run build
npm run start
```
Starts the standalone Node.js production server on `http://127.0.0.1:3000` (or the configured `PORT`).

### Automated CI/CD (GitHub Actions to VM)
Every push to the `main` branch triggers [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which:
1. Validates types and executes `npm run check`.
2. Compiles the production SvelteKit bundle.
3. Securely transfers and unpacks the release on your remote VM via SSH.
4. Restarts the `kuro.service` systemd unit and runs an automated health check.
5. Surfaces live deployment badges and environments directly on GitHub.

To configure for your own server, set these secrets in **GitHub &rarr; Settings &rarr; Secrets and variables &rarr; Actions**:
- `VM_SSH_KEY`: Your OpenSSH private key
- `VM_HOST`: Target server IPv4 or domain
- `VM_USER`: Server username (e.g. `ubuntu`)

---

## License

MIT © [Siddhesh Naik](https://github.com/sidchigo)
