# Placemark — Project Goals

Placemark is a privacy-first, local-first application that allows users to explore and organize their photos by where and when they were taken.

The core idea is to treat geographic location and time as explicit, user-controlled lenses on personal photo collections, without uploading photos or derived data to third-party servers.

## Primary Goals

- Allow users to visualize photos on a map based on EXIF GPS metadata.
- Support multiple photo sources:
  - OneDrive (via Microsoft Graph, read-only by default)
  - Local folders
  - Network-mounted folders
- Enable filtering by both geographic area and date window.
- Store all derived metadata locally on the user’s device.
- Avoid background processing, inference, or tracking by default.
- Be transparent, predictable, and reversible in all operations.

## Secondary Goals

- Enable optional file operations (copy/move) based on geographic and temporal selection.
- Keep infrastructure costs near zero by avoiding backend services.
- Maintain a single shared logic core across platforms.

## Non-Goals

- No social features.
- No cloud storage of photos or metadata.
- No automatic inference of locations unless explicitly enabled.
- No user accounts beyond platform authentication (e.g., OneDrive OAuth).

Placemark is a tool, not a service.
