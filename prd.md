# Placemark — Product Requirements Document

Implementation status lives in [docs/plan.md](docs/plan.md). This document stays product-focused: what Placemark must do for users, what it must not do, and what quality bar it must meet.

## 1. Purpose

Placemark is a privacy-first, local-first photo organizer that helps users rediscover their photo collections by visualizing where and when their photos were taken.

It reads GPS coordinates and timestamps already embedded in photo files, stores derived metadata locally, and gives users a map-first way to browse, filter, export, and organize their libraries without uploading personal photos to Placemark-controlled infrastructure.

---

## 2. Problem Statement

People accumulate thousands of photos across phones, cameras, folders, drives, and cloud storage. Finding photos from a specific trip, location, or time period is tedious when the primary tools are filenames, folders, and memory.

Many mainstream solutions solve this by requiring cloud uploads, subscriptions, or opaque AI inference on private images. Users who care about privacy, ownership, or calm software need a tool that helps them explore their photo history spatially and temporally without handing their library to a platform.

**Placemark exists so users can answer questions like:**

- "Show me everything I photographed in Lisbon."
- "What did I shoot in summer 2019?"
- "Which photos from this trip belong in separate folders by city?"

---

## 3. Target Users

### Primary

- **Privacy-conscious individuals** who do not want photos uploaded to third-party servers.
- **Photo hobbyists and travelers** with large collections of geotagged photos spread across folders, drives, or network storage.
- **Digital organizers** who want to sort and move photos based on location and date.

### Secondary

- **Families** managing shared photo libraries on a home NAS.
- **Professionals** such as real-estate photographers, journalists, and field workers who review location-tagged images.

### Assumptions

- Many users already have photos with GPS coordinates embedded in EXIF metadata.
- Users are comfortable selecting folders on their computer.
- Users expect a desktop application that works without account creation.
- Users want explicit control over scans, filters, and file operations.

---

## 4. Product Principles

These principles guide all product decisions.

| Principle                    | Meaning                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Privacy over convenience** | Never route photo data or metadata through Placemark-controlled infrastructure. Accept reduced convenience rather than break trust. |
| **Explicit over automatic**  | The user initiates scans, imports, and file actions. No background polling, no hidden sync, no surprise behavior.                   |
| **Transparency over magic**  | Show counts, previews, boundaries, and consequences before action.                                                                  |
| **Safety over speed**        | File operations must be reversible or recoverable. Never overwrite or destroy silently.                                             |
| **Simplicity over features** | The interface should feel calm, legible, and focused even as the library grows large.                                               |

---

## 5. Functional Requirements

### 5.1 Sources and Ingestion

| ID   | Requirement                                                                                                                  | Priority    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| PI-1 | The user must be able to select one or more local folders or network-share folders as photo sources.                         | Must Have   |
| PI-2 | The application must recursively scan supported image formats.                                                               | Must Have   |
| PI-3 | The application must extract GPS coordinates, timestamps, and available camera metadata from photo EXIF data.                | Must Have   |
| PI-4 | The application must store derived metadata locally in a rebuildable database on the user's device.                          | Must Have   |
| PI-5 | Re-scanning an existing source must update existing records without creating duplicates.                                     | Must Have   |
| PI-6 | The user must see clear counts for scanned files, imported photos, duplicates, and photos without GPS data.                  | Must Have   |
| PI-7 | The user should be able to connect a OneDrive account and scan cloud-stored photos without downloading full originals first. | Should Have |
| PI-8 | The user should be able to review connected cloud-account state and disconnect an account explicitly.                        | Should Have |
| PI-9 | Photos without GPS data must never be silently hidden; the application must surface how many were excluded from the map.     | Must Have   |

### 5.2 Map Exploration

