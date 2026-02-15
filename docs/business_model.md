# Placemark — Microsoft Store Business Model

> **Status:** Launch-ready proposal (post-beta)
> **Last updated:** 2026-02-13
> **Current version:** 0.6.1 (alpha/beta, portable `.exe`)

---

## 1. Product Summary

**Placemark** is a privacy-first, local-first photo organizer that visualizes your photo collection on an interactive map by reading EXIF GPS and timestamp data. No cloud uploads, no accounts, no telemetry. Your photos stay on your device.

Placemark is designed for photographers, travelers, archivists, and privacy-conscious users who want to explore their photo history spatially — without subscriptions or cloud lock-in.

**Tagline:**  
_See your life on a map. Privately._

**Category:** Photo & video › Photo viewer  
**Platform:** Windows 10/11 (x64)

---

## 2. Design Philosophy

Placemark is intentionally calm.

- No feeds
- No notifications
- No algorithms
- No AI scanning your photos

It is a tool for reflection, not consumption.  
A personal cartography of memory — owned entirely by the user.

---

## 3. Monetization Model: Freemium (Free + Pro Unlock)

One-time purchase. No subscriptions.  
This aligns with Placemark’s privacy-first ethos and avoids recurring data relationships.

---

### 3.1 Free Tier

The free version is fully functional for exploration and evaluation. Users can:

| Feature                                       | Included |
| --------------------------------------------- | -------- |
| Scan local and network folders                | ✅       |
| Interactive map with clustered markers        | ✅       |
| Hover thumbnails and photo detail modal       | ✅       |
| Open photos in system viewer / show in folder | ✅       |
| Heatmap mode                                  | ✅       |
| Timeline histogram and playback               | ✅       |
| Light and dark mode                           | ✅       |
| Basic map settings                            | ✅       |
| Portable mode (no installation)               | ✅       |
| **Photo limit: 1,000 photos**                 | ✅       |

**Rationale:**  
1,000 photos are enough to experience the full map-based workflow with multiple trips or a modest collection. Users naturally reach the limit when they want to explore their entire library — at which point Pro becomes an obvious upgrade.

The free tier is never degraded, watermarked, or slowed.

---

### 3.2 Pro Tier (One-Time Purchase)

**Price:** **$7.99 USD** (launch price — may increase after establishing reviews)

| Feature                                                  | Pro |
| -------------------------------------------------------- | --- |
| **Unlimited photos** — no database cap                   | ✅  |
| **File operations** — copy & move with dry-run preview   | ✅  |
| **Atomic safety** — rollback on failure                  | ✅  |
| **Undo system** — full undo for file operations          | ✅  |
| **Lasso selection** — freeform selection on the map      | ✅  |
| **GPS editing** — drag photos to change location         | ✅  |
| **Address geotagging** — set location by address/place   | ✅  |
| **Tag unlocated photos** — place photos without GPS data | ✅  |
| **Advanced settings** — clustering, cache, visual tuning | ✅  |

**Rationale:**

- File operations and undo are high-trust, high-value features.
- Lasso selection is unique to Placemark and strongly differentiating.
- GPS editing is a power-user feature with clear value — correcting, adding, or moving photo locations directly on the map. Few tools offer this, and none with Placemark's map-first UX.
- One-time pricing reinforces ownership and long-term trust.

No features are sold on promises. Pro unlocks what exists today.

---

### 3.3 Free → Pro Upgrade Flow

1. User reaches a Pro boundary (photo cap, lasso tool, file operations).
2. A respectful modal appears:
   - Clear list of Pro benefits
   - "Unlock Pro — $7.99 (one-time)" button
   - “Not now” option — no pressure, no countdowns
3. Purchase uses Microsoft Store durable add-on licensing.
4. Pro unlock activates instantly and persists across reinstalls.

**UX principle:**  
Never punish free users. Pro is an expansion, not a ransom.

### 3.4 Refund Policy

Microsoft Store allows refunds within 14 days. On refund:

- Pro features are disabled; the app reverts to the free tier.
- No user data is deleted — photos, database, and thumbnails remain intact.
- GPS edits made during the Pro period are preserved in the photo files (EXIF writes are permanent).
- The app checks the Store license periodically and adjusts the feature set accordingly.

---

## 4. Microsoft Store Listing

### 4.1 App Identity

| Field               | Value                   |
| ------------------- | ----------------------- |
| App name            | Placemark               |
| Publisher           | _(Partner Center name)_ |
| Category            | Photo & video           |
| Sub-category        | Photo viewer            |
| Age rating          | 3+                      |
| Supported languages | English (US)            |
| Architecture        | x64                     |
| Minimum OS          | Windows 10 (1809)       |

---

### 4.2 Store Description

#### Short Description (≤100 chars)

> Explore your photo collection on a map. No cloud, no accounts, complete privacy.

#### Full Description

PLACEMARK — See Your Life on a Map

Your photos already know where they were taken. Placemark puts them on
a map — no cloud, no account, no uploads. Ever.

🗺️ MAP-FIRST
Full-screen interactive map with clustered markers, hover previews,
and heatmap mode. Zoom into a city and see every photo you took there.

⏱️ TIMELINE
Scrub through years of photos with an interactive date histogram.
Animated playback lets you watch your travels unfold.

📁 ORGANIZE (Pro)
Draw on the map to select photos. Copy or move them with a dry-run
preview, atomic rollback, and full undo.

� GPS EDITING (Pro)
Drag photos to correct their location. Set a place by address. Tag
photos that have no GPS data at all.

