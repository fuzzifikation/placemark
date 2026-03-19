/**
 * useSpider hook - handles spiderfication of overlapping photos
 *
 * This hook manages the spider state which provides position offsets for photos.
 * The actual photo positions are modified in the main GeoJSON source, not rendered
 * as a separate overlay layer. This ensures clicks and hovers work naturally.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Photo } from '@placemark/core';
import type * as GeoJSON from 'geojson';

// Spider configuration interface (configurable from Settings)
export interface SpiderConfig {
  overlapTolerance: number; // Pixels - how close points must be visually to overlap
  radius: number; // Pixels - visual radius of spider circle on screen
  animationDuration: number; // ms
}

// Internal fallback - actual values come from Settings.DEFAULT_SETTINGS
const DEFAULT_CONFIG: SpiderConfig = {
  overlapTolerance: 20, // pixels
  radius: 60, // pixels
  animationDuration: 300,
};

// Function type for converting pixel distance to coordinate offset
// Given a center point and pixel radius, returns the radius in degrees longitude/latitude
export type PixelToDegreesConverter = (
  center: [number, number],
  pixelRadius: number
) => { lngOffset: number; latOffset: number };

// Position offset for a spidered photo
export interface SpiderOffset {
  photoId: number;
  originalLng: number;
  originalLat: number;
  offsetLng: number;
  offsetLat: number;
}

export interface SpiderState {
  center: [number, number]; // [lng, lat] - the original stack location
  photoIds: Set<number>; // IDs of photos being spidered
  offsets: Map<number, SpiderOffset>; // Photo ID -> offset info
  animationProgress: number; // 0 to 1
}

// Function type for finding overlapping photos in pixel space
export type FindOverlappingPhotosInPixels = (
  targetPhoto: Photo,
  tolerancePixels: number
) => Photo[];

interface UseSpiderOptions {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  config?: SpiderConfig;
  pixelToDegreesConverter?: PixelToDegreesConverter;
  findOverlappingPhotosInPixels?: FindOverlappingPhotosInPixels;
}

// Minimum pixel gap between adjacent markers on a ring (prevents visual overlap)
const MIN_MARKER_SPACING_PX = 22;

// Radius multipliers for concentric rings (sub-linear growth for visual balance)
const RING_RADIUS_MULTIPLIERS = [1, 1.7, 2.4, 3.1, 3.8];

/**
 * Assign photos to concentric rings based on capacity.
 * Each ring's capacity = floor(2π × ringRadius / MIN_MARKER_SPACING_PX).
 * Returns array of { radiusPx, count } per ring.
 */
function assignRings(
  totalCount: number,
  baseRadiusPx: number
): { radiusPx: number; count: number }[] {
  // Single photo: no ring needed, place at center offset
  if (totalCount <= 1) return [{ radiusPx: baseRadiusPx, count: totalCount }];

  const rings: { radiusPx: number; count: number }[] = [];
  let remaining = totalCount;

  for (const mult of RING_RADIUS_MULTIPLIERS) {
    const ringRadius = baseRadiusPx * mult;
    const capacity = Math.max(1, Math.floor((2 * Math.PI * ringRadius) / MIN_MARKER_SPACING_PX));
    const take = Math.min(capacity, remaining);
    rings.push({ radiusPx: ringRadius, count: take });
    remaining -= take;
    if (remaining <= 0) break;
  }

  // Overflow: any remaining photos go on the last ring
  if (remaining > 0) {
    rings[rings.length - 1].count += remaining;
  }

  return rings;
}

/**
 * Calculate spider offsets for a set of photos arranged in concentric rings.
 * Photos fill the innermost ring first, then spill onto outer rings.
 * Adjacent rings have a half-step angular offset to avoid radial alignment.
 * @param photos - Photos to spider
 * @param center - Center point [lng, lat]
 * @param progress - Animation progress 0-1
 * @param radiusPixels - Base radius in pixels (innermost ring)
 * @param converter - Function to convert pixels to degrees at the center point
 */
function calculateSpiderOffsets(
  photos: Photo[],
  center: [number, number],
  progress: number,
  radiusPixels: number,
  converter?: PixelToDegreesConverter
): Map<number, SpiderOffset> {
  const offsets = new Map<number, SpiderOffset>();
  const rings = assignRings(photos.length, radiusPixels);

  let photoIndex = 0;

  rings.forEach((ring, ringIndex) => {
    // Convert this ring's pixel radius to degrees
    let lngRadius: number;
    let latRadius: number;

    if (converter) {
      const degreeOffsets = converter(center, ring.radiusPx * progress);
      lngRadius = degreeOffsets.lngOffset;
      latRadius = degreeOffsets.latOffset;
    } else {
      const fallbackRadius = ring.radiusPx * progress * 0.00001;
      lngRadius = fallbackRadius;
      latRadius = fallbackRadius;
    }

    // Half-step angular offset on odd rings to stagger markers
    const angularOffset = ringIndex % 2 === 0 ? 0 : Math.PI / ring.count;

    for (let j = 0; j < ring.count; j++) {
      const photo = photos[photoIndex];
      if (!photo || photo.latitude == null || photo.longitude == null) {
        photoIndex++;
        continue;
      }

      const angle = (2 * Math.PI * j) / ring.count - Math.PI / 2 + angularOffset;
      const offsetLng = center[0] + lngRadius * Math.cos(angle);
      const offsetLat = center[1] + latRadius * Math.sin(angle);

      offsets.set(photo.id, {
        photoId: photo.id,
        originalLng: photo.longitude,
        originalLat: photo.latitude,
        offsetLng,
        offsetLat,
      });

      photoIndex++;
    }
  });

  return offsets;
}

