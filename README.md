# InScene

> **The ad is in the scene.**
>
> AI-rendered, per-viewer, brand-safe, shoppable in-scene product placement. The director stays in control.

---

## The pitch

Pre-roll and mid-roll ads interrupt the story. Classic product placement does not interrupt it, but it is
baked in once, for everyone, forever: the same can of soda in every country, long after the campaign ended.

InScene puts the ad *inside* the shot. The director marks the surfaces in their film where a brand may appear (a
billboard behind the actors, a shop sign, a screen) and sets the rules. For each viewer, InScene picks a campaign
that fits their city, language and the scene's mood. Gemini Omni then repaints that surface in the real footage,
keeping camera motion, lighting, grain and actors as they were. A viewer in Tokyo sees a Japanese cold-brew poster on the
billboard and a viewer in Visakhapatnam sees a Telugu Diwali coffee ad. Kids see a library PSA, and ad-free
subscribers see neutral artwork. The story, timing and actors stay the same for everyone.

Every cut follows the director's rules. A brand only appears where the director allowed one, never in a category
the director blocked, and never larger than the director's prominence cap. If the director wants, nothing plays
until they approve it.

---

## Features

| # | Feature | Where | How it works |
|---|---------|-------|--------------|
| 1 | **Slot Scout** | Director Studio | Gemini watches the film and proposes ad surfaces (billboards, screens, storefronts, vehicles, posters) with time range, placement score 0–100 and a suggested prominence cap. One click turns a candidate into an ad slot. Without Gemini it offers evenly spaced windows flagged *needs review*. (`src/lib/ads/slot-scout.ts`) |
| 2 | **Brand Brief → placement** | Brand Studio (`/brands`) | Advertisers upload a logo/product image, colors, tagline, CTA, targeting, flight dates and contexts to avoid. `buildAdInstruction` turns the winning campaign into constraints for the Gemini Omni edit: translated headline in the viewer's script, brand name kept verbatim, matching perspective and lighting. (`src/lib/ads/ad-prompt.ts`) |
| 3 | **Scene-aware brand safety** | Director Studio | Gemini reviews each ad slot's clip for mood, themes and sensitive contexts (violence, accidents, grief, children…). A campaign is rejected if the director blocked its category, if the scene contains something the brand avoids, or if the category would be tone-deaf there, for example travel next to a crash. Without Gemini, the safety check reads the director's own notes. (`src/lib/ads/brand-safety.ts`) |
| 4 | **Viewer–brand matching + "Why this ad?"** | Player | A pure, deterministic matcher scores eligible campaigns on city (+30), country (+20) and language (+15) targeting, adds bid weight, and records plain-language reasons and the reason each rejected campaign lost. The player shows these reasons in "Why this ad?". (`src/lib/ads/matching.ts`) |
| 5 | **Shoppable pause** | Player | When the viewer pauses during an ad slot, a card shows the brand, product, tagline and CTA link. Pause views and clicks are recorded as ad events. |
| 6 | **Exposure score + prominence cap** | Director Studio, dashboard | After a cut renders, Gemini measures frame share, visible seconds and legibility. The score is 0–100: 40% size (saturating at 25% of the frame), 35% time on screen and 25% legibility. It also flags whether the ad stayed within the director's cap. Without Gemini the score is a labelled estimate. (`src/lib/ads/exposure.ts`) |
| 7 | **Advertiser dashboard** | `/brands/dashboard` | Impressions, pause views, clicks, audio plays, click rate, average exposure, and breakdowns by city and slot, aggregated from recorded ad events. (`src/lib/ads/analytics.ts`) |
| 8 | **Ad-free / kids / public-service mode** | Viewer profiles | `adPreference: "ad_free"` → the surface shows neutral artwork with no text or logos. `"kids"` → only public-service campaigns are eligible. Public-service campaigns are also the low-priority fallback for everyone else. |
| 9 | **Seasonal re-versioning** | Player, `?date=` | Campaigns have flight dates. The cut that plays is always the one rendered for the campaign that should run *today*, so when a campaign ends the old cut stops playing and a re-render is queued. `?date=YYYY-MM-DD` simulates another day. |
| 10 | **Diegetic audio ads** | Player, Director Studio | Gemini TTS reads the brand's line, translated into the viewer's language, as a short shop-radio announcement in the background of the scene. It is saved as a WAV per campaign × locale. (`src/lib/ads/audio-ad.ts`) |

