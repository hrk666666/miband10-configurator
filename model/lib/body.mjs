import { V, superellipseOutline, offsetOutline, spline, smoothstep, clamp } from "./mathx.mjs";
import { Mesh, loftRings, roundedRectPatch, capFan, lathe, roundedRectOutline } from "./mesh.mjs";

// ---- authoritative dimensions (mm) -------------------------------------------------
export const D = {
  L: 46.57, W: 22.54, T: 10.95,     // mi.com spec
  A: 23.285, B: 11.27,              // half extents
  SE: 2.79,                          // plan superellipse exponent, fitted to T06
  zFront: 5.475, zBack: -5.475,
  frameInset: 0.60,                  // visible metal ring from the front (R01)
  glassInset: 0.60,
  blackW: 21.33,                     // black glass width (R01)
  screenW: 16.49, screenH: 40.46,    // derived from 1.72in @ 212:520 (W across, H along length)
  screenHX: 20.23, screenHY: 8.245,  // half extents: X = length, Y = across
  screenR: 7.55,
  sensor: { cx: 0, cy: -2.5, w: 11.0, l: 18.5, h: 0.62, r: 4.6 },
  win1: { cy: -7.21, w: 3.15, h: 2.45 },
  win2: { cy: -2.84, w: 4.02, h: 3.49 },
  win3: { cy: 1.96, w: 4.02, h: 3.32 },
  pins: { cy: 11.75, dx: 1.83, d: 1.75 },
  latch: { cy: -19.8, w: 6.6, h: 1.85 },
  slot: { cy: 19.2, w: 6.4, h: 1.6 },
};

const OUT = superellipseOutline(D.A, D.B, D.SE, 192);
const BLACK_OUT = offsetOutline(OUT, D.glassInset);

// back cover height profile, radius fraction -> z  (control points from T05/T10 proportions)
const BACK_Z = [
  [0.0, -5.475],
  [0.45, -5.30],
  [0.62, -5.02],
  [0.76, -4.62],
  [0.845, -3.85],
  [0.90, -2.65],
  [0.945, -0.90],
  [0.972, 0.35],
  [1.0, 1.30],
];

// frame side wall profile: [inset from plan outline, z]
const FRAME_P = [
  [0.60, 4.32],
  [0.30, 4.54],
  [0.02, 4.16],
  [0.0, 3.10],
  [0.0, 1.85],
  [0.10, 1.45],
  [0.40, 1.31],
  [0.55, 1.30],
];

export function backZ(rho) {
  return spline(BACK_Z, clamp(rho, 0, 1));
}

const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function windowOutline() {
  return roundedRectOutline(0, 0, D.screenHX, D.screenHY, D.screenR, 14);
}
// screen texture mapping: image row 0 (top of the face) sits at +X
export const uvScreen = (p) => [(D.screenHY - p[1]) / (2 * D.screenHY), (D.screenHX - p[0]) / (2 * D.screenHX)];

/** Build the aluminium frame ring. */
export function buildFrame() {
  const m = new Mesh("Frame");
  const rings = FRAME_P.map(([d, z]) => offsetOutline(OUT, d).map((p) => [p[0], p[1], z]));
  loftRings(m, rings, {
    closeV: true,
    material: 0,
    uvs: (i, j) => [j / 192 * 6, FRAME_P[i][1] / 6],
  });
  return m.orient();
}

/** Opaque black bezel: from the screen window edge out to the glass edge, incl. the 2.5D roll. */
export function buildGlassBezel() {
  const m = new Mesh("Glass");
  const win = windowOutline();
  const N = 192;
  // resample both outlines to N points by angle for a clean lerp
  const polar = (pts, n) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 - Math.PI;
      const rx = Math.cos(a), ry = Math.sin(a);
      let best = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length];
        const ex = q[0] - p[0], ey = q[1] - p[1];
        const den = rx * ey - ry * ex;         // cross(r, e)
        if (Math.abs(den) < 1e-12) continue;
        const t = (p[0] * ey - p[1] * ex) / den;      // distance along the ray
        const u = (p[0] * ry - p[1] * rx) / den;      // position along the edge
        if (t > 0 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
      }
      if (!isFinite(best)) best = 0;
      out.push([rx * best, ry * best]);
    }
    return out;
  };
  const W2 = polar(win, N);
  const B2 = polar(BLACK_OUT, N);
  const STEPS = 10;
  const rings = [];
  for (let k = 0; k <= STEPS; k++) {
    const t = k / STEPS;
    // ease so more rings land near the rolled edge
    const tt = t;
    const ring = [];
    for (let j = 0; j < N; j++) {
      const p = lerp2(W2[j], B2[j], tt);
      let z = D.zFront;
      if (t > 0.52) {
        // circular-ish 2.5D roll over the outer ~1.15 mm
        const u = (t - 0.52) / 0.48;
        z = D.zFront - 1.15 * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
      }
      ring.push([p[0], p[1], z]);
    }
    rings.push(ring);
  }
  loftRings(m, rings, { closeV: true, material: 0, uvs: (i, j) => [j / N, i / STEPS] });
  return m.orient();
}

