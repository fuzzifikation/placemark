# Placemark — Microsoft Store Submission Guide

> **Version targeting:** v1.0  
> **Platform:** Windows 10 (1809) / Windows 11 — x64  
> **Category:** Photo & video › Photo viewer  
> **Age rating:** 3+ (IARC)

---

## Public Listing Copy

## App Identity

| Field               | Value                         |
| ------------------- | ----------------------------- |
| App name            | Placemark                     |
| Publisher           | _(Partner Center name — TBD)_ |
| Category            | Photo & video                 |
| Sub-category        | Photo viewer                  |
| Age rating          | 3+                            |
| Supported languages | English (US)                  |
| Architecture        | x64                           |
| Minimum OS          | Windows 10 version 1809       |
| Privacy policy URL  | _(TBD — see §6)_              |
| Support / contact   | _(TBD)_                       |

---

## Short Description (≤ 100 chars)

> Explore your photos by place and time. Private, local, and OneDrive-ready.

---

## Full Store Description

PLACEMARK - Find Your Photos by Place and Time

Remember the place, but not the folder? Placemark turns your photo library into a map you can explore.

Zoom to a city, scrub the timeline, and find the trip, walk, holiday, or family weekend you want in seconds. Browse photos from local folders and Microsoft OneDrive in one calm, map-first workspace.

Placemark is built for real libraries: a few hundred photos, a lifetime archive, or hundreds of thousands of shots across multiple devices and cameras.

Use Placemark to:

- Explore geotagged photos on an interactive map
- Narrow results by date, camera, and file format
- Save favorite places and time windows as reusable Placemarks
- Combine local folders and OneDrive in one view
- Export the current result set to CSV, GeoJSON, or GPX

Placemark stays private by design. There is no Placemark cloud, no account, no tracking, and no AI scanning your pictures. Your metadata stays on your PC.

Placemark Pro adds unlimited photos, safe file operations with preview and undo, lasso selection, and advanced settings. It is a one-time purchase, not a subscription. Existing Pro owners receive future Pro features at no extra cost, including GPS editing when it ships.

---

## Feature List (Store Bullet Points)

- Explore geotagged photos on an interactive world map
- Narrow your library by time with the built-in timeline
- Built for libraries from hundreds to hundreds of thousands of photos
- Browse local folders and Microsoft OneDrive together
- Save favorite trips and places as reusable Placemarks
- Filter by file type and camera to find exactly what you want
- Export visible or selected results to CSV, GeoJSON, and GPX
- Organize photos safely with preview and undo [Pro]
- Select photos directly on the map with the lasso tool [Pro]
- Lifetime Pro unlock with future Pro features included at no extra cost
- 100% local and private — no cloud, no account, no tracking

---

## Search Keywords

_(Partner Center allows up to 7 keywords per language)_

```
photo map
gps photos
photo organizer
exif viewer
onedrive photo viewer
local photo viewer
privacy photo app
```

---

## Commercial Model

| Tier         | Price                  | Limit        |
| ------------ | ---------------------- | ------------ |
| Free         | Free                   | 1,000 photos |
| Pro (add-on) | $12.99 (USD, one-time) | Unlimited    |

Microsoft Store commission: 15% (first $1M — standard small publisher rate).

**No subscription. No trial expiry. Free tier is never degraded or watermarked.**

**Pro is a lifetime unlock. Existing Pro owners get future Pro features at no extra cost, including GPS editing when it ships.**

Pro upgrade prompt appears only when a user reaches a Pro-gated boundary. The prompt lists benefits clearly and always includes "Not now" with no countdown or dark patterns.

---

## Submission Notes

## IARC Age Rating Questionnaire Answers

_(Pre-fill before submitting — answers determine the final rating)_

| Question                                                        | Answer                                                     |
| --------------------------------------------------------------- | ---------------------------------------------------------- |
| Does the app contain user-generated content shared with others? | No                                                         |
| Does the app allow communication between users?                 | No                                                         |
| Does the app contain violence?                                  | No                                                         |
| Does the app contain sexual content?                            | No                                                         |
| Does the app contain gambling or simulated gambling?            | No                                                         |
| Does the app collect personal data?                             | No (all data stored locally; no transmission to Placemark) |
| Does the app contain horror or fear themes?                     | No                                                         |
| Does the app reference alcohol, tobacco, or drugs?              | No                                                         |

**Expected rating: 3+ (Everyone)**

---

## Screenshots Required

Microsoft Store requires at least 1 screenshot; 4–6 at 1920×1080 or higher is recommended for Premium placement eligibility.

### Recommended scenes (capture in sequence on a real library)

