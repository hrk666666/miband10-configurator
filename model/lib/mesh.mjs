import { V, clamp } from "./mathx.mjs";

export class Mesh {
  constructor(name = "") {
    this.name = name;
    this.pos = [];
    this.uv = [];
    this.idx = [];
    this.color = [];      // optional per-vertex rgb
    this.sw = [];         // optional per-vertex skin weights [b0,w0,b1,w1]
    this.groups = [];     // [{start,count,material}]
  }

  get vertexCount() {
    return this.pos.length / 3;
  }

  v(p, uv, col, w) {
    const i = this.vertexCount;
    this.pos.push(p[0], p[1], p[2]);
    this.uv.push(uv ? uv[0] : 0, uv ? uv[1] : 0);
    if (col) this.color.push(col[0], col[1], col[2]);
    if (w) this.sw.push(w[0], w[1], w[2], w[3]);
    return i;
  }

  tri(a, b, c, mat = 0) {
    this.idx.push(a, b, c);
    const g = this.groups[this.groups.length - 1];
    if (!g || g.material !== mat) this.groups.push({ start: this.idx.length - 3, count: 3, material: mat });
    else g.count += 3;
  }

  quad(a, b, c, d, mat = 0) {
    this.tri(a, b, c, mat);
    this.tri(a, c, d, mat);
  }

