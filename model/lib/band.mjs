import { V, resample, clamp, smoothstep } from "./mathx.mjs";
import { Mesh, loftRings } from "./mesh.mjs";

/* Band construction
 * - Both halves are swept along a wrist loop in the XZ plane and skinned to a bone chain,
 *   so they can be opened / closed at runtime (bone rotation, never vertex edits).
 * - The first ~9 mm of each half is the "lug": a solid collar that grips the body ends and is
 *   bound 100 % to the root bone, so it stays rigid relative to the body.
 * - TPU holes are真穿孔: the top/bottom grids are cut and an inner wall is stitched.
 */

export const N_BONES = 9;

// Wrist loop for a 180 mm circumference: circle of R = 28.6 mm centred at z = -17 mm.
// The body spans the chord between +/-36.5 deg; each band half runs from there to the bottom.
const R_WRIST = 28.6;
const CZ = -17.0;
const PHI0 = 41.0;          // deg, start slightly inside the body end for the wrap
const PHI_END = -90;        // bottom of the loop

export function bandPath(side, opt = {}) {
  const n = opt.samples ?? 112;
  const pts = [];
  const tail = opt.tailLift ?? 0;
  const phiEnd = PHI_END;
  const STEPS = 60;
  for (let k = 0; k <= STEPS; k++) {
    const t = k / STEPS;
    const phi = ((PHI0 + (phiEnd - PHI0) * t) * Math.PI) / 180;
    let r = R_WRIST;
    if (side < 0 && t > 0.60) r += tail * smoothstep(0.60, 0.92, t);
    pts.push([r * Math.cos(phi), CZ + r * Math.sin(phi)]);
  }
  const p3 = resample(pts.map((p) => [p[0] * side, 0, p[1]]), n);
  const frames = [];
  for (let i = 0; i < n; i++) {
    const a = p3[Math.max(0, i - 1)];
    const b = p3[Math.min(n - 1, i + 1)];
    const T = V.norm([b[0] - a[0], 0, b[2] - a[2]]);
    const A = [0, 1, 0];
    const N = V.norm(V.cross(T, A));
    frames.push({ pos: [p3[i][0], 0, p3[i][2]], tangent: T, across: A, normal: N });
  }
  return frames;
}

export const BAND_SPEC = {
  // lugW/lugT = section where the strap leaves the moulded collar (must match buildCollar's exit)
  tpu: { w: 20.0, t: 2.00, r: 0.9, holes: true, lugW: 20.2, lugT: 4.4 },
  leather: { w: 19.0, t: 2.40, r: 1.0, holes: false, lugW: 19.8, lugT: 4.8 },
  woven: { w: 20.0, t: 2.60, r: 1.1, holes: false, lugW: 20.0, lugT: 5.0 },
  metal: { w: 18.0, t: 2.80, r: 1.1, holes: false, lugW: 19.2, lugT: 4.6 },
  mesh: { w: 19.0, t: 1.50, r: 0.7, holes: false, lugW: 19.4, lugT: 4.0 },
};

const K = 19; // across samples on the flat faces

// --- body cross-section, same numbers as body.mjs (superellipse plan + back dome)
const BODY = { A: 23.285, B: 11.27, N: 2.79, ZF: 5.475 };
const BACK_P = [[0.0, -5.475], [0.45, -5.30], [0.62, -5.02], [0.76, -4.62], [0.845, -3.85], [0.90, -2.65], [0.945, -0.90], [0.972, 0.35], [1.0, 1.30]];
function backZ(rho) {
  rho = Math.min(1, Math.max(0, rho));
  for (let i = 0; i < BACK_P.length - 1; i++) {
    const [r0, z0] = BACK_P[i], [r1, z1] = BACK_P[i + 1];
    if (rho <= r1) return z0 + (z1 - z0) * ((rho - r0) / (r1 - r0 || 1));
  }
  return BACK_P[BACK_P.length - 1][1];
}
function bodySection(x) {
  const r = Math.min(1, Math.abs(x) / BODY.A);
  const hw = BODY.B * Math.pow(Math.max(0, 1 - Math.pow(r, BODY.N)), 1 / BODY.N);
  const zB = backZ(r);
  return { hw, zB, zF: BODY.ZF, h: BODY.ZF - zB, cz: (BODY.ZF + zB) / 2 };
}

