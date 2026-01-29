export interface Point {
  x: number;
  y: number;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param point The point to check {x, y}
 * @param vs The vertices of the polygon [{x, y}, ...]
 */
export function isPointInPolygon(point: Point, vs: Point[]): boolean {
  // ray-casting algorithm based on
  // https://github.com/substack/point-in-polygon

  const x = point.x,
    y = point.y;

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x,
      yi = vs[i].y;
    const xj = vs[j].x,
      yj = vs[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get the bounding box of a polygon
 * @param points The vertices of the polygon
 * @returns The bounding box { minX, minY, maxX, maxY }
 */
export function getPolygonBounds(points: Point[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (points.length === 0) return null;

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  // Add small padding for robustness
  return { minX, minY, maxX, maxY };
}
