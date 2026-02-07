# Placemark — Product Requirements Document

## 1. Purpose

This document defines what Placemark must do from the user's perspective. It describes the problems the product solves, who it serves, and the functional and non-functional requirements it must satisfy.

Placemark is a **privacy-first, local-first photo organizer** that lets users rediscover their photo collections by visualizing _where_ and _when_ their photos were taken — without ever uploading personal photos to the cloud.

---

## 2. Problem Statement

People accumulate thousands of photos across devices, folders, and cloud services. Finding photos from a specific trip, location, or time period is tedious. Existing solutions (Google Photos, Apple Photos, Adobe Lightroom) require cloud uploads, impose subscriptions, or run opaque AI inference on personal images.

Users who care about privacy, or who simply want to stay in control of their own files, have no good tool for exploring photos by geography and time.

**Placemark exists so users can answer questions like:**

- "Show me all photos I took in Paris."
- "What did I photograph in summer 2019?"
- "I want to organize my vacation photos by location into folders."

---

## 3. Target Users

### Primary

- **Privacy-conscious individuals** who do not want photos uploaded to third-party servers.
- **Photo hobbyists and travelers** with large collections of geotagged photos spread across folders, drives, or network storage.
- **Digital organizers** who want to sort and move photos based on location and date.

### Secondary

- **Families** managing shared photo libraries on a home NAS.
- **Professionals** (real estate, journalism, fieldwork) who need to review location-tagged images.

### User Assumptions

- Users have photos with EXIF GPS metadata (most modern smartphones embed this).
- Users are comfortable selecting folders on their computer.
- Users expect a desktop application that works offline (no account creation or login required).

---

## 4. Product Principles

These principles guide all requirements and trade-off decisions.

| Principle                    | Meaning                                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Privacy over convenience** | Never transmit photo data or metadata off-device. Accept reduced functionality rather than compromise privacy. |
| **Explicit over automatic**  | The user initiates all actions. No background scanning, no inference, no surprises.                            |
| **Transparency over magic**  | Always show users what will happen before it happens. Previews before file moves. Counts before scans.         |
| **Safety over speed**        | File operations must be reversible or recoverable. Never overwrite or delete without confirmation.             |
| **Simplicity over features** | A calm, focused interface. Do fewer things, but do them well.                                                  |

---

## 5. Functional Requirements

### 5.1 Photo Ingestion

| ID   | Requirement                                                                                                              | Priority     | Status      |
| ---- | ------------------------------------------------------------------------------------------------------------------------ | ------------ | ----------- |
| PI-1 | The user must be able to select one or more folders on their local filesystem as photo sources.                          | Must Have    | ✅ Done     |
| PI-2 | The application must recursively scan selected folders for image files (JPEG, PNG, HEIC, TIFF, WebP).                    | Must Have    | ✅ Done     |
| PI-3 | The application must extract GPS coordinates and timestamps from photo EXIF metadata.                                    | Must Have    | ✅ Done     |
| PI-4 | The application must store extracted metadata in a local database on the user's device.                                  | Must Have    | ✅ Done     |
| PI-5 | Re-scanning a previously scanned folder must update existing records without creating duplicates.                        | Must Have    | ✅ Done     |
| PI-6 | The user must be told how many photos were found, how many have location data, and how many do not.                      | Must Have    | ✅ Done     |
| PI-7 | The user should be able to connect a OneDrive account and scan cloud-stored photos without downloading full image files. | Nice to Have | ⬜ Not Done |
| PI-8 | Photos without GPS data must not be silently hidden — the user must see a count of excluded photos.                      | Must Have    | ✅ Done     |

### 5.2 Map Visualization

| ID    | Requirement                                                                                                                                    | Priority     | Status  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------- |
| MV-1  | The application must display geotagged photos as markers on an interactive map.                                                                | Must Have    | ✅ Done |
| MV-2  | The user must be able to pan and zoom the map freely.                                                                                          | Must Have    | ✅ Done |
| MV-3  | When many photos are close together, they must be grouped into clusters that show a count.                                                     | Must Have    | ✅ Done |
| MV-4  | Clicking a cluster must zoom into the area to reveal individual markers.                                                                       | Must Have    | ✅ Done |
| MV-5  | Hovering over an individual marker must show a thumbnail preview of the photo.                                                                 | Must Have    | ✅ Done |
| MV-6  | Clicking a marker must select the photo and display its details (filename, date, coordinates).                                                 | Must Have    | ✅ Done |
| MV-7  | When multiple photos share identical coordinates, the user must be able to distinguish and access each one (e.g., spread them apart visually). | Must Have    | ✅ Done |
| MV-8  | Map tile data may be loaded from the internet, but no photo data or location information may be transmitted.                                   | Must Have    | ✅ Done |
| MV-9  | The map should adapt its visual style to the selected appearance mode (e.g., dark tiles in dark mode).                                         | Should Have  | ✅ Done |
| MV-10 | The map should offer an optional heatmap mode showing photo density.                                                                           | Nice to Have | ✅ Done |