| #   | Scene                | What to show                                                                       | Size      |
| --- | -------------------- | ---------------------------------------------------------------------------------- | --------- |
| 1   | **Map overview**     | Full library on a world or regional map with dense clusters                        | 1920×1080 |
| 2   | **Spider / zoom in** | A tight cluster fanned into a spider layout with photo pins visible                | 1920×1080 |
| 3   | **Timeline open**    | Timeline scrubber with histogram, active date range, map filtered                  | 1920×1080 |
| 4   | **Stats & Filters**  | Stats panel open with a format or camera filter active, chips visible below header | 1920×1080 |
| 5   | **Placemarks panel** | Placemarks panel open with at least one saved placemark                            | 1920×1080 |
| 6   | **Dark mode**        | Any of the above scenes in dark theme                                              | 1920×1080 |

**Format:** PNG (preferred) or JPEG, no watermarks, no dev-tools open.  
**Filename convention:** `screenshot-01-map-overview.png`, etc.  
**Storage location:** `build/store-screenshots/` (create folder, add to `.gitignore` if they are large).

---

## Store Assets Checklist

| Asset                                    | Required | Status                          | Notes                                             |
| ---------------------------------------- | -------- | ------------------------------- | ------------------------------------------------- |
| App icon — 300×300 PNG                   | ✅       | ✅ exists at `build/icons/png/` | Verify clean background for store tile            |
| App icon — 50×50 PNG                     | ✅       | ❓ check                        | Needed for search results listing                 |
| Screenshots (4–6 × 1920×1080)            | ✅       | ❌ not taken                    | See §Screenshots above                            |
| Short description (≤100 chars)           | ✅       | ✅ written above                |                                                   |
| Full description                         | ✅       | ✅ written above                |                                                   |
| Privacy policy URL (HTTPS)               | ✅       | ❌ not published                | GitHub Pages recommended — see §Privacy Policy    |
| Support URL or email                     | ✅       | ❌ TBD                          |                                                   |
| MSIX package                             | ✅       | ❌ not built                    | `electron-builder` + `appx` target                |
| Code signing certificate                 | ✅       | ❌ not obtained                 | EV cert (~$300/yr) or Partner Center trusted cert |
| Partner Center publisher account         | ✅       | ❓ unknown                      | $19 one-time registration fee                     |
| Freemium gating (photo cap + Pro unlock) | ✅       | ❌ not implemented              | Plan §8.2                                         |

---

## Privacy Policy

**Status:** ❌ Not published — required before Store submission.

**Recommended approach:** GitHub Pages static page (free, HTTPS, no infrastructure).

### Minimum required content

1. What data the app collects — answer: none transmitted to Placemark; all stored locally
2. How OneDrive tokens are stored — OS secure credential store, never transmitted
3. What external services are contacted — OpenStreetMap (map tiles), Nominatim (optional reverse geocoding, user-controlled, coordinates only)
4. Contact information
5. Date last updated

**Draft URL placeholder:** `https://<username>.github.io/placemark/privacy`

---

## MSIX Packaging Notes

_(Phase 8.3 — implement after freemium gating is done)_

### `electron-builder.yml` additions needed

```yaml
appx:
  applicationId: Placemark
  backgroundColor: '#1e293b'
  publisherDisplayName: '_(Publisher name)_'
  identityName: '_(Partner Center identity name)_'
  publisher: 'CN=_(Partner Center publisher CN)_'
  languages:
    - en-US
```

### Signing options

| Option                                                 | Cost     | Effort                           |
| ------------------------------------------------------ | -------- | -------------------------------- |
| EV (Extended Validation) cert from DigiCert / Sectigo  | ~$300/yr | Medium — hardware token required |
| Microsoft Trusted Signing (Azure)                      | ~$10/mo  | Low — cloud-based, no token      |
| Partner Center Dev submission (unsigned, Store-signed) | Free     | Lowest — Store signs the package |

**Recommended:** Partner Center / Store-signing for initial submission (zero cost, no cert required). Upgrade to Microsoft Trusted Signing before enabling sideload distribution.

---

## Submission Sequence

1. ☐ Publish privacy policy page (GitHub Pages)
2. ☐ Implement freemium gating (photo cap + Pro add-on, Plan §8.2)
3. ☐ Take screenshots with a real loaded library (see §Screenshots)
4. ☐ Verify all store assets (see §Assets Checklist)
5. ☐ Configure `electron-builder` for MSIX / appx target
6. ☐ Register Partner Center publisher account (if not done)
7. ☐ Build and test MSIX package locally
8. ☐ Submit to Partner Center — fill in listing using the text in this file
9. ☐ Respond to Store certification feedback
10. ☐ Publish