/** width / thickness at station i: grips the body end, then flows into the flat strap. */
function stationSize(spec, i, n, frames) {
  const p = frames ? frames[i].pos : null;
  const t = clamp(i / (n * 0.22));
  const e = t * t * (3 - 2 * t);
  let w0 = spec.lugW, t0 = spec.lugT, cz0 = 0;
  if (p) {
    // the first stations sit around the body's tapered end
    const xa = Math.min(Math.abs(p[0]), BODY.A * 0.99);
    const sec = bodySection(xa);
    w0 = Math.max(11.5, sec.hw * 2 + 1.5);
    t0 = Math.max(4.0, sec.h + 1.35);
    cz0 = sec.cz;
  }
  return {
    w: w0 + (spec.w - w0) * e,
    t: t0 + (spec.t - t0) * e,
    cz: cz0 * (1 - e),
  };
}

export function buildHalfBand(type, side, opt = {}) {
  const spec = BAND_SPEC[type];
  const frames = bandPath(side, opt);
  const n = frames.length;
  const m = new Mesh(`Band_${type}_${side > 0 ? "R" : "L"}`);

  // ---- grids -------------------------------------------------------------------
  const top = [], bot = [];
  for (let i = 0; i < n; i++) {
    const { w, t, cz } = stationSize(spec, i, n, frames);
    const f = frames[i];
    const rowT = [], rowB = [];
    for (let k = 0; k < K; k++) {
      const u = (k / (K - 1)) * 2 - 1;           // -1..1
      const su = u * (w / 2 - spec.r);
      for (const [arr, sgn] of [[rowT, 1], [rowB, -1]]) {
        const sv = cz + sgn * (t / 2);
        const p = [
          f.pos[0] + f.across[0] * su + f.normal[0] * sv,
          f.pos[1] + f.across[1] * su + f.normal[1] * sv,
          f.pos[2] + f.across[2] * su + f.normal[2] * sv,
        ];
        arr.push(p);
      }
    }
    top.push(rowT);
    bot.push(rowB);
  }

  // ---- hole mask (only TPU) ------------------------------------------------------
  const H = 9;
  const holes = [];
  if (spec.holes && !opt.noHoles) {
    for (let h = 0; h < H; h++) {
      const s = 0.46 + (h / (H - 1)) * 0.50;
      const i0 = Math.round(s * (n - 1));
      // 4.2 mm long x 4.6 mm wide oval slots, measured from R22
      holes.push({ i0, halfI: 1.6, k0: (K - 1) / 2, halfK: 1.45 });
    }
  }
  const masked = (i, k) => holes.some((h) => Math.abs(i + 0.5 - h.i0) < h.halfI && Math.abs(k + 0.5 - h.k0) < h.halfK);

  // ---- vertices ----------------------------------------------------------------
  // weights per station (before vertices are created)
  const stationW = [];
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1)) * (N_BONES - 1);
    const b = Math.min(N_BONES - 2, Math.floor(s));
    const t = s - b;
    const rigid = i < n * 0.16;
    // keep two distinct joints with non-zero weights on every vertex (glTF validator clean)
    const w2 = Math.max(0.02, Math.min(0.98, t));
    stationW.push(rigid ? [0, 0.98, 1, 0.02] : [b, 1 - w2, Math.min(N_BONES - 1, b + 1), w2]);
  }
  // arc length per station -> texture repeats every 13 mm instead of stretching over the strap
  const arc = [0];
  for (let i = 1; i < n; i++) {
    const a = frames[i - 1].pos, b = frames[i].pos;
    arc.push(arc[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  const vT = [], vB = [];
  for (let i = 0; i < n; i++) {
    const w = stationW[i];
    const uu = arc[i] / 13;
    vT.push(top[i].map((p, k) => m.v(p, [uu, k / (K - 1)], null, w)));
    vB.push(bot[i].map((p, k) => m.v(p, [uu, k / (K - 1)], null, w)));
  }

  // ---- faces -------------------------------------------------------------------
  const quadWall = (a, b, c, d) => m.quad(a, b, c, d, 0);
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < K - 1; k++) {
      if (masked(i, k)) continue;
      m.quad(vT[i][k], vT[i][k + 1], vT[i + 1][k + 1], vT[i + 1][k], 0);       // top
      m.quad(vB[i][k + 1], vB[i][k], vB[i + 1][k], vB[i + 1][k + 1], 0);       // bottom (flipped)
    }
  }
  // inner walls of the punched holes
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < K - 1; k++) {
      if (!masked(i, k)) continue;
      // left edge
      if (k > 0 && !masked(i, k - 1)) quadWall(vT[i][k], vT[i + 1][k], vB[i + 1][k], vB[i][k]);
      // right edge
      if (k < K - 2 && !masked(i, k + 1)) quadWall(vT[i + 1][k + 1], vT[i][k + 1], vB[i][k + 1], vB[i + 1][k + 1]);
      // front / back edges
      if (i > 0 && !masked(i - 1, k)) quadWall(vT[i][k + 1], vT[i][k], vB[i][k], vB[i][k + 1]);
      if (i < n - 2 && !masked(i + 1, k)) quadWall(vT[i + 1][k], vT[i + 1][k + 1], vB[i + 1][k + 1], vB[i + 1][k]);
    }
  }

  // ---- side walls: rounded edge between top edge and bottom edge ------------------
  const sideWall = (sgn) => {
    const kk = sgn > 0 ? K - 1 : 0;
    const ARC = 4;
    const loops = [];
    for (let i = 0; i < n; i++) {
      const { w, t, cz } = stationSize(spec, i, n, frames);
      const f = frames[i];
      const loop = [];
      for (let a = 1; a <= ARC; a++) {
        const ang = (a / (ARC + 1)) * Math.PI;
        const su = sgn * (w / 2 - spec.r + Math.sin(ang) * spec.r);
        const sv = cz + Math.cos(ang) * (t / 2);
        loop.push([
          f.pos[0] + f.across[0] * su + f.normal[0] * sv,
          f.pos[1] + f.across[1] * su + f.normal[1] * sv,
          f.pos[2] + f.across[2] * su + f.normal[2] * sv,
        ]);
      }
      loops.push(loop);
    }
    const ids = loops.map((loop, i) => loop.map((p, a) => m.v(p, [a / (ARC + 1), i / (n - 1)], null, stationW[i])));
    for (let i = 0; i < n - 1; i++) {
      const prevT = vT[i][kk], prevT2 = vT[i + 1][kk];
      // top edge -> first arc point
      if (sgn > 0) m.quad(prevT, ids[i][0], ids[i + 1][0], prevT2, 0);
      else m.quad(ids[i][0], prevT, prevT2, ids[i + 1][0], 0);
      for (let a = 0; a < ARC - 1; a++) {
        if (sgn > 0) m.quad(ids[i][a], ids[i][a + 1], ids[i + 1][a + 1], ids[i + 1][a], 0);
        else m.quad(ids[i][a + 1], ids[i][a], ids[i + 1][a], ids[i + 1][a + 1], 0);
      }
      // last arc point -> bottom edge
      if (sgn > 0) m.quad(ids[i][ARC - 1], vB[i][kk], vB[i + 1][kk], ids[i + 1][ARC - 1], 0);
      else m.quad(vB[i][kk], ids[i][ARC - 1], ids[i + 1][ARC - 1], vB[i + 1][kk], 0);
    }
  };
  sideWall(1);
  sideWall(-1);

  // ---- end caps ----------------------------------------------------------------
  const capAt = (i, flip) => {
    const ring = [...top[i], ...bot[i].slice().reverse()];
    const ids = [...vT[i], ...vB[i].slice().reverse()];
    const c = ring.reduce((a, p) => [a[0] + p[0] / ring.length, a[1] + p[1] / ring.length, a[2] + p[2] / ring.length], [0, 0, 0]);
    const ci = m.v(c, [0.5, 0.5], null, stationW[i]);
    for (let j = 0; j < ring.length; j++) {
      const a = ids[j], b = ids[(j + 1) % ring.length];
      if (flip) m.tri(ci, a, b, 0); else m.tri(ci, b, a, 0);
    }
  };
  capAt(0, true);
  capAt(n - 1, false);

  m.skin = { weights: stationW, N: N_BONES, frames, nPerStation: K };
  return m;
}

