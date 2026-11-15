# kuro.

> **One film. One sentence. Zero algorithm slop.**
> A deterministic horror movie discovery engine with a neo-brutalist Japanese editorial grid aesthetic (inspired by `finders-tokyo.co.jp`).

---

## Architecture

- **Framework**: Astro 5 (Hybrid SSR via `@astrojs/vercel`)
- **UI & Islands**: React 19, Tailwind CSS (Razor-sharp borders, zero rounded corners, zero dropshadows)
- **Typography**: Instrument Serif, IBM Plex Mono, Inter
- **Discovery Pipeline**:
  1. **Intent Decomposition**: Deconstructs seed movie and 140-character pitch into core horror mechanics, TMDB keyword terms, and regional constraints.
  2. **Deterministic 3-Tier TMDB Waterfall**: Queries TMDB seed neighbors, keyword search, and language pools with rating and vote count floors (guaranteeing 5–20 verified candidates without crashes).
  3. **Grounded Cross-Encoder Reranking**: Reranks candidates against the user's sentence to return the top 1–3 matches with 2-sentence grounded pitches and honest caveats (`CATCH`).

---

## Features

- **Dynamic Poster Stage**: High-res TMDB poster framed with director and release year metadata.
- **The Sentence Canvas**: Full-bleed Vermilion `#E62E25` 140-character input with starter prompts.
- **Presets**: `ALL` | `CULT GEMS` | `FOREIGN`
- **Plan to Watch (Watchlist)**: Save recommendations to watchlist, dynamically sorted by taste affinity against rated seen films.
- **Recent Seeds**: Persists last 5 searched seeds along with their active sentence for 1-click restoration.
- **Already Seen Archive**: Automatically records searched/seeded films with 5-star ratings to blacklist them from future discovery.
- **Multi-User RBAC**: Self-contained SQLite persistence (`data/kuro.db`) with HttpOnly cookie sessions, 2-tier permissions (`Admin` and `Member`), personal synchronized libraries, and an administrative user & telemetry dashboard.
  - *Default Admin*: `admin` / `kuroadmin123`

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env` and add your API keys:
```bash
TMDB_API_KEY=your_tmdb_api_key
GEMINI_API_KEY=your_gemini_api_key
```
*(Optional alternative LLM keys: `OPENROUTER_API_KEY` or `GROQ_API_KEY`)*

### 3. Development Server
```bash
npm run dev
```

### 4. Build
```bash
npm run build
```