### 5.3 Temporal Filtering

| ID   | Requirement                                                                                                      | Priority    | Status  |
| ---- | ---------------------------------------------------------------------------------------------------------------- | ----------- | ------- |
| TF-1 | The application must display a timeline showing the distribution of photos over time.                            | Must Have   | ✅ Done |
| TF-2 | The user must be able to select a date range on the timeline to filter which photos appear on the map.           | Must Have   | ✅ Done |
| TF-3 | Temporal and geographic filters must work independently and in combination.                                      | Must Have   | ✅ Done |
| TF-4 | Filtering must update the map display in real time (perceived as instant for up to 10,000 photos).               | Must Have   | ✅ Done |
| TF-5 | The user should be able to play back photos chronologically (slideshow/animation mode).                          | Should Have | ✅ Done |
| TF-6 | During playback, the map should optionally auto-zoom to follow the current photos.                               | Should Have | ✅ Done |
| TF-7 | The user must always see a summary of the current selection (e.g., "152 photos, Jan 2023–Mar 2023, Paris area"). | Must Have   | ✅ Done |

### 5.4 Photo Selection

| ID   | Requirement                                                                                     | Priority  | Status  |
| ---- | ----------------------------------------------------------------------------------------------- | --------- | ------- |
| PS-1 | The user must be able to select a single photo by clicking its marker.                          | Must Have | ✅ Done |
| PS-2 | The user must be able to select multiple photos by drawing a freeform shape (lasso) on the map. | Must Have | ✅ Done |
| PS-3 | The user must be able to clear the current selection.                                           | Must Have | ✅ Done |
| PS-4 | The current number of selected photos must always be visible.                                   | Must Have | ✅ Done |

### 5.5 File Operations

| ID    | Requirement                                                                                                                       | Priority    | Status  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------- |
| FO-1  | The user must be able to copy selected photos to a destination folder.                                                            | Must Have   | ✅ Done |
| FO-2  | The user must be able to move selected photos to a destination folder.                                                            | Must Have   | ✅ Done |
| FO-3  | Before any file operation executes, the user must see a preview of what will happen (source → destination for each file).         | Must Have   | ✅ Done |
| FO-4  | The application must never overwrite an existing file at the destination without explicit user action.                            | Must Have   | ✅ Done |
| FO-5  | If a file operation fails partway through a batch, all completed files in that batch must be rolled back to their original state. | Must Have   | ✅ Done |
| FO-6  | The user must see real-time progress during file operations (which file, how many remaining).                                     | Must Have   | ✅ Done |
| FO-7  | The user must be able to undo a completed copy or move operation.                                                                 | Must Have   | ✅ Done |
| FO-8  | Undo of a copy operation should send copied files to the OS trash (recoverable).                                                  | Should Have | ✅ Done |
| FO-9  | Undo of a move operation must restore files to their original location.                                                           | Must Have   | ✅ Done |
| FO-10 | After a move operation, the application's database must reflect the new file locations.                                           | Must Have   | ✅ Done |

### 5.6 Settings and Customization

| ID   | Requirement                                                                           | Priority    | Status  |
| ---- | ------------------------------------------------------------------------------------- | ----------- | ------- |
| SC-1 | The user must be able to switch between light and dark appearance modes.              | Must Have   | ✅ Done |
| SC-2 | The user must be able to manage storage (view database size, clear thumbnail cache).  | Must Have   | ✅ Done |
| SC-3 | The user must be able to see the current application version and project information. | Must Have   | ✅ Done |
| SC-4 | Map display settings (clustering behavior, map style) should be configurable.         | Should Have | ✅ Done |
| SC-5 | Timeline playback settings (speed, auto-zoom) should be configurable.                 | Should Have | ✅ Done |
| SC-6 | All user settings must persist across application sessions.                           | Must Have   | ✅ Done |

---

## 6. Non-Functional Requirements

### 6.1 Privacy

| ID    | Requirement                                                                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NF-P1 | The application must not transmit any photo data, metadata, or user information to any server. The only permitted network traffic is downloading map tiles. |
| NF-P2 | All indexed metadata and cached thumbnails must be stored locally on the user's device.                                                                     |
| NF-P3 | The application must not include telemetry, analytics, crash reporting, or any form of usage tracking.                                                      |
| NF-P4 | If cloud storage integration (e.g., OneDrive) is used, authentication tokens must be stored securely using OS-level secure storage.                         |

### 6.2 Performance

| ID    | Requirement                                                                                  |
| ----- | -------------------------------------------------------------------------------------------- |
| NF-E1 | The application must launch in under 3 seconds on a standard machine.                        |
| NF-E2 | Scanning 10,000 local photos must complete in under 30 seconds.                              |
| NF-E3 | The map must render 10,000 markers with clustering without perceptible lag.                  |
| NF-E4 | Filtering 10,000 photos by geographic bounds and/or date range must complete in under 100ms. |
| NF-E5 | The application must handle libraries of 100,000+ photos without degrading usability.        |
| NF-E6 | Memory usage should stay under 500MB even with large datasets.                               |