### Director controls (Director Studio → a film)

- **Slot Scout panel**: scout with Gemini, preview each candidate in the player, accept it as an ad slot. Candidates also appear as amber dashed markers on the timeline.
- **For each ad slot**:
  - **Brand safety**: the cached scene profile, plus a button to re-analyze it with Gemini.
  - **Ad policy**: blocked categories, a prominence cap (5–80% of the frame), and "require my approval before a cut plays".
  - **Who sees what**: which brand each demo profile would get right now, and why.
- **Variants**: each rendered cut shows its brand, exposure score, frame share against the cap and its audio ad, with Approve / Reject.

---

## Architecture

```
Director Studio ──► seed.ts (films, slots, ad policy)         Brand Studio ──► campaigns (JSON store)
        │                                                              │
        ▼                                                              ▼
  Slot Scout ── Gemini (video understanding) ──► scout cache    decideForSlot(slot, viewer, date)
  Brand safety ─ Gemini (video understanding) ─► scene cache ──►  = targeting + flight + brand safety + policy
                                                                       │ adKey (campaign id | "neutral")
                                                                       ▼
Player ──► /api/generate ──► job queue (in memory) ──► Gemini 3.5 Flash writes the edit prompt
                                                    ──► Gemini Omni video-to-video edit of the fallback clip
                                                    ──► Gemini exposure measurement on the rendered cut
                                                    ──► Gemini TTS audio ad
       ◄── /api/cuts/prepare (playable cuts for this viewer + date) ◄── ffmpeg fragments for seamless MSE playback
```