| ID    | Requirement                                                                                                  | Priority    |
| ----- | ------------------------------------------------------------------------------------------------------------ | ----------- |
| MV-1  | The application must display geotagged photos as markers on an interactive map.                              | Must Have   |
| MV-2  | The user must be able to pan and zoom the map freely.                                                        | Must Have   |
| MV-3  | When many photos are close together, they must be grouped into clusters that show a count.                   | Must Have   |
| MV-4  | Clicking a cluster must zoom into the area to reveal individual markers.                                     | Must Have   |
| MV-5  | Hovering over an individual marker must show a thumbnail preview of the photo.                               | Must Have   |
| MV-6  | Clicking a marker must select the photo and show basic details such as filename, date, and coordinates.      | Must Have   |
| MV-7  | When multiple photos share identical coordinates, the user must still be able to access each one distinctly. | Must Have   |
| MV-8  | Map presentation must adapt to the chosen appearance mode.                                                   | Should Have |
| MV-9  | The map should offer an optional heatmap mode for density exploration.                                       | Should Have |
| MV-10 | Floating UI panels must not block core map interaction or hide essential map controls.                       | Must Have   |

### 5.3 Time, Insights, and Filtering

| ID    | Requirement                                                                                                               | Priority    |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| TF-1  | The application must display a timeline showing the distribution of photos over time.                                     | Must Have   |
| TF-2  | The user must be able to select a date range on the timeline to filter which photos appear on the map.                    | Must Have   |
| TF-3  | Geographic, temporal, format, and camera filters must work independently and in combination.                              | Must Have   |
| TF-4  | Filtering must update the map in real time for typical libraries and feel instant at 10,000 photos.                       | Must Have   |
| TF-5  | The user should be able to play back photos chronologically.                                                              | Should Have |
| TF-6  | Playback should optionally auto-zoom the map to follow the active result set.                                             | Should Have |
| TF-7  | The user must always see a summary of the current result set, including active filters and counts.                        | Must Have   |
| TF-8  | The application should show library insights such as totals, coverage, file formats, camera breakdown, and storage usage. | Should Have |
| TF-9  | Format and camera breakdown rows should be directly usable as filters.                                                    | Should Have |
| TF-10 | Active filters must be visible and removable without reopening the stats panel.                                           | Must Have   |
| TF-11 | The application should offer a quick way to fit the timeline to the currently visible map result set.                     | Should Have |
| TF-12 | The stats and filters surface must remain usable while the rest of the app stays interactive.                             | Must Have   |

### 5.4 Saved Views and Export

| ID   | Requirement                                                                                                | Priority    |
| ---- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| SV-1 | The user must be able to save the current map, time, and filter state as a Placemark.                      | Must Have   |
| SV-2 | The user must be able to reopen a saved Placemark with one action.                                         | Must Have   |
| SV-3 | The user must be able to rename and delete saved Placemarks.                                               | Must Have   |
| SV-4 | The application should provide a small set of smart Placemarks for common recent time windows.             | Should Have |
| EX-1 | The user must be able to export the current result set to CSV.                                             | Must Have   |
| EX-2 | The user must be able to export the current result set to GeoJSON.                                         | Must Have   |
| EX-3 | The user must be able to export the current result set to GPX.                                             | Must Have   |
| EX-4 | When a selection is active, export must use the selection instead of the broader viewport result set.      | Must Have   |
| EX-5 | Export must only write to user-chosen local files and must never transmit photo data to external services. | Must Have   |

### 5.5 Selection and Organization

| ID    | Requirement                                                                                                            | Priority    |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| SO-1  | The user must be able to select a single photo by clicking its marker.                                                 | Must Have   |
| SO-2  | The user must be able to select multiple photos by drawing a freeform lasso on the map.                                | Must Have   |
| SO-3  | The user must be able to clear the current selection explicitly.                                                       | Must Have   |
| SO-4  | The current selected-photo count must always be visible.                                                               | Must Have   |
| SO-5  | The user must be able to copy selected photos to a destination folder.                                                 | Must Have   |
| SO-6  | The user must be able to move selected photos to a destination folder.                                                 | Must Have   |
| SO-7  | Before any file operation executes, the user must see a preview of what will happen.                                   | Must Have   |
| SO-8  | The application must never overwrite an existing destination file without explicit user confirmation.                  | Must Have   |
| SO-9  | If a file operation fails partway through a batch, completed files in that batch must roll back to a consistent state. | Must Have   |
| SO-10 | The user must see real-time file-operation progress.                                                                   | Must Have   |
| SO-11 | The user must be able to undo a completed copy or move operation.                                                      | Must Have   |
| SO-12 | Undo of a copy operation should use the OS trash or recycle bin when appropriate.                                      | Should Have |
| SO-13 | After a move operation, the application's database must reflect the new file locations.                                | Must Have   |

