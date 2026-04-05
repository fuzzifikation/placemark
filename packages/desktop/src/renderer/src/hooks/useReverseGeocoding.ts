/**
 * useReverseGeocoding — lazily fetches human-readable location labels for saved
 * placemarks using a main-process IPC bridge to Nominatim.
 *
 * Usage policy: one request per second maximum. Labels are fetched once per
 * placemark ID and cached in component state for the lifetime of the panel.
 *
 * Only the center coordinate of saved bounds is sent — no photo data or PII.
 */

import { useState, useRef, useEffect } from 'react';
import type { PlacemarkWithCount } from '../types/preload.d';

/**
 * Returns a Map<placemarkId, geoLabel> for all placemarks with saved bounds.
 * Labels accumulate as network responses arrive.
 *
 * @param onLabelPersisted - called after each label is written to the DB so the
 *   caller can refresh the placemarks list and keep in-memory state in sync.
 */
export function useReverseGeocoding(
  placemarks: PlacemarkWithCount[],
  enabled: boolean,
  onLabelPersisted?: () => void
): Map<number, string> {
  const [geoLabels, setGeoLabels] = useState<Map<number, string>>(new Map());
  const fetchedIdsRef = useRef<Set<number>>(new Set());
  const inFlightIdsRef = useRef<Set<number>>(new Set());
  const onLabelPersistedRef = useRef(onLabelPersisted);
  onLabelPersistedRef.current = onLabelPersisted;

  useEffect(() => {
    // Seed from persisted labels and mark as already fetched.
    const persisted = placemarks.filter((p) => typeof p.geoLabel === 'string' && p.geoLabel.trim());
    if (persisted.length > 0) {
      setGeoLabels((prev) => {
        const next = new Map(prev);
        for (const p of persisted) {
          next.set(p.id, (p.geoLabel as string).trim());
          fetchedIdsRef.current.add(p.id);
        }
        return next;
      });
    }

    if (!enabled) return;
    const toFetch = placemarks.filter(
      (p) =>
        p.bounds !== null &&
        !(typeof p.geoLabel === 'string' && p.geoLabel.trim()) &&
        !fetchedIdsRef.current.has(p.id) &&
        !inFlightIdsRef.current.has(p.id)
    );
    if (toFetch.length === 0) return;

    // Reserve all queued IDs immediately to avoid duplicate scheduling across re-renders.
    toFetch.forEach((p) => inFlightIdsRef.current.add(p.id));

    let cancelled = false;

    const run = async () => {
      for (let i = 0; i < toFetch.length; i++) {
        if (cancelled) return;
        const p = toFetch[i];

        const lat = ((p.bounds!.north + p.bounds!.south) / 2).toFixed(4);
        const lng = ((p.bounds!.east + p.bounds!.west) / 2).toFixed(4);

        try {
          let resolved = false;
          for (let attempt = 0; attempt < 3 && !resolved; attempt++) {
            if (cancelled) return;
            const label = await window.api.system.reverseGeocode(Number(lat), Number(lng));
            if (label && !cancelled) {
              await window.api.placemarks.setGeoLabel(p.id, label);
              setGeoLabels((prev) => new Map(prev).set(p.id, label));
              resolved = true;
              fetchedIdsRef.current.add(p.id);
              onLabelPersistedRef.current?.();
            }

            if (!resolved && attempt < 2) {
              await new Promise((r) => setTimeout(r, 1100));
            }
          }
        } catch {
          // Network unavailable or API error — silently degrade, no label shown
        } finally {
          inFlightIdsRef.current.delete(p.id);
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
