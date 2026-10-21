/**
 * Following a route ([[lng, lat], ...]) with a GPS position, in metres.
 * Mirrors backend/src/utils/routeMath.js.
 */
const EARTH_M = 6371000;
const rad = (deg) => (deg * Math.PI) / 180;

function toXY(p, origin) {
  return [rad(p[0] - origin[0]) * Math.cos(rad(origin[1])) * EARTH_M, rad(p[1] - origin[1]) * EARTH_M];
}

export function metres(a, b) {
  const [x, y] = toXY(b, a);
  return Math.hypot(x, y);
}

/** Nearest point on the route, how far off it, distance travelled and left. */
export function locateOnRoute(point, geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2) {
    return { offRouteM: Infinity, travelledM: 0, remainingM: 0, totalM: 0 };
  }
  let best = { dist: Infinity, segment: 0, t: 0 };
  const lengths = [];
  for (let i = 0; i < geometry.length - 1; i += 1) {
    const a = geometry[i];
    const [bx, by] = toXY(geometry[i + 1], a);
    const [px, py] = toXY(point, a);
    const len2 = bx * bx + by * by;
    lengths.push(Math.sqrt(len2));
    const t = len2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
    const dist = Math.hypot(px - t * bx, py - t * by);
    if (dist < best.dist) best = { dist, segment: i, t };
  }
  const totalM = lengths.reduce((sum, len) => sum + len, 0);
  const travelledM = lengths.slice(0, best.segment).reduce((sum, len) => sum + len, 0) + lengths[best.segment] * best.t;
  return { offRouteM: best.dist, travelledM, remainingM: Math.max(0, totalM - travelledM), totalM };
}

/**
 * The next turn ahead of the rider: the first step whose maneuver point is
 * further along the route than they are, and how far away it is.
 */
export function nextStep(point, geometry, steps = []) {
  const here = locateOnRoute(point, geometry);
  for (const step of steps) {
    if (!step.maneuver?.location || step.maneuver.type === 'depart') continue;
    const at = locateOnRoute(step.maneuver.location, geometry).travelledM;
    if (at > here.travelledM + 5) return { step, distanceM: at - here.travelledM, here };
  }
  return { step: steps[steps.length - 1] || null, distanceM: here.remainingM, here };
}

export const formatDistance = (m) =>
  m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${Math.max(0, Math.round(m / 10) * 10)} m`;

export const formatMinutes = (s) => {
  const min = Math.max(1, Math.round(s / 60));
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
};