### 5.6 Settings, Accounts, and Customization

| ID   | Requirement                                                                                            | Priority    |
| ---- | ------------------------------------------------------------------------------------------------------ | ----------- |
| SC-1 | The user must be able to switch between light and dark appearance modes.                               | Must Have   |
| SC-2 | The user must be able to manage storage, including viewing database size and clearing thumbnail cache. | Must Have   |
| SC-3 | The user must be able to see the current application version and project information.                  | Must Have   |
| SC-4 | Map display settings should be configurable.                                                           | Should Have |
| SC-5 | Timeline playback behavior should be configurable.                                                     | Should Have |
| SC-6 | All user settings must persist across sessions.                                                        | Must Have   |
| SC-7 | The user should be able to review connected cloud accounts and disconnect them intentionally.          | Should Have |
| SC-8 | The user should be able to disable optional external services for maximum privacy or offline use.      | Should Have |

### 5.7 Licensing and Store Behavior

| ID   | Requirement                                                                                        | Priority  |
| ---- | -------------------------------------------------------------------------------------------------- | --------- |
| LC-1 | The free tier must remain fully usable for exploration up to the configured photo limit.           | Must Have |
| LC-2 | The Pro unlock must remove the photo cap and enable the designated paid feature set.               | Must Have |
| LC-3 | Upgrade prompts must appear only at clear gated boundaries and must always include a dismiss path. | Must Have |
| LC-4 | Upgrade UX must avoid dark patterns such as countdowns, fake urgency, or degraded free usage.      | Must Have |
| LC-5 | Store entitlement must survive reinstalls and temporary offline conditions gracefully.             | Must Have |

---

## 6. Non-Functional Requirements

### 6.1 Privacy

| ID    | Requirement                                                                                                                                                                                              |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NF-P1 | The application must not transmit photo data or metadata to Placemark-controlled servers. Permitted network traffic is limited to user-directed cloud access, map tiles, and optional reverse geocoding. |
| NF-P2 | All indexed metadata, thumbnails, saved views, and settings must be stored locally on the user's device.                                                                                                 |
| NF-P3 | The application must not include telemetry, analytics, crash reporting, or usage tracking.                                                                                                               |
| NF-P4 | If cloud storage integration is used, authentication tokens must be stored using OS-level secure storage.                                                                                                |
| NF-P5 | External network-backed features must be optional and clearly explained to the user.                                                                                                                     |

### 6.2 Performance

| ID    | Requirement                                                                         |
| ----- | ----------------------------------------------------------------------------------- |
| NF-E1 | The application should launch in under 3 seconds on a typical machine.              |
| NF-E2 | Scanning 10,000 local photos should complete in under 30 seconds.                   |
| NF-E3 | The map must render 10,000 markers with clustering without perceptible lag.         |
| NF-E4 | Filtering 10,000 photos by bounds and/or date range should complete in under 100ms. |
| NF-E5 | The application must remain usable with libraries of 100,000+ photos.               |
| NF-E6 | Memory usage should stay under 500MB even with large datasets.                      |

### 6.3 Reliability

| ID    | Requirement                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| NF-R1 | File operations must be atomic at the batch level. Partial completion must not leave the filesystem inconsistent.    |
| NF-R2 | The application must handle missing, moved, or inaccessible source folders gracefully with clear user-facing errors. |
| NF-R3 | Network interruptions during network-share or cloud access must not crash the application or corrupt the database.   |
| NF-R4 | The local database must be rebuildable at any time by re-scanning sources.                                           |

