# OneDrive Integration Plan

**Status:** Steps 0–3.5 complete — OneDrive import, abort, and UI wired. Proceed to Step 4: show OneDrive photos on the map  
**Last Updated:** March 29, 2026

---

## Overview

Integrate Microsoft OneDrive as a cloud photo source, allowing users to scan and visualize OneDrive photos alongside local folders. OneDrive operates as a pass-through data source — metadata flows directly from user's Microsoft account to Placemark's local database. No Placemark infrastructure involved.

### Scope

- **Phase 1 (v0.x):** Read-only OneDrive import; visualization on map, timeline, stats
- **Future (Phase 2+):** Copy/move operations, drag-and-drop, cloud sync (TBD)

---

## Privacy Model

### Zero Placemark Infrastructure

- Placemark does **not** operate cloud servers or perform any backend processing
- All metadata stays on user's device (SQLite)
- Cloud sources (OneDrive) are **pass-through only**: user ↔ Microsoft Graph API, Placemark is a client
- OAuth credentials are stored locally only, never transmitted to or cached by Placemark
- Sensitive OAuth material must live in **OS-backed secure credential storage**, not plain settings files or SQLite

### Data Flow

```
User's Microsoft Account (OneDrive)
            ↓
      Microsoft Graph API
            ↓
   Placemark (Client)
            ↓
   Local SQLite DB
            ↓
   Map / Timeline / Stats
```

---

## Architecture

### Authentication

**OAuth 2.0 Flow:**

1. User clicks "Connect OneDrive" button
2. Placemark launches the **system browser** to the Microsoft sign-in page
3. User logs in with Microsoft account and grants consent
4. Microsoft redirects back to Placemark via a desktop-safe callback
5. Placemark exchanges the authorization code using **OAuth 2.0 Authorization Code + PKCE**
6. Access and refresh tokens are stored in **OS-backed secure credential storage**
7. Tokens are refreshed when needed and deleted immediately on disconnect

**Security Requirements:**

- Use **Authorization Code with PKCE**; do not use implicit flow
- Use the **system browser**, not an embedded webview, for Microsoft sign-in
- Store only non-sensitive OneDrive metadata in app settings (account email, last import time, selected folder)
- Store access and refresh tokens in OS credential storage only
- Treat refresh tokens as highly sensitive credentials
- Request the minimum scopes needed for read-only import

**Credential Lifecycle Requirements:**

- **Create:** Tokens are created only after explicit user consent through the OAuth flow
- **Persist:** Tokens survive app restarts so the user does not need to sign in every launch
- **Use:** Access tokens are loaded only when a OneDrive action is requested (connect, browse, scan, thumbnail fetch)
- **Refresh:** Expired access tokens are refreshed on demand using the refresh token; refresh should be invisible to the user when successful
- **Disconnect:** Clicking **Disconnect** deletes local credentials immediately from OS secure storage and clears local connection metadata
- **Revoked Access:** If Microsoft rejects the token/refresh token, Placemark treats the connection as expired, clears the local credential, and asks the user to reconnect
- **Uninstall:** Do not assume OS-stored credentials are removed automatically on uninstall; if uninstall cleanup is available, remove them, otherwise document that the user may need to revoke/remove credentials manually
- **No Silent Reconnect:** Once credentials are deleted or revoked, Placemark must require a fresh consent flow

**App Registration:**

- Register "Placemark" as a multi-tenant app in Azure
- Store Client ID in code (public)
- Redirect URI: `http://localhost:3001/oauth/callback` (fixed loopback callback)
- Permissions: start from least-privileged delegated scopes such as `Files.Read` and `offline_access`; add broader scopes only if testing proves they are necessary
- The callback approach must be validated before implementation is considered locked

### Microsoft Graph API

**Endpoints Used:**

1. **List photos in folder:**

   ```
   GET /me/drive/items/{itemId}/children
   ?$select=id,name,size,file,photo,location,createdDateTime,lastModifiedDateTime,parentReference,webUrl
   &$top=200
   ```

   Client-side filter the returned `driveItem` collection to image files using the `file.mimeType` facet. Do not rely on server-side `$filter` here.

2. **Get file metadata + EXIF:**

   ```
   GET /me/drive/items/{itemId}
   ?$select=id,name,size,file,photo,location,createdDateTime,lastModifiedDateTime,parentReference,webUrl
   ```

   - `photo.cameraMake`, `photo.cameraModel` (if available)
   - `photo.takenDateTime` (EXIF capture time)
   - `location.latitude`, `location.longitude` (if location metadata is available)

