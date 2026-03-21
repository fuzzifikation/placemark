import { ipcMain, shell, app } from 'electron';
import * as path from 'path';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
}

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
        data.address && typeof data.address === 'object' ? (data.address as NominatimAddress) : {};
      return buildGeoLabel(address, data.display_name);
    } catch {
      return null;
    }
  });
}
