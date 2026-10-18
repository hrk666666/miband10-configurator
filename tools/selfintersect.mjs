/**
 * Self-intersection check for the skinned straps.
 *
 * Rebuilds each band half, evaluates the skin deformation at the extremes of the allowed
 * bend range, and runs a spatial-hash triangle/triangle test (SAT). Adjacent triangles are
 * skipped. Exit code 1 if any pair intersects.
 *
 *   node tools/selfintersect.mjs [--verbose]
 */
import { buildHalfBand, buildMetalBand, BAND_SPEC, N_BONES } from "../model/lib/band.mjs";
import { triTriIntersect } from "../model/lib/mesh.mjs";

const VERBOSE = process.argv.includes("--verbose");
const ANGLE_LIMIT = 1.9;             // matches Watch.jsx (degrees per bone at |bend| = 1)
const ANGLES = [-0.95, 0, 0.95, ANGLE_LIMIT];   // closing is limited to 0.95 deg/bone

/* ---------- minimal 4x4 (column major) ---------- */
const m4 = {
  fromFrame(p, X, Y, Z) {
    return [X[0], X[1], X[2], 0, Y[0], Y[1], Y[2], 0, Z[0], Z[1], Z[2], 0, p[0], p[1], p[2], 1];
  },
  mul(a, b) {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) {
        let s = 0;
        for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
      }
    return o;
  },
  rotY(rad) {
    const c = Math.cos(rad), s = Math.sin(rad);
    return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
  },
  apply(m, p) {
    return [
      m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
      m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
      m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
    ];
  },
};

/** Bone world matrices for a given per-bone bend angle (radians). */
function boneWorlds(frames, angle) {
  const n = frames.length;
  const stationOf = (b) => Math.round((b / (N_BONES - 1)) * (n - 1));
  const worlds = [];
  for (let b = 0; b < N_BONES; b++) {
    const f = frames[stationOf(b)];
    worlds.push(m4.fromFrame(f.pos, f.tangent, f.across, f.normal));
  }
  // accumulate bend down the chain
  const out = [];
  let acc = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (let b = 0; b < N_BONES; b++) {
    const local = b === 0 ? worlds[0] : m4.mul(invRigid(worlds[b - 1]), worlds[b]);
    acc = m4.mul(acc, m4.mul(local, m4.rotY(angle * (b === 0 ? 0.3 : 1))));
    out.push(acc);
  }
  return out;
}

function invRigid(a) {
  const t = [a[0], a[4], a[8], a[1], a[5], a[9], a[2], a[6], a[10]];
  const p = [a[12], a[13], a[14]];
  const tp = [
    -(t[0] * p[0] + t[3] * p[1] + t[6] * p[2]),
    -(t[1] * p[0] + t[4] * p[1] + t[7] * p[2]),
    -(t[2] * p[0] + t[5] * p[1] + t[8] * p[2]),
  ];
  return [t[0], t[1], t[2], 0, t[3], t[4], t[5], 0, t[6], t[7], t[8], 0, tp[0], tp[1], tp[2], 1];
}

function skin(mesh, worlds, ibms) {
  const n = mesh.vertexCount;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const w = mesh.sw.slice(i * 4, i * 4 + 4);
    const p = [mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]];
    const acc = [0, 0, 0];
    for (let k = 0; k < 2; k++) {
      const b = Math.min(worlds.length - 1, w[k * 2]), ww = w[k * 2 + 1];
      if (ww <= 0) continue;
      const local = m4.apply(ibms[b], p);                     // into bone space
      const q = m4.apply(worlds[b], local);                   // then to posed world
      acc[0] += q[0] * ww; acc[1] += q[1] * ww; acc[2] += q[2] * ww;
    }
    pos[i * 3] = acc[0]; pos[i * 3 + 1] = acc[1]; pos[i * 3 + 2] = acc[2];
  }
  return pos;
}

