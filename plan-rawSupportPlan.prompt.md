# Phase 5.5 — RAW Photo Format Support

**TL;DR:** Add support for 12 RAW camera formats (CR2, CR3, NEF, NRW, ARW, DNG, RAF, ORF, RW2, PEF, SRW, RWL) by extending three service files in the desktop package. No new dependencies needed — `exifr` already reads EXIF/GPS from TIFF-based RAW files and extracts embedded JPEG thumbnails; `sharp` resizes those extracted JPEGs into 400×400 thumbnails. No changes to the core package, database schema, IPC handlers, or renderer components are required.

## Steps

### 1. Add RAW format constants

Create a new file `packages/desktop/src/main/services/formats.ts` to centralize all format definitions (currently scattered across `exif.ts` and `filesystem.ts`). Define:

- `STANDARD_IMAGE_EXTENSIONS`: `['jpg', 'jpeg', 'png', 'heic', 'heif', 'tiff', 'tif', 'webp']`
- `RAW_IMAGE_EXTENSIONS`: `['cr2', 'cr3', 'nef', 'nrw', 'arw', 'dng', 'raf', 'orf', 'rw2', 'pef', 'srw', 'rwl']`
- `ALL_SUPPORTED_EXTENSIONS`: combined set
- `isRawFile(filePath)` helper — returns `true` if extension is in `RAW_IMAGE_EXTENSIONS`
- `isSupportedImageFile(filePath)` — returns `true` if extension is in `ALL_SUPPORTED_EXTENSIONS` (replaces current inline function in `exif.ts` lines 56–60)

### 2. Update MIME type mapping

In `packages/desktop/src/main/services/filesystem.ts` — Add RAW MIME types to the `MIME_TYPES` constant (lines 14–22):

| Extension | MIME Type               |
| --------- | ----------------------- |
| `.cr2`    | `image/x-canon-cr2`     |
| `.cr3`    | `image/x-canon-cr3`     |
| `.nef`    | `image/x-nikon-nef`     |
| `.nrw`    | `image/x-nikon-nrw`     |
| `.arw`    | `image/x-sony-arw`      |
| `.dng`    | `image/x-adobe-dng`     |
| `.raf`    | `image/x-fuji-raf`      |
| `.orf`    | `image/x-olympus-orf`   |
| `.rw2`    | `image/x-panasonic-rw2` |
| `.pef`    | `image/x-pentax-pef`    |
| `.srw`    | `image/x-samsung-srw`   |
| `.rwl`    | `image/x-leica-rwl`     |

Also fix the fallback at line 170 — change `MIME_TYPES[ext] || 'image/jpeg'` to `MIME_TYPES[ext] || 'application/octet-stream'` so unknown extensions don't silently get a wrong MIME type.

Import and use `isSupportedImageFile` from the new `formats.ts` instead of the one in `exif.ts`.

### 3. Update `isSupportedImageFile()` in `exif.ts`

Replace the inline implementation (lines 56–60) with a re-export from `formats.ts`. This avoids duplicate extension lists. The EXIF extraction functions (`extractGPS`, `extractTimestamp`) need no changes — `exifr.gps()` and `exifr.parse()` already work with file paths for TIFF-based RAW formats.

### 4. Update thumbnail generation

In `packages/desktop/src/main/services/thumbnails.ts` — This is the core change. Modify `generateThumbnail()` (around line 74–86):

- Import `isRawFile` from `formats.ts` and `exifr` (specifically `exifr.thumbnail`)
- Add a branching path before the `sharp()` call:
  - **If RAW file:** Read file path → call `exifr.thumbnail(filePath)` to extract the embedded JPEG preview → if successful, pass the JPEG `Buffer` to `sharp(buffer)` for resize → proceed with normal 400×400 JPEG output
  - **If standard image:** Keep existing `sharp(photoPath)` path unchanged
- Handle the case where `exifr.thumbnail()` returns `undefined` (no embedded thumbnail) — return `null` gracefully. The renderer already handles null thumbnails with a "Thumbnail not available" fallback in `PhotoPreviewModal.tsx` and `PhotoHoverPreview.tsx`.

**Important performance note:** For RAW files, `exifr.thumbnail()` is very fast — it only reads the bytes needed to locate and extract the embedded JPEG, not the full sensor data. Typical RAW files are 25–50MB but the embedded thumbnail is only ~50–200KB.

**CR3 risk:** Canon CR3 uses BMFF/ISO base media format (like HEIC), not TIFF. The `exifr` library supports HEIC parsing, so CR3 _should_ work — but this needs explicit testing (see Step 7). If `exifr` cannot extract CR3 thumbnails, the graceful fallback (return `null`) will apply, and a follow-up issue can investigate alternatives.

### 5. Increase chunk size for RAW EXIF parsing

RAW files have more complex headers than JPEG. In `exif.ts`, when calling `exifr.gps()` and `exifr.parse()` for RAW files, consider passing `{ firstChunkSize: 65536 }` (64KB instead of default 512B) to ensure the EXIF data is found in the first read. This is optional but recommended for reliability with larger RAW headers.

### 6. Update the 100MB file size limit check

