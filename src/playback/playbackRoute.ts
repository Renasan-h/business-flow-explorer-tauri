export type RoutePoint = { x: number; y: number };

/** 折れ線の全長に対する進捗から、描画線上の座標を求める。 */
export function pointAlongRoute(points: RoutePoint[], progress: number): RoutePoint {
 const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i].x, point.y - points[i].y));
 let remaining = lengths.reduce((sum, length) => sum + length, 0) * Math.max(0, Math.min(1, progress));
 for (let i = 0; i < lengths.length; i++) {
  const length = lengths[i];
  if (length === 0) continue;
  if (remaining <= length) {
   const ratio = remaining / length;
   return { x: points[i].x + (points[i + 1].x - points[i].x) * ratio, y: points[i].y + (points[i + 1].y - points[i].y) * ratio };
  }
  remaining -= length;
 }
 return points[points.length - 1] ?? { x: 0, y: 0 };
}

/** 線はそのまま描画し、マーカーだけ両端から半径分離す。短い経路は中央に留める。 */
export function markerAlongRoute(points: RoutePoint[], progress: number, radius = 12): RoutePoint {
 const total = points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - points[i].x, point.y - points[i].y), 0);
 if (total === 0) return pointAlongRoute(points, progress);
 const inset = Math.min(Math.max(0, radius), total / 2);
 return pointAlongRoute(points, (inset + (total - 2 * inset) * Math.max(0, Math.min(1, progress))) / total);
}