/** Transparent cover glass over the display window. */
export function buildGlassWindow() {
  const m = new Mesh("GlassWindow");
  roundedRectPatch(m, 0, 0, D.screenHX, D.screenHY, D.screenR, D.zFront - 0.012, 0, 3, 14, uvScreen);
  return m.faceUp();
}

/** Emissive display panel, 0.45 mm below the cover glass. */
export function buildScreen() {
  const m = new Mesh("Screen");
  roundedRectPatch(m, 0, 0, D.screenHX, D.screenHY, D.screenR, D.zFront - 0.45, 0, 2, 14, uvScreen);
  return m.faceUp();
}

/** Back cover shell (dome) with planar UV for the laser-etched marking texture. */
export function buildBack() {
  const m = new Mesh("Back");
  const N = 192;
  const RINGS = 20;
  const rings = [];
  for (let k = RINGS; k >= 1; k--) {
    const rho = k / RINGS;
    const pts = offsetOutline(OUT, 0.55 + 0.0 * rho);
    const ring = [];
    for (let j = 0; j < N; j++) {
      const p = [pts[j][0] * rho, pts[j][1] * rho];
      ring.push([p[0], p[1], backZ(rho)]);
    }
    rings.push(ring);
  }
  const uv = (p) => [(p[0] + D.A) / (2 * D.A), (p[1] + D.B) / (2 * D.B)];
  loftRings(m, rings, { closeV: true, material: 0, uvs: (i, j) => uv(rings[i][j]) });
  capFan(m, rings[rings.length - 1], [0, 0, backZ(0)], uv, 0);
  return m.orient();
}

/** Raised optical sensor housing with fillet + 3 windows.
 *  NB: reference measurements give (cx = across, cy = along length). The model uses
 *  X = length, Y = across, so features are placed at (x = cy, y = cx). */
export function buildSensorHousing() {
  const m = new Mesh("SensorHousing");
  const s = D.sensor;
  const outline = roundedRectOutline(0, 0, s.l / 2, s.w / 2, s.r, 16);
  const z0 = backZ(0.26) + 0.02;
  const rings = [
    outline.map((p) => [p[0] + s.cy, p[1] + s.cx, z0]),
    outline.map((p) => [p[0] * 0.975 + s.cy, p[1] * 0.975 + s.cx, z0 - s.h * 0.42]),
    outline.map((p) => [p[0] * 0.95 + s.cy, p[1] * 0.95 + s.cx, z0 - s.h * 0.80]),
    outline.map((p) => [p[0] * 0.93 + s.cy, p[1] * 0.93 + s.cx, z0 - s.h]),
  ];
  const uv = (p) => [0.5, 0.5];
  loftRings(m, rings, { closeV: true, material: 0, uvs: (i, j) => uv(rings[i][j]) });
  capFan(m, rings[rings.length - 1], [s.cy, s.cx, z0 - s.h], uv, 0);
  return m.orient();
}

/** Sensor windows (2 LED + 1 photodiode) sitting on the housing plateau. */
export function buildSensorWindows() {
  const m = new Mesh("SensorWindows");
  const s = D.sensor;
  const z = backZ(0.26) + 0.02 - s.h + 0.012;
  for (const w of [D.win1, D.win2, D.win3]) {
    roundedRectPatch(m, w.cy, 0, w.h / 2, w.w / 2, Math.min(w.w, w.h) * 0.34, z, 0, 2, 8);
  }
  return m.faceUp(-1);
}

/** Two gold charging pins in a shallow recess. */
export function buildPins() {
  const m = new Mesh("Pins");
  const z = backZ(0.50) + 0.01;
  for (const sy of [-1, 1]) {
    lathe(m, [[0, 0], [0.87, 0], [0.87, -0.05], [0.74, -0.26], [0, -0.26]], D.pins.cy, sy * D.pins.dx, z, 20, 0);
  }
  return m;
}

/** Quick-release button (oval pad) + the opposite latch slot, both conforming to the back dome. */
export function buildLatch() {
  const m = new Mesh("Latch");
  const mk = (cx, hx, hy, lift) => {
    const outline = roundedRectOutline(0, 0, hx, hy, hy, 12);
    const rings = [];
    for (const k of [1.0, 0.94, 0.8]) {
      rings.push(outline.map((p) => {
        const x = cx + p[0] * k, y = p[1] * k;
        const rho = Math.hypot(x / D.A, y / D.B);
        return [x, y, backZ(rho) - lift * (1 - k * 0.3)];
      }));
    }
    return rings;
  };
  loftRings(m, mk(D.latch.cy, D.latch.w / 2, D.latch.h / 2, 0.34), { closeV: true, material: 0 });
  loftRings(m, mk(D.slot.cy, D.slot.w / 2, D.slot.h / 2, 0.03), { closeV: true, material: 0 });
  return m.faceUp(-1);
}