- **Gemini Omni** (`gemini-omni-flash-preview`) performs the video-to-video edit of each slot's fallback clip.
- **Gemini analysis** (`INSCENE_ANALYSIS_MODEL`, default `gemini-3.5-flash`) handles Slot Scout, scene brand safety, exposure measurement and prompt writing for Omni. Videos go through the Gemini File API.
- **Gemini TTS** (`INSCENE_TTS_MODEL`, default `gemini-2.5-flash-preview-tts`) generates the diegetic audio ads.
- **Next.js 16** (App Router, standalone output) runs both the UI and the API routes. ffmpeg/ffprobe cut fallback segments and playback fragments.
- **Storage**: a small JSON collection store under `DATA_DIR` holds campaigns, ad events and the scout/safety caches. Generated media lives under `public/media` and is served at runtime through `/api/media`. The store is written to be swapped for **Firestore** (and media for Cloud Storage) later.
- **Cloud Run** hosts the container (see [Deploy](#deploy-to-google-cloud-run)).

Every Gemini step has a deterministic fallback, so the app runs end to end with no API key. It then uses heuristics,
estimates and the canonical clips, and labels each result "heuristic" or "estimate" in the UI.

### How ad decisions are cached per campaign

Rendering a cut is the expensive step, so InScene keys renders by **what is on the billboard**, not just by who is watching:

1. `decideForSlot(slot, profile, date)` is pure. The same inputs always give the same `adKey`: the campaign id, or `"neutral"` for neutral artwork.
2. Generation jobs are keyed `job-<movie>-<slot>-<profile>-<adKey>`. A cut is reused whenever the decision for that viewer still points at the same campaign.
3. When a job is processed, the decision is checked again. If campaigns changed in the meantime, the job is cancelled rather than rendering a brand that is no longer the pick.
4. `/api/cuts/prepare` only plays a cut whose `adKey` matches today's decision, and only approved cuts when the slot requires approval. Any other cut falls back to the director's canonical clip, so a stale or unapproved ad never plays.
5. Scene safety profiles and scout results are cached per slot or film in the JSON store. Audio ads are cached per campaign × locale.

---

## Demo script

Seed profiles: **Sampath** (Visakhapatnam, Telugu), **Aiko** (Tokyo, Japanese), **Maya** (San Francisco, English),
**Srikant** (Bengaluru, Kannada), **Camille** (Paris, French), **Léo** (Paris, kids profile) and **Jordan** (San Francisco, ad-free).
The six fictional seed campaigns are in `src/lib/ads/seed-campaigns.ts`.

1. **Director Studio** (`/director` → a film). Run **Slot Scout**, click a candidate to preview it, and accept it.
   After the reload, click **Export Fallback Segments** to cut the new slot's clip.
2. Select an ad slot. Click **Analyze scene with Gemini**, block a category, drag the prominence cap, and turn on approval.
   **Who sees what** now shows the pick for each profile:
   - Visakhapatnam / Bengaluru → **Monsoon Brew** (India, Diwali flight Oct 1 – Nov 15)
   - Tokyo → **Sakura Cold Brew** (Japan, ja-JP)
   - San Francisco (Maya) → **BayBytes** (San Francisco)
   - Paris (Camille) → **SkyHop Airlines** (runs everywhere) until December
   - Léo (kids) → **Read Together** public-service poster
   - Jordan (ad-free) → neutral artwork
3. **Brand Studio** (`/brands`): create a campaign from a brand brief and watch the picks change.
4. **Player** (`/watch/<movieId>?profile=vizag-te`, then `tokyo-ja`, `sf-en`). The billboard carries a different
   brand in each viewer's language. Pause during the slot for the shoppable card, and open "Why this ad?" for the reasons.
5. **Kids and ad-free**: `?profile=paris-fr-kids` and `?profile=sf-en-adfree`.
6. **Seasonal re-versioning**: add `&date=2026-12-10`. The Diwali flight has ended, so Visakhapatnam swaps from Monsoon
   Brew to the next eligible campaign. The December **Winter Lights Festival** campaign (France, Dec 1–31) becomes
   eligible, so Camille's Paris billboard (`?profile=paris-fr&date=2026-12-10`) switches from SkyHop to Winter Lights.
   Léo, the Paris kids profile, still gets the PSA.
7. **Compare** (`/compare`) plays three viewers side by side. **Advertiser dashboard** (`/brands/dashboard`) shows the events from the session.

---

## Local setup

Requirements: Node 20+, `ffmpeg` and `ffprobe` on `PATH`.

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (optional: the app falls back to heuristics without it)
npm run dev                  # http://localhost:3000
```

Environment variables (see `.env.example`): `GEMINI_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_PROJECT`,
`GOOGLE_CLOUD_LOCATION`, `INSCENE_ANALYSIS_MODEL`, `INSCENE_TTS_MODEL`, `DATA_DIR`.

## Tests

```bash
npm test                # vitest: targeting, flights, brand safety, ad selection, exposure, scout parsing, analytics, audio, ad prompt
npm run check:playback  # playback manifest checks
npx tsc --noEmit -p .
npm run lint
```

## Deploy to Google Cloud Run

The image is a multi-stage `Dockerfile`: Next.js standalone server on `node:20-slim`, with ffmpeg, listening on port 8080.

```bash
# one time: store the Gemini key in Secret Manager
printf '%s' "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --project "$PROJECT_ID"

# build with Cloud Build → Artifact Registry → Cloud Run
PROJECT_ID=my-project REGION=us-central1 SERVICE=inscene ./scripts/deploy-cloud-run.sh
```

The script enables the required APIs and creates the Artifact Registry repo. It grants the runtime service account access
to the secret, then deploys with `--memory 2Gi --cpu 2 --timeout 900 --no-cpu-throttling --min-instances 1 --max-instances 1`.
CPU stays on because Gemini renders keep running after the HTTP response returns. There is exactly one instance
because the job queue is in memory and the store is local JSON.

## Limitations

- **Single instance.** The generation queue is in memory and the JSON store and generated media are on the container's
  local disk, so they reset when the instance is replaced. Moving them to Firestore and Cloud Storage would make it scale out.
- **Authoring is dev-time.** Films, slots and ad policies are written into `src/lib/data/seed.ts`, which is compiled into the
  build. Adding segments, accepting scout candidates and saving ad policies therefore works under `npm run dev`, not in the
  deployed container. Campaigns, events and caches live in the JSON store and do work in production.
- Video understanding, Omni edits and prompt writing call the Gemini Developer API and need `GEMINI_API_KEY`. Today the Vertex AI
  mode (`GOOGLE_GENAI_USE_VERTEXAI`) is only used for TTS when no API key is set.
- Seed brands are fictional, and the demo profiles are fixed rather than real viewer accounts.

## Pitch deck

Open [`docs/pitch-deck.html`](docs/pitch-deck.html) in a browser. Arrow keys or clicks move between slides, `N` shows speaker notes, `F` goes full screen, and printing saves it as a PDF.