3. **Get thumbnail URL:**

   ```
   GET /me/drive/items/{itemId}/thumbnails/0/small
   (Returns thumbnail metadata including a URL)
   ```

   Or retrieve redirecting content when needed:

   ```
   GET /me/drive/items/{itemId}/thumbnails/0/small/content
   ```

**Notes:**

- Do not assume GPS comes from the `photo` facet; validate the `location` facet on real files during Step 0
- OneDrive for Business may return less photo metadata than OneDrive Personal; validate exactly which fields are available before implementation is locked
- Thumbnail URLs should be treated as short-lived fetch results, not durable metadata
- Paging: Use `$top=200` with `$skipToken` to handle large folders

---

## Database Schema

### New Columns on `photos` Table

```sql
ALTER TABLE photos ADD COLUMN source_type TEXT DEFAULT 'local';
-- Values: 'local', 'onedrive'

ALTER TABLE photos ADD COLUMN cloud_item_id TEXT;
-- OneDrive item ID (drive item unique identifier)
-- NULL for local photos

ALTER TABLE photos ADD COLUMN cloud_folder_path TEXT;
-- OneDrive folder path where photo is stored (informational)
-- NULL for local photos

ALTER TABLE photos ADD COLUMN cloud_sha256 TEXT;
-- sha256Hash from OneDrive file.hashes — used as primary dedupe key
-- NULL for local photos (local dedupe uses file path)
```

Do not persist transient thumbnail URLs as durable database fields. Use the stable `cloud_item_id` and fetch thumbnail metadata on demand, with an in-memory or short-lived cache if needed.

### Thumbnail Cache Compatibility (Step 0 Confirmed)

- Graph returns three thumbnail sizes: `small` (96px), `medium` (176px), `large` (800px)
- Existing local thumbnail cache schema stores one BLOB per `photo_id` (single canonical thumbnail), which is size-agnostic but not multi-variant
- Compatibility decision: cache one canonical OneDrive thumbnail per photo in persistent cache using `medium` (176px)
- Request `small` (96px) and `large` (800px) on demand and keep those URLs/results session-scoped only
- No thumbnail database schema migration is required for Step 0.5/Step 1

### Deduplication Strategy

**Rule:** Photos are considered identical if `sha256Hash` matches an existing record. Fall back to `filename + filesize` if hash is unavailable.

**Step 0 confirmed:** `file.hashes.sha256Hash`, `sha1Hash`, and `quickXorHash` are all returned by Graph API on real files. `sha256Hash` is the strongest signal and should be the primary dedupe key.

**Implementation:**

1. **Before inserting** each OneDrive photo, check by hash first:
   ```sql
   SELECT id FROM photos WHERE cloud_sha256 = ?
   ```
2. **If hash missing**, fall back to:
   ```sql
   SELECT id FROM photos WHERE filename = ? AND fileSize = ?
   ```
3. **If exists:** Skip insertion, log as duplicate
4. **If not exists:** Insert new photo record with `source_type = 'onedrive'`

**Result tracking:**

- Log import session: `{ scanned: 500, imported: 412, duplicates: 78 }`
- Display to user: "Scanned 500 photos, imported 412 (78 duplicates skipped)"

---

## Data Extraction

### Per-Photo Metadata

| Field                       | Source                                              | Mandatory | Notes                                                                                                 |
| --------------------------- | --------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `filename`                  | OneDrive `name`                                     | ✅        | e.g., IMG_1234.jpg                                                                                    |
| `fileSize`                  | OneDrive `size`                                     | ✅        | In bytes                                                                                              |
| `mimeType`                  | OneDrive `file.mimeType`                            | ✅        | image/jpeg, image/heic, video/mp4, etc. — filter client-side to images only                           |
| `timestamp`                 | OneDrive `photo.takenDateTime` or `createdDateTime` | ✅        | ISO 8601, fallback to created. **Confirmed present on all items including video.**                    |
| `latitude`, `longitude`     | OneDrive `location.latitude`, `location.longitude`  | ❌        | **Confirmed working in Step 0.** Present on photos and videos when GPS was recorded.                  |
| `cameraMake`, `cameraModel` | OneDrive `photo.cameraMake`, `photo.cameraModel`    | ❌        | **Confirmed present on JPEGs.** Not present on videos (only `takenDateTime` returned for video).      |
| `cloud_item_id`             | OneDrive `id`                                       | ✅        | Unique identifier                                                                                     |
| `cloud_folder_path`         | Derived from folder hierarchy                       | ✅        | e.g., /Bilder/Eigene Aufnahmen                                                                        |
| `source_type`               | Hardcoded                                           | ✅        | 'onedrive'                                                                                            |
| `cloud_sha256`              | OneDrive `file.hashes.sha256Hash`                   | ❌        | **Confirmed present in Step 0.** Use as primary dedupe key. sha1Hash and quickXorHash also available. |