/**
 * Collar / lug: a moulded sleeve that follows the body's local cross-section, wraps its
 * tapered end and flows into the strap. Sections are derived from the same superellipse
 * + back-dome profile used for the body, so lug and body share one silhouette.
 */
export function buildCollar(type, side) {
  const spec = BAND_SPEC[type];
  const m = new Mesh(`Collar_${type}_${side > 0 ? "R" : "L"}`);
  const A = 23.285, B = 11.27, N = 2.79;
  const ZF = 5.475;
  const BACK = [[0.0, -5.475], [0.45, -5.30], [0.62, -5.02], [0.76, -4.62], [0.845, -3.85], [0.90, -2.65], [0.945, -0.90], [0.972, 0.35], [1.0, 1.30]];
  const backZ = (rho) => {
    rho = Math.min(1, Math.max(0, rho));
    for (let i = 0; i < BACK.length - 1; i++) {
      const [r0, z0] = BACK[i], [r1, z1] = BACK[i + 1];
      if (rho <= r1) {
        const t = (rho - r0) / (r1 - r0 || 1);
        return z0 + (z1 - z0) * t;
      }
    }
    return BACK[BACK.length - 1][1];
  };
  // body cross-section at a given |x|: half width and z extents
  const sectionAt = (x) => {
    const r = Math.min(1, Math.abs(x) / A);
    const hw = B * Math.pow(Math.max(0, 1 - Math.pow(r, N)), 1 / N);
    const zBack = backZ(r);
    return { hw, zBack, zFront: ZF, h: ZF - zBack, cz: (ZF + zBack) / 2 };
  };

  const rrect = (w, h, r, seg = 5) => {
    const pts = [], hw = w / 2, hh = h / 2;
    const corners = [[hw - r, hh - r, 0], [-hw + r, hh - r, Math.PI / 2], [-hw + r, -hh + r, Math.PI], [hw - r, -hh + r, 1.5 * Math.PI]];
    for (const [cx, cy, a0] of corners)
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    return pts;
  };

  const PAD = 0.72;                 // radial clearance + wall
  const XA = 20.55, XC = 23.30;
  const RINGS = 9;
  const rings = [];
  for (let k = 0; k <= RINGS; k++) {
    const t = k / RINGS;
    const x = XA + (XC - XA) * t;
    const sec = sectionAt(Math.min(Math.abs(x), A * 0.995));
    // outer silhouette: body section + 1.7 mm, never narrower than the strap
    const wOut = Math.max(spec.lugW - 0.2, sec.hw * 2 + 2 * PAD);
    const hOut = Math.max(spec.t + 0.2, sec.h + 2 * PAD);
    const cz = sec.cz;
    const o = rrect(wOut, hOut, Math.min(hOut, wOut) * 0.42);
    // cavity shrinks with the body, closing just before the strap starts
    const cw = Math.max(0, sec.hw * 2 + 0.25);
    const ch = Math.max(0, sec.h + 0.25);
    const ring = o.map(([y, z]) => [x * side, y, cz + z]);
    if (cw > 2.2 && ch > 2.2 && t < 0.86) {
      const ci = rrect(cw, ch, Math.min(ch, cw) * 0.34);
      ring.push(...ci.slice().reverse().map(([y, z]) => [x * side, y, cz + z]));
    }
    rings.push(ring);
  }
  // all rings must share a vertex count for the loft: pad the closed ones by collapsing
  const target = rings[0].length;
  const norm = rings.map((r) => {
    if (r.length === target) return r;
    const cx = r.reduce((a, p) => a + p[0] / r.length, 0);
    const cy = r.reduce((a, p) => a + p[1] / r.length, 0);
    const cz = r.reduce((a, p) => a + p[2] / r.length, 0);
    const out = r.slice();
    while (out.length < target) out.push([cx, cy, cz]);
    return out;
  });
  loftRings(m, norm, { closeV: true, material: 0, uvs: (i, j) => [j / target, i / RINGS] });
  return m.orient();
}

