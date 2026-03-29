import { describe, it, expect } from 'vitest';
import { toCsv, toGeoJson, toGpx } from './formatters';
import type { Photo } from '../models/Photo';

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    id: 1,
    source: 'local',
    path: 'C:\\Photos\\Tokyo\\IMG_0001.jpg',
    latitude: 35.6762,
    longitude: 139.6503,
    timestamp: new Date('2024-03-15T10:30:00Z').getTime(),
    fileHash: null,
    scannedAt: Date.now(),
    fileSize: 4_500_000,
    mimeType: 'image/jpeg',
    cameraMake: 'Canon',
    cameraModel: 'EOS R5',
    cloudItemId: null,
    cloudFolderPath: null,
    cloudSha256: null,
    cloudWebUrl: null,
    cloudFolderWebUrl: null,
    ...overrides,
  };
}

const noGps = makePhoto({ id: 2, latitude: null, longitude: null, path: 'C:\\Photos\\noGps.jpg' });
const noTimestamp = makePhoto({ id: 3, timestamp: null, path: 'C:\\Photos\\noTs.jpg' });
const specialChars = makePhoto({
  id: 4,
  path: 'C:\\Photos\\Trip, 2024\\my "best" photo.jpg',
  cameraMake: 'Sony & Co',
});

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

describe('toCsv', () => {
  it('produces a header row', () => {
    const output = toCsv([]);
    expect(output.split('\r\n')[0]).toBe(
      'filename,date_iso,latitude,longitude,camera_make,camera_model,folder_path'
    );
  });

  it('includes one data row per GPS photo', () => {
    const photo = makePhoto();
    const lines = toCsv([photo]).split('\r\n');
    expect(lines).toHaveLength(2); // header + 1 row
  });

  it('omits photos without GPS', () => {
    const lines = toCsv([noGps]).split('\r\n');
    expect(lines).toHaveLength(1); // header only
  });

  it('uses empty string for null timestamp', () => {
    const lines = toCsv([noTimestamp]).split('\r\n');
    const row = lines[1].split(',');
    expect(row[1]).toBe(''); // date_iso column
  });

  it('quotes cells containing commas', () => {
    const output = toCsv([specialChars]);
    // folder path contains comma → must be quoted
    expect(output).toContain('"C:\\Photos\\Trip, 2024"');
  });

  it('quotes cells containing double-quotes and escapes them', () => {
    const output = toCsv([specialChars]);
    // filename contains double-quotes → must be wrapped and inner quotes doubled
    expect(output).toContain('"my ""best"" photo.jpg"');
  });

  it('outputs correct coordinate values', () => {
    const photo = makePhoto({ latitude: 48.8566, longitude: 2.3522 });
    const lines = toCsv([photo]).split('\r\n');
    const cols = lines[1].split(',');
    expect(cols[2]).toBe('48.8566');
    expect(cols[3]).toBe('2.3522');
  });
});

// ---------------------------------------------------------------------------
// GeoJSON
// ---------------------------------------------------------------------------

describe('toGeoJson', () => {
  it('produces a FeatureCollection', () => {
    const obj = JSON.parse(toGeoJson([]));
    expect(obj.type).toBe('FeatureCollection');
    expect(obj.features).toEqual([]);
  });

  it('creates one Feature per GPS photo', () => {
    const obj = JSON.parse(toGeoJson([makePhoto(), makePhoto({ id: 2, path: 'C:\\b.jpg' })]));
    expect(obj.features).toHaveLength(2);
  });

  it('omits photos without GPS', () => {
    const obj = JSON.parse(toGeoJson([noGps]));
    expect(obj.features).toHaveLength(0);
  });

  it('uses [longitude, latitude] coordinate order (RFC 7946)', () => {
    const photo = makePhoto({ latitude: 35.6762, longitude: 139.6503 });
    const obj = JSON.parse(toGeoJson([photo]));
    const coords = obj.features[0].geometry.coordinates;
    expect(coords[0]).toBe(139.6503); // longitude first
    expect(coords[1]).toBe(35.6762); // latitude second
  });

  it('stores filename and path in properties', () => {
    const obj = JSON.parse(toGeoJson([makePhoto()]));
    const props = obj.features[0].properties;
    expect(props.filename).toBe('IMG_0001.jpg');
    expect(props.path).toBe('C:\\Photos\\Tokyo\\IMG_0001.jpg');
  });

  it('stores null for missing timestamp', () => {
    const obj = JSON.parse(toGeoJson([noTimestamp]));
    expect(obj.features[0].properties.date).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------

describe('toGpx', () => {
  it('produces valid GPX envelope', () => {
    const output = toGpx([]);
    expect(output).toContain('<?xml version="1.0"');
    expect(output).toContain('<gpx version="1.1"');
    expect(output).toContain('</gpx>');
  });

  it('omits photos without GPS', () => {
    const output = toGpx([noGps]);
    expect(output).not.toContain('<wpt');
  });

  it('creates one <wpt> per GPS photo', () => {
    const output = toGpx([makePhoto(), makePhoto({ id: 2, path: 'C:\\b.jpg' })]);
    const matches = output.match(/<wpt /g);
    expect(matches).toHaveLength(2);
  });

  it('uses correct latitude and longitude attributes', () => {
    const output = toGpx([makePhoto({ latitude: 51.5074, longitude: -0.1278 })]);
    expect(output).toContain('lat="51.5074"');
    expect(output).toContain('lon="-0.1278"');
  });

  it('includes ISO timestamp in <time> tag', () => {
    const output = toGpx([makePhoto()]);
    expect(output).toContain('<time>2024-03-15T10:30:00.000Z</time>');
  });

  it('omits <time> tag when timestamp is null', () => {
    const output = toGpx([noTimestamp]);
    expect(output).not.toContain('<time>');
  });

  it('escapes XML special characters in filename', () => {
    const photo = makePhoto({ path: 'C:\\Photos\\Café & More\\photo<1>.jpg' });
    const output = toGpx([photo]);
    expect(output).toContain('photo&lt;1&gt;.jpg');
    expect(output).not.toContain('photo<1>');
  });

  it('sorts waypoints chronologically, nulls last', () => {
    const early = makePhoto({ id: 1, path: 'C:\\a.jpg', timestamp: 1_000_000 });
    const late = makePhoto({ id: 2, path: 'C:\\b.jpg', timestamp: 3_000_000 });
    const noTs = makePhoto({ id: 3, path: 'C:\\c.jpg', timestamp: null });
    const output = toGpx([noTs, late, early]);
    const firstWpt = output.indexOf('a.jpg');
    const secondWpt = output.indexOf('b.jpg');
    const thirdWpt = output.indexOf('c.jpg');
    expect(firstWpt).toBeLessThan(secondWpt);
    expect(secondWpt).toBeLessThan(thirdWpt);
  });
});