Thumbnail URLs are fetched on demand and cached temporarily; they are not part of the durable metadata contract.

---

## UI / UX

### Adding OneDrive Source

**Flow:**

1. User clicks **"+" (Add Source)** button in top-left sidebar
2. Dialog appears:

   ```
   [ Add Photo Source ]

   ◉ Local Folder
   ○ OneDrive

   [Cancel]  [Next]
   ```

3. If **Local Folder** selected → existing flow (folder picker)

4. If **OneDrive** selected:
   - Check if user has existing OneDrive token
   - If no token → **OAuth login popup**
   - If token exists → **Folder picker** (OneDrive directory tree)
   - User selects folder (or "All Photos" / "/Pictures")
   - **Preview dialog** shows: "Found 500 photos in /Pictures"
   - [Start Import] button triggers scan

### Import Progress

During scan:

```
Scanning OneDrive: /Pictures
Scanned: 123 / 500
Imported: 98
Duplicates: 25
[Cancel]
```

After completion:

```
✓ Import Complete

Scanned: 500 photos
Imported: 412 photos
Skipped: 78 duplicates

Photos are now visible on the map.
```

### Source Filtering (Stats Panel)

In Stats panel, show source breakdown:

```
Sources
━━━━━━━━━━━━
Local Folders    3,204 photos
OneDrive         567 photos
Total            3,771 photos
```

Optional: Filter by source (click to show only OneDrive, etc.)

### Token Management

**Settings → Library → OneDrive:**

```
OneDrive Connection
━━━━━━━━━━━━━━━━━
Status: ✓ Connected (user@microsoft.com)

[Disconnect]  [Re-authenticate]

Last import: 2 days ago
Next import: ---
```

Only connection metadata belongs in settings. Raw OAuth tokens must never be exposed to renderer state, plain-text config, or the local photo database.

**Lifecycle behavior:**

- Closing Placemark does **not** delete credentials
- Disconnecting OneDrive **does** delete credentials immediately
- Uninstall should attempt cleanup if supported, but the design must not rely on uninstall for secure token deletion
- If local credentials exist but are unusable, Placemark should automatically fail closed and show a reconnect state rather than retrying indefinitely

---

## Step-Test Delivery Plan

Build this feature in small increments. Each step must be completed, manually verified, and kept working before the next step begins.

### Step 0: Prove Basic Feasibility Before Azure Setup ✅ COMPLETE

**Validated against real OneDrive data (March 22, 2026):**

- [x] Used Microsoft Graph Explorer with `special/cameraroll` — works, locale-independent
- [x] Confirmed `Files.Read` scope is sufficient
- [x] Confirmed `location.latitude/longitude` is returned on photos and videos that have GPS
- [x] Confirmed `photo.takenDateTime`, `cameraMake`, `cameraModel` on JPEGs
- [x] Confirmed `photo.takenDateTime` only (no camera fields) on video items
- [x] Confirmed `file.hashes.sha256Hash`, `sha1Hash`, `quickXorHash` all returned
- [x] Confirmed `file.mimeType` — videos (`video/mp4`) appear in camera roll; must filter client-side
- [x] Confirmed `@odata.nextLink` pagination works
- [x] Confirmed folder names are locale-dependent ("Bilder" not "Pictures") — folder picker is mandatory
- [x] Confirmed thumbnails endpoint works — three sizes returned: `small` (96px), `medium` (176px), `large` (800px)
- [x] Confirmed thumbnail URLs contain `tempauth` JWT token with expiry — treat as session-scoped, never store as durable DB fields

**Findings that updated the plan:**