Currently `MAX_FILE_SIZE` in `filesystem.ts` is 100MB. Professional RAW files (especially from medium format cameras like Fuji GFX or Hasselblad) can exceed 100MB. Increase to 150MB or make it configurable. Add a code comment explaining the rationale.

### 7. Testing strategy

Test with real RAW sample files from each brand:

- **Minimum:** CR2 (Canon), NEF (Nikon), ARW (Sony), DNG (Adobe/universal) — these cover the most common brands
- **Extended:** CR3, NRW, RAF, ORF, RW2, PEF, SRW, RWL
- For each: verify (a) EXIF GPS extraction works, (b) EXIF timestamp extraction works, (c) embedded thumbnail extraction works, (d) thumbnail resize to 400×400 JPEG succeeds
- Sample RAW files are available from [raw.pixls.us](https://raw.pixls.us/) (CC0 licensed)
- Add a manual test checklist in the PR description

### 8. Add unit tests for format helpers

Add tests in a new file `packages/desktop/src/main/services/formats.test.ts` (or in core if helpers are moved there):

- `isSupportedImageFile()` returns `true` for all 12 RAW extensions (case-insensitive)
- `isRawFile()` returns `true` for RAW, `false` for JPEG/PNG/etc.
- MIME type mapping returns correct types for all RAW extensions

### 9. Update documentation

- Update `docs/plan.md` — Mark Phase 5.5 as complete
- Update `docs/business_model.md` — Add RAW formats to the Store Description and Store SEO keywords (✅ done)
- Update `README.md` — Add RAW formats to the supported formats list
- Update `docs/RELEASE_NOTES.md` — Add entry for the new version
- Update `.github/copilot-instructions.md` — Update "Currently in Phase 5 Complete" to reflect Phase 5.5 completion

## Verification

1. Run `pnpm -C packages/core test` — all existing tests must pass (no core changes, but sanity check)
2. Run format helper unit tests — `isSupportedImageFile` and `isRawFile` for all extensions
3. Manual scan test: scan a folder containing a mix of JPEG + RAW files → verify all are discovered and indexed
4. Manual thumbnail test: click on a RAW photo in the map → verify thumbnail appears in preview modal
5. Manual EXIF test: verify GPS coordinates and timestamps are extracted from RAW files (photos appear on the map at correct locations)
6. Edge case: RAW file with no embedded thumbnail → verify "Thumbnail not available" fallback shows
7. Edge case: corrupted RAW file → verify scan continues without crashing
8. Build test: `pnpm -C packages/desktop build` succeeds without errors

## Decisions

- **No new dependencies:** `exifr` already handles RAW EXIF+thumbnail extraction; `sharp` handles JPEG resize. No `dcraw`, `libraw`, or `raw-loader` needed.
- **No database schema changes:** The existing `mime_type TEXT` column accommodates new RAW MIME types.
- **No core package changes:** Format constants stay in the desktop package since they relate to file I/O. If mobile needs them later (Phase 9+), they can be moved to core as pure constants.
- **No renderer changes:** The thumbnail display pipeline is format-agnostic — it receives JPEG blobs regardless of source format.
- **Graceful degradation:** If `exifr` can't extract a thumbnail from a particular RAW format, the photo is still indexed (GPS/timestamp extracted) — only the visual preview is missing.
- **Centralized format definitions:** Creating `formats.ts` eliminates the current duplication between `exif.ts` and `filesystem.ts`.

## RAW Formats Reference

| Extension(s) | Brand              | Container Format          | `exifr` Support  |
| ------------ | ------------------ | ------------------------- | ---------------- |
| `.cr2`       | Canon (older)      | TIFF-based                | ✅ Full          |
| `.cr3`       | Canon (newer)      | BMFF/ISO (like HEIC)      | ⚠️ Needs testing |
| `.nef`       | Nikon              | TIFF-based                | ✅ Full          |
| `.nrw`       | Nikon (consumer)   | TIFF-based                | ✅ Full          |
| `.arw`       | Sony               | TIFF-based                | ✅ Full          |
| `.dng`       | Adobe/Leica/Google | TIFF-based                | ✅ Full          |
| `.raf`       | Fujifilm           | Custom header + TIFF EXIF | ⚠️ Needs testing |
| `.orf`       | Olympus/OM System  | TIFF-based                | ✅ Full          |
| `.rw2`       | Panasonic/Lumix    | TIFF-based                | ✅ Full          |
| `.pef`       | Pentax/Ricoh       | TIFF-based                | ✅ Full          |
| `.srw`       | Samsung            | TIFF-based                | ✅ Full          |
| `.rwl`       | Leica              | TIFF-based                | ✅ Full          |

## Key Library APIs

### `exifr.thumbnail(file)` → `Promise<Buffer | Uint8Array | undefined>`

Extracts embedded JPEG thumbnail from any supported file. Only reads the minimum bytes needed. Returns `undefined` if no thumbnail is embedded. Accepts file path string or Buffer.

### `sharp(buffer)` constructor

Accepts `Buffer` containing JPEG data (the extracted thumbnail). Chain `.rotate().resize(400, 400, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()` for thumbnail generation.
