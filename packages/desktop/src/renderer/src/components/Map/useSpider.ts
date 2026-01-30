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

// Default configuration
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

/**
 * Fallback: Finds overlapping photos using degree-based comparison.
 * Used only when pixel-based finder is not provided.
 * @internal
 */
function findOverlappingPhotos(
  targetPhoto: Photo,
  photos: Photo[],
  tolerance: number = DEFAULT_CONFIG.overlapTolerance
): Photo[] {
  if (targetPhoto.latitude == null || targetPhoto.longitude == null) return [];

  return photos.filter((p) => {
    if (p.latitude == null || p.longitude == null) return false;
    const latDiff = Math.abs(p.latitude - targetPhoto.latitude!);
    const lngDiff = Math.abs(p.longitude - targetPhoto.longitude!);
    return latDiff < tolerance && lngDiff < tolerance;
  });
}

/**
 * Calculate spider offsets for a set of photos arranged in a circle
 * @param photos - Photos to spider
 * @param center - Center point [lng, lat]
 * @param progress - Animation progress 0-1
 * @param radiusPixels - Radius in pixels
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
  const count = photos.length;

  // Get radius in degrees - if no converter, use a fallback approximation
  let lngRadius: number;
  let latRadius: number;

  if (converter) {
    const degreeOffsets = converter(center, radiusPixels * progress);
    lngRadius = degreeOffsets.lngOffset;
    latRadius = degreeOffsets.latOffset;
  } else {
    // Fallback: approximate 1 pixel ≈ 0.00001 degrees at high zoom
    // This is only used if no converter is provided
    const fallbackRadius = radiusPixels * progress * 0.00001;
    lngRadius = fallbackRadius;
    latRadius = fallbackRadius;
  }

  photos.forEach((photo, i) => {
    if (photo.latitude == null || photo.longitude == null) return;

    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    const offsetLng = center[0] + lngRadius * Math.cos(angle);
    const offsetLat = center[1] + latRadius * Math.sin(angle);

    offsets.set(photo.id, {
      photoId: photo.id,
      originalLng: photo.longitude,
      originalLat: photo.latitude,
      offsetLng,
      offsetLat,
    });
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

      // Find overlapping photos using pixel-based detection if available
      let overlapping: Photo[];
      if (findOverlappingRef.current) {
        overlapping = findOverlappingRef.current(clickedPhoto, configRef.current.overlapTolerance);
      } else {
        // Fallback to degree-based detection (less accurate)
        overlapping = findOverlappingPhotos(
          clickedPhoto,
          photosRef.current,
          configRef.current.overlapTolerance * 0.00001 // Convert pixels to approximate degrees
        );
      }

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

  /**
   * Handle click on a spider point - just forwards to onPhotoClick
   */
  const handleSpiderPointClick = useCallback(
    (photoId: number) => {
      const photo = photosRef.current.find((p) => p.id === photoId);
      if (photo && onPhotoClick) {
        onPhotoClick(photo);
      }
      // Clear spider after clicking
      setSpiderState(null);
    },
    [onPhotoClick]
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
    handleSpiderPointClick,
    isSpiderActive: spiderState !== null,
  };
}
