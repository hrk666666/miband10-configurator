// Small vector / matrix helpers. Device space: X = length, Y = width, Z = thickness (+Z = screen).
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ],
};

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smoothstep = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const mix = (a, b, t) => a + (b - a) * t;

// Monotone-ish cubic interpolation through [[x,y],...] sorted by x (Catmull-Rom on non-uniform x).
export function spline(points, x) {
  const n = points.length;
  if (x <= points[0][0]) return points[0][1];
  if (x >= points[n - 1][0]) return points[n - 1][1];
  let i = 0;
  while (i < n - 2 && x > points[i + 1][0]) i++;
  const p0 = points[Math.max(0, i - 1)];
  const p1 = points[i];
  const p2 = points[i + 1];
  const p3 = points[Math.min(n - 1, i + 2)];
  const t = (x - p1[0]) / (p2[0] - p1[0]);
  const t2 = t * t;
  const t3 = t2 * t;
  // Catmull-Rom with tangents scaled to the local spacing
  const m1 = ((p2[1] - p0[1]) / (p2[0] - p0[0] || 1)) * (p2[0] - p1[0]);
  const m2 = ((p3[1] - p1[1]) / (p3[0] - p1[0] || 1)) * (p2[0] - p1[0]);
  return (
    (2 * t3 - 3 * t2 + 1) * p1[1] +
    (t3 - 2 * t2 + t) * m1 +
    (-2 * t3 + 3 * t2) * p2[1] +
    (t3 - t2) * m2
  );
}

// Superellipse point on |x/a|^n + |y/b|^n = 1, parameterised by angle.
export function superellipse(a, b, n, theta) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [
    a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
    b * Math.sign(s) * Math.pow(Math.abs(s), 2 / n),
  ];
}

// Closed outline sampled at `segs` angles, plus per-point inward normal (unit, 2D).
export function superellipseOutline(a, b, n, segs) {
  const pts = [];
  for (let i = 0; i < segs; i++) {
    const th = (i / segs) * Math.PI * 2;
    pts.push(superellipse(a, b, n, th));
  }
  const nrm = pts.map((_, i) => {
    const p0 = pts[(i - 1 + segs) % segs];
    const p1 = pts[(i + 1) % segs];
    const t = V.norm([p1[0] - p0[0], p1[1] - p0[1], 0]);
    // outward normal for CCW ordering
    return V.norm([t[1], -t[0], 0]);
  });
  return { pts, nrm };
}

// Offset an outline inward by d millimetres using its normals.
export function offsetOutline(outline, d) {
  return outline.pts.map((p, i) => {
    const nn = outline.nrm[i];
    return [p[0] - nn[0] * d, p[1] - nn[1] * d];
  });
}

// Resample a polyline to N points of equal arc length.
export function resample(points, n) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const l = dist2(points[i - 1], points[i]);
    seg.push(l);
    total += l;
  }
  const out = [];
  let target = 0;
  let acc = 0;
  let i = 1;
  out.push(points[0]);
  for (let k = 1; k < n - 1; k++) {
    target = (total * k) / (n - 1);
    while (i < seg.length && acc + seg[i - 1] < target) {
      acc += seg[i - 1];
      i++;
    }
    const t = (target - acc) / (seg[i - 1] || 1);
    out.push([
      points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
      points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
      points[i - 1][2] + (points[i][2] - points[i - 1][2]) * t,
    ]);
  }
  out.push(points[points.length - 1]);
  return out;
}

export const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// Closed Catmull-Rom through control points (2D), resampled.
export function catmullClosed(ctrl, n) {
  const pts = [];
  const m = ctrl.length;
  for (let i = 0; i < m; i++) {
    const p0 = ctrl[(i - 1 + m) % m];
    const p1 = ctrl[i];
    const p2 = ctrl[(i + 1) % m];
    const p3 = ctrl[(i + 2) % m];
    const steps = 24;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      pts.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  // close the loop smoothly
  pts.push(pts[0]);
  return resample(pts.map((p) => [p[0], p[1], 0]), n);
}
