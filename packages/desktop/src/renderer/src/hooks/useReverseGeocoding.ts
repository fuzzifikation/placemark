/**
 * useReverseGeocoding — lazily fetches human-readable location labels for saved
 * placemarks using the Nominatim API (OpenStreetMap).
 *
 * Usage policy: one request per second maximum. Labels are fetched once per
 * placemark ID and cached in component state for the lifetime of the panel.
 *
 * Only the center coordinate of saved bounds is sent — no photo data or PII.
 */

import { useState, useRef, useEffect } from 'react';
import type { PlacemarkWithCount } from '../types/preload.d';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
}

function buildGeoLabel(addr: NominatimAddress): string {
  const place =
    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? addr.state;
  if (place && addr.country) return `${place}, ${addr.country}`;
  if (place) return place;
  return addr.country ?? '';
}

/**
 * Returns a Map<placemarkId, geoLabel> for all placemarks with saved bounds.
 * Labels accumulate as network responses arrive.
 */
export function useReverseGeocoding(
  placemarks: PlacemarkWithCount[],
  enabled: boolean
): Map<number, string> {
  const [geoLabels, setGeoLabels] = useState<Map<number, string>>(new Map());
  const fetchedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    const toFetch = placemarks.filter((p) => p.bounds !== null && !fetchedIdsRef.current.has(p.id));
    if (toFetch.length === 0) return;

    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < toFetch.length; i++) {
        if (cancelled) return;
        const p = toFetch[i];
        fetchedIdsRef.current.add(p.id);

        const lat = ((p.bounds!.north + p.bounds!.south) / 2).toFixed(4);
        const lng = ((p.bounds!.east + p.bounds!.west) / 2).toFixed(4);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (!res.ok) continue;
          const data = await res.json();
          if (typeof data.address !== 'object' || data.address === null) continue;
          const label = buildGeoLabel(data.address as NominatimAddress);
          if (label && !cancelled) {
            setGeoLabels((prev) => new Map(prev).set(p.id, label));
          }
        } catch {
          // Network unavailable or API error — silently degrade, no label shown
        }

        // Nominatim usage policy: max 1 request per second
        if (i < toFetch.length - 1) {
          await new Promise((r) => setTimeout(r, 1100));
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [placemarks, enabled]);

  return geoLabels;
}