/**
 * Apply spider offsets to a photo's coordinates
 * Returns [lng, lat] with offset applied if photo is spidered, otherwise original coords
 */
export function applySpiderOffset(photo: Photo, spiderState: SpiderState | null): [number, number] {
  if (!photo.longitude || !photo.latitude) {
    return [0, 0];
  }

  if (!spiderState || !spiderState.offsets.has(photo.id)) {
    return [photo.longitude, photo.latitude];
  }

  const offset = spiderState.offsets.get(photo.id)!;
  return [offset.offsetLng, offset.offsetLat];
}

/**
 * Check if a photo is currently being spidered
 */
export function isPhotoSpidered(photoId: number, spiderState: SpiderState | null): boolean {
  return spiderState?.photoIds.has(photoId) ?? false;
}

/**
 * Create line features for spider legs (connecting center to each offset point)
 */
export function createSpiderLegs(spiderState: SpiderState): GeoJSON.Feature[] {
  const legs: GeoJSON.Feature[] = [];

  spiderState.offsets.forEach((offset) => {
    legs.push({
      type: 'Feature' as const,
      properties: { isLeg: true },
      geometry: {
        type: 'LineString' as const,
        coordinates: [spiderState.center, [offset.offsetLng, offset.offsetLat]],
      },
    });
  });

  return legs;
}

export function useSpider({
  photos,
  onPhotoClick,
  config = DEFAULT_CONFIG,
  pixelToDegreesConverter,
  findOverlappingPhotosInPixels,
}: UseSpiderOptions) {
  const [spiderState, setSpiderState] = useState<SpiderState | null>(null);
  const animationRef = useRef<number | null>(null);
  const isCollapsingRef = useRef(false); // Track if we're in a collapse animation
  const photosRef = useRef(photos);
  const configRef = useRef(config);
  const converterRef = useRef(pixelToDegreesConverter);
  const findOverlappingRef = useRef(findOverlappingPhotosInPixels);

  // Keep refs updated
  useEffect(() => {
    photosRef.current = photos;
    converterRef.current = pixelToDegreesConverter;
    configRef.current = config;
    findOverlappingRef.current = findOverlappingPhotosInPixels;
  }, [photos, config, pixelToDegreesConverter, findOverlappingPhotosInPixels]);

  /**
   * Start spidering for a clicked point
   */
  const spiderAtPoint = useCallback(
    (clickedPhoto: Photo) => {
      // Clear any existing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      isCollapsingRef.current = false; // Reset collapsing flag when starting new spider

      if (clickedPhoto.latitude == null || clickedPhoto.longitude == null) return;

      // Find overlapping photos using pixel-based detection
      const overlapping = findOverlappingRef.current
        ? findOverlappingRef.current(clickedPhoto, configRef.current.overlapTolerance)
        : [];

      // If only one photo (no overlaps), just click it
      if (overlapping.length <= 1) {
        if (onPhotoClick) onPhotoClick(clickedPhoto);
        return;
      }

      const center: [number, number] = [clickedPhoto.longitude, clickedPhoto.latitude];
      const photoIds = new Set(overlapping.map((p) => p.id));

      // Animate the spider expanding
      const startTime = performance.now();
      const duration = configRef.current.animationDuration;
      const radiusPixels = configRef.current.radius;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        const offsets = calculateSpiderOffsets(
          overlapping,
          center,
          easedProgress,
          radiusPixels,
          converterRef.current
        );

        setSpiderState({
          center,
          photoIds,
          offsets,
          animationProgress: easedProgress,
        });

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [onPhotoClick]
  );

  /**
   * Clear the spider (with optional collapse animation)
   */
  const clearSpider = useCallback(
    (animate: boolean = true) => {
      if (!spiderState) return;

      // Prevent re-triggering if already collapsing
      if (isCollapsingRef.current) return;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }

      if (!animate) {
        isCollapsingRef.current = false;
        setSpiderState(null);
        return;
      }

      // Mark that we're collapsing to prevent re-triggering
      isCollapsingRef.current = true;

      // Animate collapsing - start from current progress, not from 1
      const { center, photoIds, animationProgress: startProgress } = spiderState;
      const spiderPhotos = photosRef.current.filter((p) => photoIds.has(p.id));
      const startTime = performance.now();
      // Scale duration based on how expanded we are (if partially expanded, collapse faster)
      const duration = (configRef.current.animationDuration / 2) * startProgress;
      const radiusPixels = configRef.current.radius;

      const animateCollapse = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        // Linear interpolation from startProgress to 0
        const currentProgress = Math.max(startProgress * (1 - elapsed / duration), 0);

        if (currentProgress <= 0.001) {
          isCollapsingRef.current = false;
          setSpiderState(null);
          return;
        }

        const offsets = calculateSpiderOffsets(
          spiderPhotos,
          center,
          currentProgress, // Use linear progress directly - no additional easing
          radiusPixels,
          converterRef.current
        );

        setSpiderState({
          center,
          photoIds,
          offsets,
          animationProgress: currentProgress,
        });

        animationRef.current = requestAnimationFrame(animateCollapse);
      };

      animationRef.current = requestAnimationFrame(animateCollapse);
    },
    [spiderState]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    spiderState,
    spiderAtPoint,
    clearSpider,
    isSpiderActive: spiderState !== null,
  };
}
