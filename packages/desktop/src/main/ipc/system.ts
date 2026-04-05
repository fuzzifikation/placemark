import { ipcMain, shell, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
}

/** Nominatim usage policy requires max 1 request per second. Serialize all calls. */
const GEOCODE_MIN_INTERVAL_MS = 1100;
let geocodeQueue: Promise<string | null> = Promise.resolve(null);

function buildGeoLabel(address: NominatimAddress, displayName?: string): string | null {
  const place =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.state;

  if (place && address.country) return `${place}, ${address.country}`;
  if (place) return place;
  if (address.country) return address.country;
  if (displayName && displayName.trim().length > 0) {
    return displayName.split(',').slice(0, 2).join(',').trim();
  }
  return null;
}

export function registerSystemHandlers() {
  ipcMain.handle('system:openExternal', async (_event, url: string) => {
    // Basic security check: only allow http/https
    if (url.startsWith('http://') || url.startsWith('https://')) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('system:openAppDataFolder', async () => {
    const appDataPath = process.env.PORTABLE_EXECUTABLE_DIR
      ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'placemark_data')
      : app.getPath('userData');

    await shell.openPath(appDataPath);
  });

  ipcMain.handle('system:getAppVersion', async () => {
    return app.getVersion();
  });

  ipcMain.handle('system:getSystemLocale', async () => {
    // Returns the OS regional-format locale (e.g. 'de-DE' even when
    // the display language is 'en-US').  Available since Electron 21.
    return app.getSystemLocale();
  });

  ipcMain.handle('system:reverseGeocode', async (_event, lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    // Serialize all geocode requests to enforce rate limit even under concurrent IPC calls
    const result = geocodeQueue.then(async () => {
      await new Promise((resolve) => setTimeout(resolve, GEOCODE_MIN_INTERVAL_MS));
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&format=json&zoom=10`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': `Placemark/${app.getVersion()} (desktop local reverse geocoding)`,
            },
          }
        );
        if (!res.ok) return null;

        const data = (await res.json()) as { address?: NominatimAddress; display_name?: string };
        if (!data || typeof data !== 'object') return null;

        const address =
          data.address && typeof data.address === 'object'
            ? (data.address as NominatimAddress)
            : {};
        return buildGeoLabel(address, data.display_name);
      } catch {
        return null;
      }
    });
    geocodeQueue = result;
    return result;
  });

  ipcMain.handle('system:checkVersionStamp', () => {
    const current = app.getVersion();
    const stampPath = path.join(app.getPath('userData'), 'version.txt');
    let stored: string | null = null;
    try {
      stored = fs.readFileSync(stampPath, 'utf8').trim();
    } catch {
      // No stamp yet — first run. Write it now so next launch has a baseline.
      try {
        fs.mkdirSync(path.dirname(stampPath), { recursive: true });
        fs.writeFileSync(stampPath, current, 'utf8');
      } catch {
        // Non-fatal
      }
    }
    const mismatch = stored !== null && stored !== current;
    return { current, stored, mismatch };
  });

  ipcMain.handle('system:acceptVersionStamp', () => {
    const stampPath = path.join(app.getPath('userData'), 'version.txt');
    try {
      fs.mkdirSync(path.dirname(stampPath), { recursive: true });
      fs.writeFileSync(stampPath, app.getVersion(), 'utf8');
    } catch {
      // Non-fatal
    }
  });

  ipcMain.handle('system:wipeAndRestart', async () => {
    const userDataPath = app.getPath('userData');
    // Close DB connections before deleting (Windows locks open files)
    const { closeStorage } = await import('../services/storage');
    const { closeThumbnailService } = await import('./photos');
    closeStorage();
    closeThumbnailService();
    // Delete database files (including WAL/SHM journal files)
    for (const dbFile of [
      'placemark.db',
      'placemark.db-wal',
      'placemark.db-shm',
      'thumbnails.db',
      'thumbnails.db-wal',
      'thumbnails.db-shm',
    ]) {
      try {
        fs.unlinkSync(path.join(userDataPath, dbFile));
      } catch {
        // File may not exist yet — that's fine
      }
    }
    // Write fresh version stamp
    try {
      fs.writeFileSync(path.join(userDataPath, 'version.txt'), app.getVersion(), 'utf8');
    } catch {
      // Non-fatal
    }
    // Relaunch the app cleanly
    app.relaunch();
    app.exit(0);
  });
}