### 6.3 Reliability

| ID    | Requirement                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| NF-R1 | File operations must be atomic at the batch level — partial completion must not leave the filesystem in an inconsistent state. |
| NF-R2 | The application must handle missing, moved, or inaccessible source folders gracefully with clear error messages.               |
| NF-R3 | Network disconnection during network-share access must not crash the application or corrupt the database.                      |
| NF-R4 | The local database must be rebuildable at any time by re-scanning source folders (no single point of data loss).               |

### 6.4 Usability

| ID    | Requirement                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| NF-U1 | The application must be usable immediately without account creation, login, or configuration.                                |
| NF-U2 | Error messages must be written for end users, not developers (e.g., "Cannot access folder: permission denied" not "EACCES"). |
| NF-U3 | All destructive or irreversible actions must require explicit user confirmation.                                             |
| NF-U4 | The interface must feel calm and uncluttered — prioritize focus over feature density.                                        |

### 6.5 Portability

| ID    | Requirement                                                                                                                 |
| ----- | --------------------------------------------------------------------------------------------------------------------------- |
| NF-T1 | The application must run on Windows 10/11 (64-bit).                                                                         |
| NF-T2 | The application should run on macOS (Intel and Apple Silicon).                                                              |
| NF-T3 | The application must be available as a portable executable (no installation required).                                      |
| NF-T4 | Application data (database, cache) must be stored alongside the executable in portable mode, not in a system-wide location. |
| NF-T5 | The architecture should allow future mobile ports (iOS/Android) to reuse core logic.                                        |

---

## 7. Out of Scope

The following are explicitly **not** requirements for Placemark:

- **Photo editing** (cropping, rotating, color adjustment)
- **AI-powered tagging or recognition** (face detection, object classification)
- **Cloud sync** between devices
- **Social or sharing features** (galleries, links, exports to social media)
- **Photo format conversion**
- **Automatic background scanning** or scheduled processing
- **Multi-user or collaboration** features
- **Server-side components** of any kind (Placemark is a standalone desktop application)

---

## 8. User Scenarios

### Scenario A: "Where was that restaurant?"

A user remembers dining at a great restaurant during a trip to Lisbon but can't recall the name. They open Placemark, scan their photos folder, zoom into Lisbon on the map, and filter to the dates of their trip. A cluster of photos appears near a street corner — hovering over them reveals the restaurant's exterior. The user opens the photo in their system viewer and zooms into the sign.

### Scenario B: "Organize vacation photos"

A user has 800 photos from a road trip scattered across one large folder. They want to sort them by city visited. They open Placemark, scan the folder, and zoom into the first city on the map. Using the lasso tool, they select photos within that city, then use the copy operation to place them in a "Barcelona" folder. They repeat for each city. At all times, they see exactly which files will be copied and where.

### Scenario C: "What did we do last summer?"

A user scans their entire Pictures directory (50,000 photos). They drag the timeline slider to June–August of last year. The map lights up with clusters in three locations — their hometown, a beach vacation, and a weekend trip they'd forgotten about. They click through the clusters to relive each location's photos.

### Scenario D: "Move photos off the NAS"

A user has photos on a network-attached storage device. They add the NAS share as a source, scan it, and use the move operation to bring selected photos to their local drive. The preview shows each file's source and destination. After confirming, progress updates show each file being transferred. If the network drops mid-operation, completed transfers roll back and the user receives a clear error message.

---

## 9. Success Criteria

Placemark is successful when a user can:

1. **Discover** — Point it at a folder and immediately see their photos on a map.
2. **Explore** — Pan, zoom, and filter by time to find photos from a specific place or period.
3. **Act** — Select photos and copy or move them to organized folders, with full confidence that nothing will be lost or overwritten.
4. **Trust** — Know that their photos and metadata never leave their device.

---

## 10. Glossary

| Term                  | Definition                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| **EXIF**              | Exchangeable Image File Format — metadata embedded in photo files, including GPS coordinates and timestamps. |
| **Geotagged**         | A photo that contains GPS latitude and longitude in its EXIF metadata.                                       |
| **Source**            | A folder (local or network) that the user has registered for scanning.                                       |
| **Cluster**           | A visual grouping of nearby photo markers on the map, showing a count instead of individual pins.            |
| **Lasso selection**   | A freeform drawing tool that selects all photos within the drawn shape.                                      |
| **Dry run / Preview** | Showing the user what a file operation would do before actually executing it.                                |
| **Atomic batch**      | A group of file operations that either all succeed or all fail — no partial completion.                      |
| **Portable mode**     | Running the application without installation, with all data stored next to the executable.                   |