- `sha256Hash` confirmed available → promoted to primary dedupe key
- Videos appear alongside photos in camera roll → MIME-type client filter is essential
- GPS present on video too when recorded
- `special/cameraroll` is the recommended starting point; user must be able to navigate to any folder
- Thumbnails: three sizes (`small`/`medium`/`large`); URLs carry `tempauth` JWT — treat as session-scoped. Use `small` for map markers/list, `medium` (176px) for the preview modal.

**Test / Exit Criteria:**

- [x] Can authenticate manually with Microsoft tooling without writing Placemark auth code yet
- [x] Can list image files from a known OneDrive folder
- [x] Can confirm Graph returns: filename, size, mime type, timestamp, GPS, camera metadata, hashes
- [x] Can document gaps between docs and real-world responses
- [x] Thumbnail endpoint confirmed working — three sizes, tempauth URLs
- [x] OneDrive integration is worth continuing — proceed to Step 0.5

### Step 0.5: Prepare Real App Authentication ✅ COMPLETE

Only begin this step after Step 0 confirms the metadata and thumbnail plan is viable.

**Tenant strategy (resolved March 22, 2026):**

- M365 Developer Program was not usable for this development path due to tenant eligibility friction
- Development app registration now lives in the user's Azure student subscription tenant
- The app registration supports **Any Entra ID tenant + personal Microsoft accounts**
- At publication time, the startup/publishing company can create a production app registration in their own tenant and replace only the Client ID constant
- Store submission (Microsoft Partner Center, MSIX packaging, signing) remains independent from this development track
- App is currently unsigned — code signing is a pre-publication step, not required for local development

**Actual dev registration chosen:**

- Client ID: `d6471ed5-2e1f-472f-95f0-e672258b4522`
- Authority: `https://login.microsoftonline.com/common`
- Redirect URI: `http://localhost:3001/oauth/callback`
- Scopes: `Files.Read`, `offline_access`, `User.Read`
- Public client flow: enabled

**Build:**

- [x] Provision a real Azure tenant usable for development
- [x] Register "Placemark" app in Azure
  - Account type: **Accounts in any organizational directory (multitenant) and personal Microsoft accounts**
  - Permissions: `Files.Read`, `offline_access`, `User.Read` (delegated)
  - Redirect URI: `http://localhost:3001/oauth/callback`
- [x] Validate the callback approach in Electron
- [x] Confirm the final Microsoft Graph scopes required by the real auth flow

**Test / Exit Criteria:**

- [x] Placemark has a valid app registration (Client ID) ready for local development
- [x] The callback strategy is chosen based on actual Electron constraints, not guesswork
- [x] Scope selection remains read-only and minimal
- [x] Client ID is stored as a named constant in code (never hardcoded inline, never secret)

### Step 1: Build Authentication Only ✅ COMPLETE

**What was implemented:**

- Main-process OAuth service in `packages/desktop/src/main/services/onedriveAuth.ts`
- Authorization Code + PKCE using the system browser
- Loopback callback server on fixed localhost redirect `http://localhost:3001/oauth/callback`
- IPC handlers for `login`, `logout`, `getConnectionStatus`, plus a main-process-only access-token helper for future Graph calls
- Preload bridge for `window.api.onedrive.login()`, `logout()`, `getConnectionStatus()`
- Token persistence in local encrypted storage via Electron `safeStorage` when available, with fail-closed behavior if stored credentials become invalid
- Non-sensitive connection status exposed to renderer as `connected`, `accountEmail`, `expiresAt`

**Verified manually (March 22, 2026):**

- [x] User can trigger Microsoft sign-in and complete auth successfully
- [x] Placemark receives valid tokens
- [x] Connected state can be queried from renderer without exposing tokens in plain settings or SQLite
- [x] Disconnect deletes stored credentials immediately
- [x] Revoked/invalid tokens fail closed and return the UI to a reconnect state

**Notes:**

- Microsoft access tokens are short-lived (typically about 1 hour)
- `offline_access` is used only to renew the session without repeated sign-in prompts; it does not broaden OneDrive file permissions beyond `Files.Read`

### Step 2: Browse OneDrive Without Importing

**Next single step:**

- Implement a minimal main-process Microsoft Graph client for folder listing only

**Why this is the right next step:**

- Step 1 auth is now working end-to-end
- Folder listing is the smallest useful vertical slice of Step 2
- It exercises token reuse and Graph access without touching DB schema or import logic yet
- It preserves the existing rule that users explicitly choose what Placemark can access

**Build:**

