import fs from "node:fs";
import path from "node:path";

const COMP = {
  FLOAT: 5126, UNSIGNED_SHORT: 5123, UNSIGNED_INT: 5125, UNSIGNED_BYTE: 5121,
};
const TYPE_N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

/* ---------- 4x4 column-major helpers ---------- */
export const M4 = {
  fromFrame(p, X, Y, Z) {
    return [
      X[0], X[1], X[2], 0,
      Y[0], Y[1], Y[2], 0,
      Z[0], Z[1], Z[2], 0,
      p[0], p[1], p[2], 1,
    ];
  },
  rotZ(deg) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
  rotX(deg) {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
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
  invRigid(a) {
    const r = [a[0], a[1], a[2], a[4], a[5], a[6], a[8], a[9], a[10]];
    // transpose rotation
    const t = [r[0], r[3], r[6], r[1], r[4], r[7], r[2], r[5], r[8]];
    const p = [a[12], a[13], a[14]];
    const tp = [
      -(t[0] * p[0] + t[3] * p[1] + t[6] * p[2]),
      -(t[1] * p[0] + t[4] * p[1] + t[7] * p[2]),
      -(t[2] * p[0] + t[5] * p[1] + t[8] * p[2]),
    ];
    return [t[0], t[1], t[2], 0, t[3], t[4], t[5], 0, t[6], t[7], t[8], 0, tp[0], tp[1], tp[2], 1];
  },
};

export class Glb {
  constructor(generator = "miband10-configurator") {
    this.j = {
      asset: { version: "2.0", generator },
      scene: 0,
      scenes: [{ nodes: [] }],
      nodes: [],
      meshes: [],
      materials: [],
      accessors: [],
      bufferViews: [],
      images: [],
      textures: [],
      samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
      skins: [],
    };
    this.ext = new Set();
    this.chunks = [];
    this.len = 0;
  }

  _push(buf, target) {
    while (this.len % 4 !== 0) { this.chunks.push(Buffer.from([0])); this.len += 1; }
    const view = { buffer: 0, byteOffset: this.len, byteLength: buf.length };
    if (target) view.target = target;
    this.j.bufferViews.push(view);
    this.chunks.push(buf);
    this.len += buf.length;
    return this.j.bufferViews.length - 1;
  }

  accessor(typed, type, compType, opt = {}) {
    const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    const view = this._push(buf, opt.target);
    const acc = {
      bufferView: view,
      componentType: compType,
      count: typed.length / TYPE_N[type],
      type,
    };
    if (opt.min) acc.min = opt.min;
    if (opt.max) acc.max = opt.max;
    if (opt.normalized) acc.normalized = true;
    this.j.accessors.push(acc);
    return this.j.accessors.length - 1;
  }

  image(file) {
    const data = fs.readFileSync(file);
    const view = this._push(data);
    this.j.images.push({ bufferView: view, mimeType: file.endsWith(".png") ? "image/png" : "image/jpeg", name: path.basename(file) });
    this.j.textures.push({ sampler: 0, source: this.j.images.length - 1 });
    return this.j.textures.length - 1;
  }

  material(def) {
    const m = { name: def.name, pbrMetallicRoughness: { ...def.pbr } };
    if (def.emissiveFactor) m.emissiveFactor = def.emissiveFactor;
    if (def.emissiveTexture) m.emissiveTexture = def.emissiveTexture;
    if (def.alphaMode) m.alphaMode = def.alphaMode;
    if (def.alphaCutoff) m.alphaCutoff = def.alphaCutoff;
    if (def.doubleSided) m.doubleSided = true;
    if (def.normalTexture) m.normalTexture = def.normalTexture;
    if (def.occlusionTexture) m.occlusionTexture = def.occlusionTexture;
    if (def.extensions) {
      m.extensions = def.extensions;
      for (const k of Object.keys(def.extensions)) this.ext.add(k);
    }
    if (def.extras) m.extras = def.extras;
    this.j.materials.push(m);
    return this.j.materials.length - 1;
  }

  /** Adds a mesh with one primitive per material group. */
  meshOf(mesh, materialIndex, opt = {}) {
    mesh.compact();
    const pos = new Float32Array(mesh.pos);
    const nrm = mesh.computeNormals();
    const uv = new Float32Array(mesh.uv);
    const idx = new Uint32Array(mesh.idx);
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (let i = 0; i < pos.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        mn[k] = Math.min(mn[k], pos[i + k]);
        mx[k] = Math.max(mx[k], pos[i + k]);
      }
    }
    const prim = {
      attributes: {
        POSITION: this.accessor(pos, "VEC3", COMP.FLOAT, { min: mn, max: mx, target: 34962 }),
        NORMAL: this.accessor(nrm, "VEC3", COMP.FLOAT, { target: 34962 }),
        TEXCOORD_0: this.accessor(uv, "VEC2", COMP.FLOAT, { target: 34962 }),
      },
      indices: this.accessor(idx, "SCALAR", COMP.UNSIGNED_INT, { target: 34963 }),
      material: materialIndex,
      mode: 4,
    };
    if (opt.tangents) {
      prim.attributes.TANGENT = this.accessor(mesh.computeTangents(), "VEC4", COMP.FLOAT, { target: 34962 });
    }
    if (mesh.color.length) {
      const c = new Float32Array(mesh.color);
      prim.attributes.COLOR_0 = this.accessor(c, "VEC3", COMP.FLOAT, { target: 34962 });
    }
    if (mesh.skin) {
      const n = mesh.vertexCount;
      const joints = new Uint16Array(n * 4);
      const weights = new Float32Array(n * 4);
      const sw = mesh.sw;
      const st = Math.min(sw.length / 4, n);
      for (let vi = 0; vi < n; vi++) {
        if (vi < st) {
          joints[vi * 4] = sw[vi * 4]; weights[vi * 4] = sw[vi * 4 + 1];
          joints[vi * 4 + 1] = sw[vi * 4 + 2]; weights[vi * 4 + 1] = sw[vi * 4 + 3];
        } else {
          joints[vi * 4] = 0; weights[vi * 4] = 1;
        }
      }
      prim.attributes.JOINTS_0 = this.accessor(joints, "VEC4", COMP.UNSIGNED_SHORT, { target: 34962 });
      prim.attributes.WEIGHTS_0 = this.accessor(weights, "VEC4", COMP.FLOAT, { target: 34962 });
    }
    this.j.meshes.push({ name: mesh.name, primitives: [prim] });
    return this.j.meshes.length - 1;
  }

  node(def) {
    this.j.nodes.push(def);
    return this.j.nodes.length - 1;
  }

  skin(jointNodes, ibms) {
    const acc = this.accessor(new Float32Array(ibms.flat()), "MAT4", COMP.FLOAT);
    this.j.skins.push({ joints: jointNodes, inverseBindMatrices: acc });
    return this.j.skins.length - 1;
  }

  write(file) {
    const json = JSON.parse(JSON.stringify(this.j));
    if (this.ext.size) json.extensionsUsed = [...this.ext];
    const bin = Buffer.concat(this.chunks);
    json.buffers = [{ byteLength: bin.length }];
    let jsonBuf = Buffer.from(JSON.stringify(json), "utf8");
    while (jsonBuf.length % 4 !== 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.from(" ")]);
    let binBuf = bin;
    while (binBuf.length % 4 !== 0) binBuf = Buffer.concat([binBuf, Buffer.from([0])]);
    const total = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
    const head = Buffer.alloc(12);
    head.writeUInt32LE(0x46546c67, 0);
    head.writeUInt32LE(2, 4);
    head.writeUInt32LE(total, 8);
    const jh = Buffer.alloc(8);
    jh.writeUInt32LE(jsonBuf.length, 0);
    jh.writeUInt32LE(0x4e4f534a, 4);
    const bh = Buffer.alloc(8);
    bh.writeUInt32LE(binBuf.length, 0);
    bh.writeUInt32LE(0x004e4942, 4);
    fs.writeFileSync(file, Buffer.concat([head, jh, jsonBuf, bh, bh && binBuf]));
    return total;
  }
}