### 6.4 Usability

| ID    | Requirement                                                                        |
| ----- | ---------------------------------------------------------------------------------- |
| NF-U1 | The application must be usable without account creation for local-only workflows.  |
| NF-U2 | Error messages must be written for end users, not developers.                      |
| NF-U3 | Destructive or irreversible actions must require explicit confirmation.            |
| NF-U4 | The interface must feel calm and uncluttered even on large libraries.              |
| NF-U5 | Layouts must preserve access to essential controls at normal desktop window sizes. |

### 6.5 Portability

| ID    | Requirement                                                                                                                         |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------- |
| NF-T1 | The application must run on Windows 10/11 (64-bit).                                                                                 |
| NF-T2 | The architecture should keep macOS support practical.                                                                               |
| NF-T3 | Direct-download builds should remain available as portable executables where feasible, even if the Store build uses MSIX packaging. |
| NF-T4 | Portable-mode application data must live alongside the executable rather than in a system-wide location.                            |
| NF-T5 | Core business logic should remain portable enough for future mobile reuse.                                                          |

---

## 7. Out of Scope

The following are explicitly not requirements for Placemark:

- Traditional photo editing such as crop, rotate, or color correction
- AI-powered tagging, recognition, or inferred metadata
- Placemark-hosted cloud sync between devices
- Social feeds, sharing links, or collaboration features
- Photo format conversion
- Automatic background scanning or scheduled processing
- Multi-user account systems
- Server-side Placemark infrastructure

---

## 8. User Scenarios

### Scenario A: "Where was that restaurant?"

A user remembers dining at a great restaurant during a trip to Lisbon but cannot recall the name. They open Placemark, zoom into Lisbon, narrow the timeline to the dates of their trip, and inspect a cluster near the right street. Hover preview and photo details quickly confirm the spot.

### Scenario B: "Organize vacation photos"

A user has 800 road-trip photos in one large folder. They zoom into the first city on the map, lasso the relevant photos, preview a copy operation, and sort them into a destination folder with confidence that nothing will be overwritten silently.

### Scenario C: "What did we do last summer?"

A user scans their entire Pictures directory. They drag the timeline to June through August of the previous year, then use format and camera filters to narrow the set further. The map reveals a beach vacation, their hometown, and a forgotten weekend trip.

### Scenario D: "Bring OneDrive and local photos together"

A user keeps newer phone photos in OneDrive and older travel photos on an external drive. They connect OneDrive, scan a local folder, and explore both sources in one map-centered interface without uploading anything to Placemark.

---

## 9. Success Criteria

Placemark is successful when a user can:

1. **Discover** — Point it at a source and quickly see photos on a map.
2. **Explore** — Pan, zoom, filter, and recall saved places to find a specific memory faster than folder browsing.
3. **Act** — Export, copy, or move the right photos with confidence.
4. **Trust** — Understand that their photos and metadata stay under their control.

---

## 10. Glossary

| Term                | Definition                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| **EXIF**            | Exchangeable Image File Format: metadata embedded in photo files, including GPS coordinates and timestamps. |
| **Geotagged**       | A photo that contains GPS latitude and longitude in EXIF metadata.                                          |
| **Source**          | A local folder, network share, or connected cloud location registered for scanning.                         |
| **Cluster**         | A visual grouping of nearby photo markers on the map.                                                       |
| **Lasso selection** | A freeform drawing tool that selects all photos within the drawn shape.                                     |
| **Placemark**       | A saved map/time/filter view that can be reopened later.                                                    |
| **Preview**         | A user-visible summary of what a file operation will do before it runs.                                     |
| **Atomic batch**    | A group of file operations that either succeeds completely or rolls back to a consistent state.             |
| **Portable mode**   | Running the application without installation, with its data stored next to the executable.                  |