- [x] Implement a minimal Microsoft Graph client for folder listing
- [x] Expose a main-process IPC method to list OneDrive folders by parent item ID
- [x] Start with two entry points: root and `special/cameraroll`
- [x] Return only the fields needed for browsing: `id`, `name`, `folder.childCount`, `parentReference.path`
- [x] Filter to folders only; do not import files yet
- [x] Keep this step renderer-agnostic at first so the Graph contract is proven before building UI

**Implemented contract:**

- Main-process Graph service: `packages/desktop/src/main/services/onedriveGraph.ts`
- IPC methods:
  - `window.api.onedrive.listRootFolders()`
  - `window.api.onedrive.getCameraRollFolder()`
  - `window.api.onedrive.listChildFolders(itemId)`
- Returned folder shape:
  - `id`
  - `name`
  - `childCount`
  - `path`
- Camera roll is treated as a special-folder lookup returning a single folder node via `getCameraRollFolder()`
- Traverse from that node using the same generic `listChildFolders(itemId)` method used everywhere else

**UI slice added:**

- Existing scan overlay now offers two explicit sources: local folder and OneDrive
- OneDrive mode supports:
  - connect if not already authenticated
  - browse root folders
  - jump to Camera Roll
  - traverse subfolders recursively via `listChildFolders(itemId)`
  - select a folder without importing yet
- Selection currently stops at a user-visible confirmation toast; no DB writes or import actions occur in this step

**Test / Exit Criteria:**

- [x] Renderer or DevTools can request the root folder listing successfully through IPC
- [x] Renderer or DevTools can request the `special/cameraroll` folder metadata successfully through IPC
- [x] Renderer or DevTools can enumerate the camera roll tree through `getCameraRollFolder()` + `listChildFolders(itemId)`
- [x] Returned folder data is stable enough to drive a later picker UI
- [x] No photo records are written to the DB yet

### Step 3: Import Minimal Metadata Into the Database ✅ COMPLETE

**Build:**

- [x] Add DB schema fields: `cloud_item_id`, `cloud_folder_path`, `cloud_sha256` (directly in `SCHEMA_SQL` — no migrations, delete and rebuild DB)
- [x] Extend `Photo` model and `PhotoCreateInput` with cloud fields
- [x] Update `createPhoto` INSERT/UPSERT to persist cloud fields
- [x] Implement deduplication: `isDuplicateOneDrivePhoto()` — sha256 primary, item-ID re-import guard
- [x] New service `onedriveImport.ts` — paginated Graph fetch, image filter, dedup, insert
- [x] New IPC handler `onedrive:importFolder` with progress events (`onedrive:importProgress`)
- [x] Preload bridge and type definitions updated for import

**Known limitation:** Cross-source dedup (local file ↔ OneDrive same content) is not implemented — local photos have no hash. OneDrive-to-OneDrive re-import dedup works via sha256. Deferred until hashing local files is prioritised.

**Test / Exit Criteria:**

- [x] Import writes OneDrive photo records into the local DB
- [x] Duplicate OneDrive/local files are skipped according to the current rule
- [x] Import summary matches actual DB changes
- [x] Re-running the same import does not create duplicate rows

### Step 3.5: Wire Import Into the UI ✅ COMPLETE

**Design decisions:**

- No confirmation/preview step — import starts immediately on folder select
- Progress reuses the existing `ScanOverlay` scanning view unchanged
  - OneDrive progress maps onto `ScanProgress`: `scanned→total`, `imported+duplicates→processed`, `currentFile→currentFile`
- `includeSubdirectories` setting (existing toggle in `ScanOverlay`) is respected — backend recurses into subfolders when true
- On cancel/abort: keep whatever was already imported (same as local scan abort)
- Map auto-refreshes when import completes (same `onComplete` callback pattern as local scan)
- Reuse `useFolderScan` hook — add `importOneDriveFolder(folderId, onComplete)` method driving the same `scanning`/`scanProgress` state

**Build:**

- [x] Add `includeSubdirectories` param to `onedrive:importFolder` IPC handler and `onedriveImport.ts` service (recurse via `listChildFolders`)
- [x] Add `importOneDriveFolder` method to `useFolderScan` hook
- [x] Replace toast stub in `App.tsx` `handleSelectOneDriveFolder` with `folderScan.importOneDriveFolder(folder.id, photoData.loadPhotos)`
- [x] Abort: `useFolderScan.abortScan` dispatches `onedrive:abortImport` when `activeSource === 'onedrive'`; `onedriveImport.ts` checks `abortRequested` flag at each item and subfolder boundary
- [x] `includeSubdirectories` toggle in `ScanOverlay` shared across local and OneDrive modes