  /** Flip index winding if the mesh's average face normal points away from +Z (flat patches). */
  faceUp(sign = 1) {
    let nz = 0;
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i] * 3, b = this.idx[i + 1] * 3, c = this.idx[i + 2] * 3;
      const ux = this.pos[b] - this.pos[a], uy = this.pos[b + 1] - this.pos[a + 1];
      const vx = this.pos[c] - this.pos[a], vy = this.pos[c + 1] - this.pos[a + 1];
      nz += ux * vy - uy * vx;
    }
    if (nz * sign < 0) {
      for (let i = 0; i < this.idx.length; i += 3) {
        const t = this.idx[i + 1];
        this.idx[i + 1] = this.idx[i + 2];
        this.idx[i + 2] = t;
      }
    }
    return this;
  }

  /** Signed volume of the triangle soup (divergence theorem) — sign reveals orientation. */
  signedVolume() {
    let v = 0;
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i] * 3, b = this.idx[i + 1] * 3, c = this.idx[i + 2] * 3;
      const p0 = [this.pos[a], this.pos[a + 1], this.pos[a + 2]];
      const p1 = [this.pos[b], this.pos[b + 1], this.pos[b + 2]];
      const p2 = [this.pos[c], this.pos[c + 1], this.pos[c + 2]];
      v += p0[0] * (p1[1] * p2[2] - p1[2] * p2[1])
         - p0[1] * (p1[0] * p2[2] - p1[2] * p2[0])
         + p0[2] * (p1[0] * p2[1] - p1[1] * p2[0]);
    }
    return v / 6;
  }

  /** Flip winding when the shell is inside-out. */
  orient() {
    if (this.signedVolume() < 0) {
      for (let i = 0; i < this.idx.length; i += 3) {
        const t = this.idx[i + 1];
        this.idx[i + 1] = this.idx[i + 2];
        this.idx[i + 2] = t;
      }
    }
    return this;
  }

  /** Drop vertices that no triangle references (holes leave orphans behind). */
  compact() {
    const used = new Uint8Array(this.vertexCount);
    for (const i of this.idx) used[i] = 1;
    const remap = new Int32Array(this.vertexCount).fill(-1);
    const pos = [], uv = [], col = [], sw = [];
    let n = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      if (!used[i]) continue;
      remap[i] = n++;
      pos.push(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      uv.push(this.uv[i * 2], this.uv[i * 2 + 1]);
      if (this.color.length) col.push(this.color[i * 3], this.color[i * 3 + 1], this.color[i * 3 + 2]);
      if (this.sw.length) sw.push(this.sw[i * 4], this.sw[i * 4 + 1], this.sw[i * 4 + 2], this.sw[i * 4 + 3]);
    }
    this.pos = pos; this.uv = uv; this.color = col; this.sw = sw;
    this.idx = this.idx.map((i) => remap[i]);
    return this;
  }

  /** Per-vertex tangents from UV derivatives (VEC4, w = handedness). */
  computeTangents() {
    const n = this.vertexCount;
    const tan = new Float32Array(n * 3);
    const bit = new Float32Array(n * 3);
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i], b = this.idx[i + 1], c = this.idx[i + 2];
      const p0 = [this.pos[a * 3], this.pos[a * 3 + 1], this.pos[a * 3 + 2]];
      const p1 = [this.pos[b * 3], this.pos[b * 3 + 1], this.pos[b * 3 + 2]];
      const p2 = [this.pos[c * 3], this.pos[c * 3 + 1], this.pos[c * 3 + 2]];
      const u0 = [this.uv[a * 2], this.uv[a * 2 + 1]];
      const u1 = [this.uv[b * 2], this.uv[b * 2 + 1]];
      const u2 = [this.uv[c * 2], this.uv[c * 2 + 1]];
      const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
      const e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
      const d1 = [u1[0] - u0[0], u1[1] - u0[1]];
      const d2 = [u2[0] - u0[0], u2[1] - u0[1]];
      const r = d1[0] * d2[1] - d1[1] * d2[0];
      if (Math.abs(r) < 1e-12) continue;
      const f = 1 / r;
      const t = [(e1[0] * d2[1] - e2[0] * d1[1]) * f, (e1[1] * d2[1] - e2[1] * d1[1]) * f, (e1[2] * d2[1] - e2[2] * d1[1]) * f];
      const bt = [(e2[0] * d1[0] - e1[0] * d2[0]) * f, (e2[1] * d1[0] - e1[1] * d2[0]) * f, (e2[2] * d1[0] - e1[2] * d2[0]) * f];
      for (const k of [a, b, c]) {
        tan[k * 3] += t[0]; tan[k * 3 + 1] += t[1]; tan[k * 3 + 2] += t[2];
        bit[k * 3] += bt[0]; bit[k * 3 + 1] += bt[1]; bit[k * 3 + 2] += bt[2];
      }
    }
    const nrm = this.computeNormals();
    const out = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const t = [tan[i * 3], tan[i * 3 + 1], tan[i * 3 + 2]];
      const nn = [nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]];
      const d = t[0] * nn[0] + t[1] * nn[1] + t[2] * nn[2];
      const p = [t[0] - nn[0] * d, t[1] - nn[1] * d, t[2] - nn[2] * d];
      const l = Math.hypot(p[0], p[1], p[2]);
      if (l < 1e-9) { out[i * 4] = 1; out[i * 4 + 1] = 0; out[i * 4 + 2] = 0; out[i * 4 + 3] = 1; continue; }
      out[i * 4] = p[0] / l; out[i * 4 + 1] = p[1] / l; out[i * 4 + 2] = p[2] / l;
      const bx = nn[1] * p[2] - nn[2] * p[1];
      const by = nn[2] * p[0] - nn[0] * p[2];
      const bz = nn[0] * p[1] - nn[1] * p[0];
      const hand = bx * bit[i * 3] + by * bit[i * 3 + 1] + bz * bit[i * 3 + 2];
      out[i * 4 + 3] = hand < 0 ? -1 : 1;
    }
    return out;
  }

  // Weld free vertices (used after building separate strips for a band half).
  computeNormals() {
    const n = new Float32Array(this.pos.length);
    for (let i = 0; i < this.idx.length; i += 3) {
      const a = this.idx[i] * 3, b = this.idx[i + 1] * 3, c = this.idx[i + 2] * 3;
      const p0 = [this.pos[a], this.pos[a + 1], this.pos[a + 2]];
      const p1 = [this.pos[b], this.pos[b + 1], this.pos[b + 2]];
      const p2 = [this.pos[c], this.pos[c + 1], this.pos[c + 2]];
      const fn = V.cross(V.sub(p1, p0), V.sub(p2, p0));
      for (const o of [a, b, c]) {
        n[o] += fn[0]; n[o + 1] += fn[1]; n[o + 2] += fn[2];
      }
    }
    const out = new Float32Array(this.pos.length);
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      out[i] = n[i] / l; out[i + 1] = n[i + 1] / l; out[i + 2] = n[i + 2] / l;
    }
    return out;
  }

  bounds() {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < this.pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        mn[k] = Math.min(mn[k], this.pos[i + k]);
        mx[k] = Math.max(mx[k], this.pos[i + k]);
      }
    }
    return { mn, mx };
  }
}