/** Metal bracelet: individual links, each rigidly bound to one bone. */
export function buildMetalBand(side, opt = {}) {
  const frames = bandPath(side, opt);
  const n = frames.length;
  const m = new Mesh(`Band_metal_${side > 0 ? "R" : "L"}`);
  const weights = new Array(n);
  const LINK = 9;
  const count = Math.max(1, Math.floor((n - 10) / LINK));
  for (let li = 0; li < count; li++) {
    const i0 = 5 + li * LINK;
    const i1 = Math.min(n - 1, i0 + LINK);
    const bone = clamp(Math.round((li / Math.max(1, count - 1)) * (N_BONES - 2)), 0, N_BONES - 2);
    for (let i = i0; i <= i1; i++) weights[i] = [bone, 1, bone, 0];
    const f0 = frames[i0], f1 = frames[i1];
    const axis = V.norm(V.sub(f1.pos, f0.pos));
    const up = [0, 1, 0];
    const nrm = V.norm(V.cross(axis, up));
    const len = V.len(V.sub(f1.pos, f0.pos));
    const gap = 0.42;
    const rings = [];
    const STEPS = 5;
    for (let s = 0; s <= STEPS; s++) {
      const tt = s / STEPS;
      const z0 = gap + (len - 2 * gap) * tt;
      const centre = V.add(f0.pos, V.mul(axis, z0));
      const bevel = s === 0 || s === STEPS ? 0.9 : 1.0;
      const ring = [];
      const sec = 20;
      for (let a = 0; a < sec; a++) {
        const ang = (a / sec) * Math.PI * 2;
        // rounded-rectangle link section (flat faces, chamfered edges)
        const c = Math.cos(ang), si = Math.sin(ang);
        const pw = 2 / 5.5;                    // superellipse-ish
        const su = Math.sign(c) * Math.pow(Math.abs(c), pw) * 8.9 * bevel;
        const sv = Math.sign(si) * Math.pow(Math.abs(si), pw) * 1.45 * bevel;
        ring.push([
          centre[0] + up[0] * su + nrm[0] * sv,
          centre[1] + up[1] * su + nrm[1] * sv,
          centre[2] + up[2] * su + nrm[2] * sv,
        ]);
      }
      rings.push(ring);
    }
    // cap both ends
    const lw = [bone, 0.98, bone + 1, 0.02];
    const ids = rings.map((r) => r.map((p) => m.v(p, [0, 0], null, lw)));
    for (let s = 0; s < rings.length - 1; s++) {
      for (let a = 0; a < rings[s].length; a++) {
        const a2 = (a + 1) % rings[s].length;
        m.quad(ids[s][a], ids[s][a2], ids[s + 1][a2], ids[s + 1][a], 0);
      }
    }
    const capFace = (ri, flip) => {
      const r = rings[ri], idr = ids[ri];
      const c = r.reduce((acc, p) => [acc[0] + p[0] / r.length, acc[1] + p[1] / r.length, acc[2] + p[2] / r.length], [0, 0, 0]);
      const ci = m.v(c, [0.5, 0.5], null, lw);
      for (let a = 0; a < r.length; a++) {
        const b = idr[(a + 1) % r.length];
        if (flip) m.tri(ci, b, idr[a], 0); else m.tri(ci, idr[a], b, 0);
      }
    };
    capFace(0, false);
    capFace(rings.length - 1, true);
  }
  for (let i = 0; i < n; i++) if (!weights[i]) weights[i] = [0, 1, 0, 0];
  m.skin = { weights, N: N_BONES, frames, nPerStation: K, linkBand: true };
  return m;
}