**Test / Exit Criteria:**

- [x] Selecting a OneDrive folder triggers import immediately
- [x] Progress bar shows scanned/total counts updating in real time
- [x] Abort stops the import, keeping photos already inserted
- [ ] Map shows imported photos after completion (Step 4)
- [x] Re-importing the same folder skips duplicates and completes cleanly

### Step 4: Show OneDrive Photos on the Map

**Build:**

- [ ] Include OneDrive records in normal photo queries
- [ ] Render OneDrive photos as regular photo dots on the map
- [ ] Ensure clustering/spidering works with mixed local + OneDrive data

**Test / Exit Criteria:**

- [ ] Imported OneDrive photos appear on the map when GPS exists
- [ ] Mixed local and OneDrive libraries render together without regressions
- [ ] Deduplicated photos do not appear twice
- [ ] Existing map interactions still work

### Step 5: Wire Timeline and Stats

**Build:**

- [ ] Include OneDrive photos in timeline data
- [ ] Include OneDrive photos in stats aggregation
- [ ] Add source breakdown in stats (`Local`, `OneDrive`, `Total`)

**Test / Exit Criteria:**

- [ ] Timeline counts reflect imported OneDrive photos
- [ ] Stats panel source totals match DB contents
- [ ] Date filtering behaves correctly with mixed local/cloud records

### Step 6: Add Preview Modal Support

**Build:**

- [ ] Fetch thumbnail metadata on demand from `cloud_item_id`
- [ ] Apply fixed size mapping: `small` (96px) for compact/list contexts, `medium` (176px) for preview modal default, `large` (800px) only for expanded/zoomed view
- [ ] Persist only canonical `medium` thumbnail bytes in the thumbnail cache (single entry per photo)
- [ ] Load and display OneDrive thumbnails in the preview modal using the on-demand thumbnail fetch
- [ ] Show remote metadata in the same preview UI used for local files
- [ ] Handle missing/expired thumbnail URLs gracefully

**Test / Exit Criteria:**

- [ ] Clicking a OneDrive photo opens the existing preview modal
- [ ] Thumbnail loads from Microsoft-hosted thumbnail data without full file download
- [ ] Cached `medium` thumbnail renders in preview without requiring a fresh network call on repeat open
- [ ] `small` and `large` paths work on demand without changing persistent cache schema
- [ ] Timestamp, GPS, camera info, and source context display correctly
- [ ] Expired thumbnail URLs degrade gracefully and recover on refresh/reimport

### Step 7: Harden Error Handling and Lifecycle

**Build:**

- [ ] Add robust handling for network failures, 401/403 responses, missing folders, and empty imports
- [ ] Add explicit fail-closed behavior for unusable credentials
- [ ] Verify token refresh during long-running or repeated operations
- [ ] Document uninstall credential-cleanup behavior by platform

**Test / Exit Criteria:**

- [ ] Broken/expired credentials do not leave the app in a half-connected state
- [ ] Long imports survive access-token expiry via refresh flow
- [ ] Empty folders and all-duplicate folders show clear results
- [ ] Disconnect, reconnect, and revoked-access cases are predictable and safe

### Step 8: Scale Test Before Broad Use

**Build:**

- [ ] Test pagination and performance with larger OneDrive folders
- [ ] Confirm UI remains responsive during scan/import
- [ ] Validate thumbnail behavior at realistic library sizes

**Test / Exit Criteria:**

- [ ] 100-photo and 1000-photo test folders behave acceptably
- [ ] Progress UI remains responsive and cancelable
- [ ] No regressions in map rendering, timeline, or stats with mixed-source libraries
- [ ] Feature is considered implementation-ready for real-world use only after these tests pass

---

## Known Unknowns / Future Questions

### Questions to Answer Before Code