/** Build quads between consecutive rings. rings: [ [ [x,y,z], ... ], ... ] */
export function loftRings(mesh, rings, opt = {}) {
  const closeV = opt.closeV !== false;
  const mat = opt.material ?? 0;
  const uvs = opt.uvs; // function(ringIndex, pointIndex) -> [u,v]
  const base = [];
  for (let i = 0; i < rings.length; i++) {
    base.push([]);
    for (let j = 0; j < rings[i].length; j++) {
      const uv = uvs ? uvs(i, j) : [j / rings[i].length, i / (rings.length - 1)];
      base[i].push(mesh.v(rings[i][j], uv));
    }
  }
  for (let i = 0; i < rings.length - 1; i++) {
    const n = rings[i].length;
    for (let j = 0; j < (closeV ? n : n - 1); j++) {
      const j2 = (j + 1) % n;
      mesh.quad(base[i][j], base[i][j2], base[i + 1][j2], base[i + 1][j], mat);
    }
  }
  return base;
}

/** Triangular fan closing a ring to a centre point. */
export function capFan(mesh, ring, centre, uvFn, mat = 0) {
  const c = mesh.v(centre, uvFn ? uvFn(centre) : [0.5, 0.5]);
  const ids = ring.map((p, i) => mesh.v(p, uvFn ? uvFn(p, i) : [0, 0]));
  for (let i = 0; i < ids.length; i++) {
    mesh.tri(c, ids[i], ids[(i + 1) % ids.length], mat);
  }
}