📷 SUPPORTED FORMATS
JPEG, PNG, HEIC/HEIF, TIFF, WebP — plus 12 professional RAW formats:
Canon (CR2, CR3), Nikon (NEF, NRW), Sony (ARW), Adobe DNG,
Fujifilm (RAF), Olympus (ORF), Panasonic (RW2), Pentax (PEF),
Samsung (SRW), and Leica (RWL).

🔒 PRIVATE BY DESIGN
No cloud. No telemetry. No AI. All data stays on your device.

FREE — full map exploration and timeline for up to 1,000 photos.
PRO — $7.99 one-time. Unlimited photos, file operations, lasso
selection, GPS editing, and advanced settings.

No subscription. Pay once. Own it forever.

---

## 5. Revenue Expectations (Conservative)

| Scenario          | Monthly Downloads | Conversion | Pro Sales | Monthly Revenue (after 15% Store cut) |
| ----------------- | ----------------- | ---------- | --------- | ------------------------------------- |
| Quiet launch      | 100               | 1%         | 1         | $6.79                                 |
| Moderate traction | 500               | 1%         | 5         | $33.96                                |
| Good traction     | 2,000             | 1%         | 20        | $135.83                               |
| Featured / viral  | 10,000            | 1%         | 100       | $679.15                               |

Microsoft Store commission: **15%**

At 1% conversion and $7.99, Placemark needs ~1,500 monthly downloads to cover a $100/month hosting or tooling cost. Revenue is not the primary goal — sustainability is. The app must be good enough that conversion rises naturally over time.

---

## 6. Competitive Positioning

### Core Differentiators

1. **Local-first, no cloud** — photos never leave the device
2. **Map-first UX** — spatial exploration is the primary interface
3. **One-time purchase** — no subscription fatigue
4. **Auditable code** — source is public for transparency and trust, but not advertised in the Store listing
5. **Portable mode** — rare for Store apps

Placemark is not a social app, not a gallery clone, and not a cloud service.

---

## 7. Discovery & Marketing

Placemark has no marketing budget. Growth must be organic and low-effort.

### Store SEO

Target keywords: `photo map`, `photo organizer`, `EXIF viewer`, `geotagged photos`,
`photo location`, `privacy photo`, `local photo organizer`, `photo GPS`,
`photo timeline`, `photo viewer map`, `no cloud photo`, `RAW photo viewer`,
`CR2 viewer`, `NEF viewer`, `ARW viewer`, `DNG viewer`, `RAW EXIF`.

### Community Posts (Free)

| Where                                       | Why                                        |
| ------------------------------------------- | ------------------------------------------ |
| r/photography                               | Core audience — travelers, hobbyists       |
| r/privacytoolsIO, r/privacy                 | Privacy-first positioning is a strong hook |
| r/datahoarder                               | Local storage, no cloud, portable mode     |
| r/selfhosted                                | NAS / network share use case (future)      |
| Hacker News (Show HN)                       | Developer + privacy audience overlap       |
| Photography forums (DPReview, Fred Miranda) | Niche but highly engaged                   |

**Rule:** One genuine post per community. No spam, no astroturfing. Show the app, explain the philosophy, accept feedback.

### Landing Page

A single-page site on GitHub Pages with:

- Hero screenshot (map with clustered markers)
- 3-line value proposition
- "Get it on Microsoft Store" badge
- Link to GitHub repo for the technically curious

### Demo Video

One 60–90 second screen recording showing:

1. Scan a folder → photos appear on map
2. Zoom and hover → thumbnail previews
3. Timeline scrubbing
4. Lasso → file operation → undo

Upload to YouTube. Embed on landing page. Link in Store listing.

### What NOT to Do

- No paid ads until organic traction proves product-market fit
- No influencer outreach — the app should speak for itself
- No social media accounts to maintain — too much overhead for one developer

---

## 8. Localization

### Store Listing (Pre-launch or Shortly After)

Translate the Store description (~500 words) into 3–4 languages to expand discoverability:
German, French, Spanish, Japanese. This does not require any app changes — Partner Center
supports multiple localized listings per app.

### App UI (Future, Optional)

Full UI localization (buttons, labels, modals, toasts) is a separate effort. It requires:

- An i18n library (e.g., `react-i18next`)
- Extracting all hardcoded strings into translation files
- Ongoing maintenance for each supported language

This is not a launch blocker. The app ships in English. Users in non-English markets
commonly expect desktop tools to be English-only. App localization can be pursued later
if Store analytics show demand from specific regions.

---

## 9. Platform Strategy

### Windows — Microsoft Store (Launch Platform)

- One-time $19 registration fee.
- Full freemium model with Pro add-on via Store licensing API.
- Primary distribution channel.

### macOS — Deferred

The Mac App Store requires a $99/year Apple Developer Program membership. At projected
revenue levels, this fee would consume all Mac-related income. Decision:

- **No Mac App Store at launch.**
- Offer a **free unsigned `.dmg`** via GitHub Releases for Mac users who find the project organically.
- Revisit the Mac App Store if demand is validated (GitHub issues, community requests, or Windows Store traction exceeding 1,000 downloads/month).

The Electron build already supports macOS (`dmg` target in electron-builder). No architectural
work is needed — this is purely a business decision.

### Linux — Not Planned

Low demand for photo organization tools on Linux. AppImage target exists in electron-builder
but no Store distribution is planned.

---

## 10. Launch Strategy

1. Finalize beta features and performance
2. Implement freemium gating and Store licensing
3. Prepare Store assets and privacy policy
4. Create landing page and demo video
5. Package as MSIX and test sandbox behavior
6. Submit to Microsoft Store
7. Post to 2–3 communities on launch day
8. Iterate based on real user feedback and Store reviews

---

_This document defines the business and ethical boundaries of Placemark.
It prioritizes trust, clarity, and long-term sustainability over growth at all costs._