function checkMesh(name, mesh, verbose, side = 1) {
  const restWorlds = boneWorlds(mesh.skin.frames, 0);
  const restIbms = restWorlds.map((w) => invRigid(w));
  let worst = { pairs: 0, angle: null };
  for (const ang of ANGLES) {
    const signed = ((side === -1 ? -ang : ang) * Math.PI) / 180;
    const worlds = boneWorlds(mesh.skin.frames, signed);
    const pos = skin(mesh, worlds, restIbms);
    const tris = [];
    for (let i = 0; i < mesh.idx.length; i += 3) {
      const a = mesh.idx[i], b = mesh.idx[i + 1], c = mesh.idx[i + 2];
      const p0 = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]];
      const p1 = [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]];
      const p2 = [pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]];
      tris.push({ i, a, b, c, p0, p1, p2 });
    }
    // spatial hash
    const CELL = 2.6;
    const grid = new Map();
    const key = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
    for (const t of tris) {
      const xs = [t.p0[0], t.p1[0], t.p2[0]];
      const ys = [t.p0[1], t.p1[1], t.p2[1]];
      const zs = [t.p0[2], t.p1[2], t.p2[2]];
      for (let x = Math.floor(Math.min(...xs) / CELL); x <= Math.floor(Math.max(...xs) / CELL); x++)
        for (let y = Math.floor(Math.min(...ys) / CELL); y <= Math.floor(Math.max(...ys) / CELL); y++)
          for (let z = Math.floor(Math.min(...zs) / CELL); z <= Math.floor(Math.max(...zs) / CELL); z++) {
            const k = `${x},${y},${z}`;
            (grid.get(k) || grid.set(k, []).get(k)).push(t);
          }
    }
    let hits = 0;
    const seen = new Set();
    for (const cell of grid.values()) {
      if (cell.length < 2) continue;
      for (let i = 0; i < cell.length; i++)
        for (let j = i + 1; j < cell.length; j++) {
          const A = cell[i], B = cell[j];
          if (A.a === B.a || A.a === B.b || A.a === B.c) continue;
          if (A.b === B.a || A.b === B.b || A.b === B.c) continue;
          if (A.c === B.a || A.c === B.b || A.c === B.c) continue;
          const id = A.i < B.i ? `${A.i}_${B.i}` : `${B.i}_${A.i}`;
          if (seen.has(id)) continue;
          seen.add(id);
          if (triTriIntersect([A.p0, A.p1, A.p2], [B.p0, B.p1, B.p2])) {
            hits++;
            if (hits <= 3) {
              const c = [(A.p0[0] + A.p2[0]) / 2, (A.p0[1] + A.p2[1]) / 2, (A.p0[2] + A.p2[2]) / 2];
              const d = [(B.p0[0] + B.p2[0]) / 2, (B.p0[1] + B.p2[1]) / 2, (B.p0[2] + B.p2[2]) / 2];
              console.log(`     pair@ ${c.map((v) => v.toFixed(1))} / ${d.map((v) => v.toFixed(1))}`);
            }
            if (verbose && hits < 6) console.log(`   ${name} bend=${ang}deg tri ${A.i / 3} x ${B.i / 3}`);
          }
        }
    }
    if (hits > worst.pairs) worst = { pairs: hits, angle: ang };
    if (hits === 0 && verbose) console.log(`   ${name} bend=${ang}deg  clean (${tris.length} tris)`);
  }
  return worst;
}

let fail = 0;
console.log("self-intersection check — straps at bend extremes");
for (const type of Object.keys(BAND_SPEC)) {
  for (const side of [1, -1]) {
    const mesh = type === "metal"
      ? buildMetalBand(side, { samples: 112 })
      : buildHalfBand(type, side, { samples: 112, tailLift: 0 });
    const r = checkMesh(`Band_${type}_${side > 0 ? "R" : "L"}`, mesh, VERBOSE, side);
    const ok = r.pairs === 0;
    if (!ok) fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${type.padEnd(8)} ${side > 0 ? "R" : "L"}  tris=${mesh.idx.length / 3}  maxPairs=${r.pairs}${r.angle !== null ? ` @${r.angle}deg` : ""}`);
  }
}
console.log(fail === 0 ? "\nRESULT: no self-intersection in any strap at any allowed bend." : `\nRESULT: ${fail} strap(s) self-intersect.`);
process.exit(fail === 0 ? 0 : 1);
