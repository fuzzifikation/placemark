# OneDrive Integration Plan

**Status:** Design Phase (Pending Step 0 feasibility validation)  
**Last Updated:** March 21, 2026

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
- Redirect URI: `http://localhost:{ephemeral-port}/oauth/callback` or a custom app protocol, whichever proves most robust for Electron + Microsoft identity
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
```

Do not persist transient thumbnail URLs as durable database fields. Use the stable `cloud_item_id` and fetch thumbnail metadata on demand, with an in-memory or short-lived cache if needed.

### Deduplication Strategy

**Rule:** Photos are considered identical if `filename + filesize` match, regardless of source.

**Implementation:**

1. **Before inserting** each OneDrive photo, query:
   ```sql
   SELECT id FROM photos WHERE filename = ? AND fileSize = ?
   ```
2. **If exists:** Skip insertion, log as duplicate
3. **If not exists:** Insert new photo record with `source_type = 'onedrive'`

**Result tracking:**

- Log import session: `{ scanned: 500, imported: 412, duplicates: 78 }`
- Display to user: "Scanned 500 photos, imported 412 (78 duplicates skipped)"

---

## Data Extraction

### Per-Photo Metadata

| Field                       | Source                                              | Mandatory | Notes                                                         |
| --------------------------- | --------------------------------------------------- | --------- | ------------------------------------------------------------- |
| `filename`                  | OneDrive `name`                                     | ✅        | e.g., IMG_1234.jpg                                            |
| `fileSize`                  | OneDrive `size`                                     | ✅        | In bytes                                                      |
| `mimeType`                  | OneDrive `file.mimeType`                            | ✅        | image/jpeg, image/heic, etc.                                  |
| `timestamp`                 | OneDrive `photo.takenDateTime` or `createdDateTime` | ✅        | ISO 8601, fallback to created                                 |
| `latitude`, `longitude`     | OneDrive `location.latitude`, `location.longitude`  | ❌        | Only if Graph exposes location metadata for that file         |
| `cameraMake`, `cameraModel` | OneDrive `photo.cameraMake`, `photo.cameraModel`    | ❌        | Validate in Step 0; may be limited depending on OneDrive type |
| `cloud_item_id`             | OneDrive `id`                                       | ✅        | Unique identifier                                             |
| `cloud_folder_path`         | Derived from folder hierarchy                       | ✅        | e.g., /Pictures/2024/Paris                                    |
| `source_type`               | Hardcoded                                           | ✅        | 'onedrive'                                                    |

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

### Step 0: Prove Basic Feasibility Before Azure Setup

**Build:**

- [ ] Use Microsoft Graph Explorer or equivalent tooling against a personal OneDrive test folder
- [ ] Confirm the minimum Microsoft Graph scopes likely required for read-only photo metadata and thumbnails
- [ ] Test real Graph responses against a personal OneDrive test folder
- [ ] Record what Graph actually returns for real files, not just what the docs suggest
- [ ] Verify whether GPS is exposed through `location` for the files we care about
- [ ] Verify whether camera make/model are available on the target OneDrive account types we intend to support
- [ ] Verify thumbnail retrieval strategy without assuming durable stored URLs

**Test / Exit Criteria:**

- [ ] Can authenticate manually with Microsoft tooling without writing Placemark auth code yet
- [ ] Can list image files from a known OneDrive folder
- [ ] Can confirm Graph returns the fields we need in practice: filename, size, mime type, timestamp, GPS if present, camera metadata if present, thumbnail availability
- [ ] Can document any gaps between Graph docs and real-world responses before writing app code
- [ ] Can decide that OneDrive integration is worth continuing before doing Azure registration work

### Step 0.5: Prepare Real App Authentication

Only begin this step after Step 0 confirms the metadata and thumbnail plan is viable.

**Build:**

- [ ] Register the Placemark app in Azure
- [ ] Validate the callback approach to use in Electron (`localhost` loopback vs custom protocol)
- [ ] Confirm the final Microsoft Graph scopes required by the real auth flow

**Test / Exit Criteria:**

- [ ] Placemark has a valid app registration ready for local development
- [ ] The callback strategy is chosen based on actual Electron constraints, not guesswork
- [ ] Scope selection remains read-only and minimal

### Step 1: Build Authentication Only

**Build:**

- [ ] Add main-process OAuth handler
- [ ] Implement Authorization Code + PKCE using the system browser
- [ ] Add preload IPC for `window.api.onedrive.login()`, `logout()`, `getConnectionStatus()`
- [ ] Store tokens in OS-backed secure credential storage
- [ ] Store only non-sensitive connection metadata in settings

**Test / Exit Criteria:**

- [ ] User can click a test action and complete Microsoft sign-in
- [ ] Placemark receives valid tokens
- [ ] App restart preserves the connected state without exposing tokens in plain settings or SQLite
- [ ] Disconnect deletes stored credentials immediately
- [ ] Revoked/invalid tokens fail closed and return the UI to a reconnect state

### Step 2: Browse OneDrive Without Importing

**Build:**

- [ ] Implement a minimal Microsoft Graph client for folder listing
- [ ] Add OneDrive as an option under the existing `Add Source` flow
- [ ] Add a basic folder picker or folder selection flow for OneDrive

**Test / Exit Criteria:**

- [ ] User can connect and browse their OneDrive folder structure
- [ ] User can choose a test folder or the default Pictures location
- [ ] App shows a reliable candidate photo count before import
- [ ] No photo records are written to the DB yet

### Step 3: Import Minimal Metadata Into the Database

**Build:**

- [ ] Add DB schema fields: `source_type`, `cloud_item_id`, `cloud_folder_path`
- [ ] Insert OneDrive photos with minimal required metadata only
- [ ] Implement deduplication against the existing DB using `filename + filesize`
- [ ] Add import result summary counts (`scanned`, `imported`, `duplicates`)

**Test / Exit Criteria:**

- [ ] Import writes OneDrive photo records into the local DB
- [ ] Duplicate OneDrive/local files are skipped according to the current rule
- [ ] Import summary matches actual DB changes
- [ ] Re-running the same import does not create duplicate rows

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
- [ ] Load and display OneDrive thumbnails in the preview modal using the on-demand thumbnail fetch
- [ ] Show remote metadata in the same preview UI used for local files
- [ ] Handle missing/expired thumbnail URLs gracefully

**Test / Exit Criteria:**

- [ ] Clicking a OneDrive photo opens the existing preview modal
- [ ] Thumbnail loads from Microsoft-hosted thumbnail data without full file download
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

- [ ] Exact Azure app registration details (client ID, etc.) — requires setup
- [ ] OneDrive folder picker component — use Graph API or Microsoft picker SDK?
- [ ] Which callback approach is best in practice for Electron + Microsoft identity: loopback localhost or custom protocol?
- [ ] Thumbnail URL lifetime — how long do they stay valid? Need refresh strategy?
- [ ] Which thumbnail cache strategy is best: per-session in-memory cache only, or short-lived persisted cache with expiry?
- [ ] Rate limiting — how many Graph API calls per scan session? Pagination strategy?
- [ ] Which OS credential-storage wrapper/library is the most robust choice for Windows-first distribution?
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