- [x] Exact Azure app registration details (client ID, etc.) — resolved for development
- [x] OneDrive folder picker component — Graph API folder listing chosen for Step 2
- [x] Which callback approach is best in practice for Electron + Microsoft identity: loopback localhost or custom protocol?
- [ ] Thumbnail URL lifetime — how long do they stay valid? Need refresh strategy?
- [ ] Post-v1 decision: should we evolve from single-canonical thumbnail cache to multi-variant persistent cache (`small`/`medium`/`large`)?
- [ ] Rate limiting — how many Graph API calls per scan session? Pagination strategy?
- [x] Which OS credential-storage wrapper/library is the most robust choice for Windows-first distribution? (Electron `safeStorage` selected for current desktop scope)
- [ ] Can uninstall cleanup remove OS-stored credentials reliably on each supported platform, or should this be documented as manual cleanup only?

### Out of Scope (Phase 2+)

- [ ] Copy/move operations to OneDrive
- [ ] Automatic sync (polling)
- [ ] Google Drive, Dropbox, iCloud integration
- [ ] Upload photos to OneDrive from Placemark
- [ ] OneDrive-to-local file download

---

## Testing Strategy

### Unit Tests

- Deduplication logic: identical filename+size, different sources
- Graph API response parsing: metadata extraction, `location` vs `photo` behavior, OneDrive Personal vs Business differences
- Token refresh: expiry detection, new token issued
- Error handling: invalid token, network timeout, folder not found

### Integration Tests

- OAuth flow: system browser launch, callback capture, PKCE exchange, secure storage, refresh, disconnect cleanup
- Full scan: 10+ files, verify all fields populated according to the validated Graph contract
- Dedup across sources: local + OneDrive, verify skips
- Stats aggregation: correct counts across sources

### Credential Lifecycle Tests

- Credentials survive app restart but are never written to plain-text settings or SQLite
- Disconnect removes credentials immediately and forces fresh sign-in next time
- Revoked/expired refresh token transitions the UI to reconnect state and clears unusable local credential
- Uninstall behavior is verified and documented per platform

### Manual Testing

- Large folder (100+) performance
- Token expiry and refresh
- Thumbnail display in preview modal
- Timeline playback with mixed sources
- Lasso selection with OneDrive photos
- Stats panel source breakdown

---

## Risk Mitigations

| Risk                                        | Impact                        | Mitigation                                                                                                                  |
| ------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Microsoft Graph API changes**             | Breaking API calls            | Monitor Microsoft docs, use versioned endpoints (/v1.0)                                                                     |
| **Token expiry during long scan**           | Aborted import                | Implement refresh token flow, retry on 401                                                                                  |
| **Token leakage from local storage**        | Unauthorized OneDrive access  | Use OS-backed credential storage only; never store raw tokens in settings or SQLite                                         |
| **Credentials remain after uninstall**      | Residual local access state   | Attempt uninstall cleanup where supported; otherwise document manual removal and rely on provider-side revocation if needed |
| **Large OneDrive folders (100k+)**          | Timeout, UI freeze            | Paginate Graph API calls, show progress, allow cancel                                                                       |
| **User revokes access**                     | Photos orphaned in DB         | Handle 403 gracefully, show "access revoked" in Settings                                                                    |
| **Thumbnail URLs expire**                   | Broken thumbnails after time  | Re-fetch thumbnail URL on next scan, cache strategy                                                                         |
| **Graph metadata is sparser than expected** | Missing GPS/camera fields     | Treat Step 0 as a contract-validation gate; build around validated fields only                                              |
| **Duplicate detection false positives**     | Legitimate duplicates skipped | Keep dedup rule explicit (filename+size only), document                                                                     |

---

## Performance Targets

- **Folder scan:** 100 photos → < 10 seconds
- **1000+ photos:** Paginated, show progress, non-blocking UI
- **Thumbnail display:** < 100ms load from URL (or cached)
- **Map rendering:** No jank with 5k+ photos (local + OneDrive combined)

---

## Version Bump

When this feature ships (Phase 1 + 2 complete):

- Minor version bump (e.g., `0.4.0` → `0.5.0`)
- Update `RELEASE_NOTES.md` with: "OneDrive support: scan and visualize cloud photos on the map"

---

## Next Steps

1. **Approve This Plan** — confirm the design direction and constraints
2. **Run Step 0** — validate Graph metadata, location fields, thumbnail behavior, and scope assumptions with real OneDrive data
3. **Only if Step 0 passes: run Step 0.5** — register the Azure app and lock the callback approach
4. **Begin Step 1 implementation** — build authentication only after the Graph contract is proven

---

**Document Owner:** (You)  
**Last Reviewed:** March 21, 2026  
**Ready for Implementation:** Not yet — begin only after Step 0 and Step 0.5 pass