/** Closed 2D cross-section: rounded rectangle in (t, n) space, CCW. */
export function roundedRectSection(w, h, r, seg = 6) {
  const pts = [];
  const hw = w / 2, hh = h / 2;
  const corners = [
    [hw - r, hh - r, 0],
    [-hw + r, hh - r, Math.PI / 2],
    [-hw + r, -hh + r, Math.PI],
    [hw - r, -hh + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  // remove duplicated corner joints
  return pts.filter((p, i) => {
    const q = pts[(i + 1) % pts.length];
    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6;
  });
}

/** Rounded-rect outline (2D, CCW) centred at (cx,cy) with half sizes hw,hh and radius r. */
export function roundedRectOutline(cx, cy, hw, hh, r, seg = 10) {
  const pts = [];
  const corners = [
    [cx + hw - r, cy + hh - r, 0],            // top-right, 0..90
    [cx - hw + r, cy + hh - r, Math.PI / 2],  // top-left, 90..180
    [cx - hw + r, cy - hh + r, Math.PI],      // bottom-left, 180..270
    [cx + hw - r, cy - hh + r, 1.5 * Math.PI],// bottom-right, 270..360
  ];
  for (const [ccx, ccy, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push([ccx + Math.cos(a) * r, ccy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/** Sweep a 2D section along a 3D path with per-point frames {pos, tangent, normal(up), binormal}. */
export function sweep(mesh, frames, section, opt = {}) {
  const mat = opt.material ?? 0;
  const rings = [];
  frames.forEach((f, i) => {
    const ring = [];
    for (const [su, sv] of section) {
      // su = across (binormal), sv = thickness (normal)
      ring.push([
        f.pos[0] + f.binormal[0] * su + f.normal[0] * sv,
        f.pos[1] + f.binormal[1] * su + f.normal[1] * sv,
        f.pos[2] + f.binormal[2] * su + f.normal[2] * sv,
      ]);
    }
    rings.push(ring);
  });
  const uScale = opt.uScale ?? 1;
  return loftRings(mesh, rings, {
    closeV: true,
    material: mat,
    uvs: (i, j) => [j / section.length, (opt.vStart ?? 0) + i * uScale],
  });
}

/** Flat rounded-rect patch in the XY plane at height z, UV mapped 0..1. */
export function roundedRectPatch(mesh, cx, cy, hw, hh, r, z, mat = 0, rings = 4, seg = 12, uvFn = null) {
  const outline = roundedRectOutline(cx, cy, hw, hh, r, seg);
  const uvf = uvFn || ((p) => [(p[0] - (cx - hw)) / (2 * hw), (p[1] - (cy - hh)) / (2 * hh)]);
  const ringList = [];
  for (let k = 1; k > 0.02; k -= 1 / rings) {
    ringList.push(outline.map((p) => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k, z]));
  }
  // collapse the last ring onto the centre so every face shares one winding rule
  ringList.push(outline.map(() => [cx, cy, z]));
  return loftRings(mesh, ringList, { closeV: true, material: mat, uvs: (i, j) => uvf(ringList[i][j]) });
}

/** Lathe a 2D profile [[r,z],...] around the Z axis at (cx,cy). */
export function lathe(mesh, profile, cx, cy, z0, seg = 24, mat = 0, flip = false) {
  const rings = [];
  for (const [r, z] of profile) {
    const ring = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z0 + z]);
    }
    rings.push(ring);
  }
  return loftRings(mesh, rings, { closeV: true, material: mat, uvs: (i, j) => [j / seg, i / (profile.length - 1)] });
}

/** Merge several meshes into one, offsetting indices. */
export function mergeMeshes(list) {
  const out = new Mesh(list.map((m) => m.name).join("+"));
  for (const m of list) {
    const off = out.vertexCount;
    out.pos.push(...m.pos);
    out.uv.push(...m.uv);
    if (m.color.length) out.color.push(...m.color);
    for (const i of m.idx) out.idx.push(i + off);
  }
  return out;
}

export function transformMesh(m, fn) {
  for (let i = 0; i < m.pos.length; i += 3) {
    const p = fn([m.pos[i], m.pos[i + 1], m.pos[i + 2]]);
    m.pos[i] = p[0]; m.pos[i + 1] = p[1]; m.pos[i + 2] = p[2];
  }
  return m;
}

/** Triangle-triangle intersection via separating-axis test (13 axes).
 *  Coplanar/degenerate pairs are reported as intersecting (they overlap in space). */
export function triTriIntersect(a, b, eps = 1e-6) {
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const axes = [];
  const n1 = cross(sub(a[1], a[0]), sub(a[2], a[0]));
  const n2 = cross(sub(b[1], b[0]), sub(b[2], b[0]));
  if (Math.hypot(...n1) < 1e-9 || Math.hypot(...n2) < 1e-9) return false;
  axes.push(n1, n2);
  for (let i = 0; i < 3; i++) {
    const ea = sub(a[(i + 1) % 3], a[i]);
    // in-plane edge normals: required to separate coplanar triangles
    const na = cross(n1, ea);
    if (Math.hypot(...na) > 1e-9) axes.push(na);
    for (let j = 0; j < 3; j++) {
      const eb = sub(b[(j + 1) % 3], b[j]);
      const ax = cross(ea, eb);
      if (Math.hypot(...ax) > 1e-9) axes.push(ax);
    }
  }
  for (let j = 0; j < 3; j++) {
    const eb = sub(b[(j + 1) % 3], b[j]);
    const nb = cross(n2, eb);
    if (Math.hypot(...nb) > 1e-9) axes.push(nb);
  }
  for (const ax of axes) {
    let mnA = Infinity, mxA = -Infinity, mnB = Infinity, mxB = -Infinity;
    for (const p of a) { const d = dot(p, ax); mnA = Math.min(mnA, d); mxA = Math.max(mxA, d); }
    for (const p of b) { const d = dot(p, ax); mnB = Math.min(mnB, d); mxB = Math.max(mxB, d); }
    if (mxA < mnB - eps || mxB < mnA - eps) return false;
  }
  return true;
}
