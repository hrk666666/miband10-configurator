import fs from "node:fs";
import path from "node:path";
import { Glb, M4 } from "./lib/glb.mjs";
import {
  D, buildFrame, buildGlassBezel, buildGlassWindow, buildScreen, buildBack,
  buildSensorHousing, buildSensorWindows, buildPins, buildLatch,
} from "./lib/body.mjs";
import { buildHalfBand, buildMetalBand, BAND_SPEC, N_BONES } from "./lib/band.mjs";

const TEX = "model/tex";
const OUT = "public/models";
fs.mkdirSync(OUT, { recursive: true });

const g = new Glb("Mi-Smart-Band-10 configurator / procedural build");

// ---------------------------------------------------------------- textures
const T = {
  screen: g.image(path.join(TEX, "screen_face.png")),
  back: g.image(path.join(TEX, "back_tex.png")),
  brushedRough: g.image(path.join(TEX, "brushed_rough.png")),
  sandblastN: g.image(path.join(TEX, "sandblast_normal.png")),
  tpuN: g.image(path.join(TEX, "tpu_normal.png")),
  tpuR: g.image(path.join(TEX, "tpu_rough.png")),
  leatherN: g.image(path.join(TEX, "leather_normal.png")),
  leatherR: g.image(path.join(TEX, "leather_rough.png")),
  weaveBase: g.image(path.join(TEX, "weave_base.png")),
  weaveN: g.image(path.join(TEX, "weave_normal.png")),
  weaveR: g.image(path.join(TEX, "weave_rough.png")),
  backN: g.image(path.join(TEX, "back_normal.png")),
  backR: g.image(path.join(TEX, "back_rough.png")),
  meshN: g.image(path.join(TEX, "mesh_normal.png")),
  meshR: g.image(path.join(TEX, "mesh_rough.png")),
};

const hex = (h) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

// NOTE: colours are engine albedo, not screen-sampled pixels. They were tuned so that the
// rendered pixel colour matches the reference renders under the shipped HDRI (see docs/materials.md).
export const MAT = {
  frame: g.material({
    name: "Frame",
    pbr: {
      baseColorFactor: hex("#2b2b2e"),
      metallicFactor: 1.0,
      roughnessFactor: 0.38,
      metallicRoughnessTexture: { index: T.brushedRough },
    },
    normalTexture: { index: T.sandblastN, scale: 0.35 },
  }),
  glass: g.material({
    name: "GlassBezel",
    pbr: { baseColorFactor: hex("#050506"), metallicFactor: 0.0, roughnessFactor: 0.045 },
    extensions: { KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.02 } },
  }),
  glassWindow: g.material({
    name: "GlassWindow",
    pbr: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.0, roughnessFactor: 0.02 },
    extensions: {
      KHR_materials_transmission: { transmissionFactor: 0.94 },
      KHR_materials_ior: { ior: 1.52 },
      KHR_materials_clearcoat: { clearcoatFactor: 1.0, clearcoatRoughnessFactor: 0.01 },
    },
  }),
  screen: g.material({
    name: "Screen",
    pbr: { baseColorFactor: [0.01, 0.01, 0.012, 1], metallicFactor: 0.0, roughnessFactor: 0.34 },
    emissiveFactor: [1.0, 1.0, 1.0],
    emissiveTexture: { index: T.screen },
  }),
  back: g.material({
    name: "BackCover",
    pbr: {
      baseColorFactor: hex("#1b1b1d"),
      metallicFactor: 0.25,
      roughnessFactor: 0.55,
      baseColorTexture: { index: T.back },
      metallicRoughnessTexture: { index: T.backR },
    },
    normalTexture: { index: T.backN, scale: 0.4 },
  }),
  sensor: g.material({
    name: "SensorHousing",
    pbr: { baseColorFactor: hex("#141416"), metallicFactor: 0.1, roughnessFactor: 0.42 },
  }),
  windows: g.material({
    name: "SensorWindow",
    pbr: { baseColorFactor: hex("#cfd2d4"), metallicFactor: 0.0, roughnessFactor: 0.22 },
    emissiveFactor: [0.02, 0.03, 0.025],
  }),
  pin: g.material({
    name: "ChargingPin",
    pbr: { baseColorFactor: hex("#d8b35e"), metallicFactor: 1.0, roughnessFactor: 0.24 },
  }),
  latch: g.material({
    name: "Latch",
    pbr: { baseColorFactor: hex("#232326"), metallicFactor: 0.15, roughnessFactor: 0.5 },
  }),
  bandTpu: g.material({
    name: "BandTPU",
    pbr: {
      baseColorFactor: hex("#232327"), metallicFactor: 0.0, roughnessFactor: 0.52,
      metallicRoughnessTexture: { index: T.tpuR },
    },
    normalTexture: { index: T.tpuN, scale: 0.5 },
  }),
  bandLeather: g.material({
    name: "BandLeather",
    pbr: {
      baseColorFactor: hex("#6b4a35"), metallicFactor: 0.0, roughnessFactor: 0.62,
      metallicRoughnessTexture: { index: T.leatherR },
    },
    normalTexture: { index: T.leatherN, scale: 2.2 },
  }),
  bandWoven: g.material({
    name: "BandWoven",
    pbr: {
      baseColorFactor: hex("#8a6b52"), metallicFactor: 0.0, roughnessFactor: 0.7,
      baseColorTexture: { index: T.weaveBase },
      metallicRoughnessTexture: { index: T.weaveR },
    },
    normalTexture: { index: T.weaveN, scale: 1.0 },
  }),
  bandMetal: g.material({
    name: "BandMetal",
    pbr: {
      baseColorFactor: hex("#b9bbbd"), metallicFactor: 1.0, roughnessFactor: 0.28,
      metallicRoughnessTexture: { index: T.brushedRough },
    },
  }),
  bandMesh: g.material({
    name: "BandMesh",
    pbr: {
      baseColorFactor: hex("#b0b2b4"), metallicFactor: 1.0, roughnessFactor: 0.3,
      metallicRoughnessTexture: { index: T.meshR },
    },
    normalTexture: { index: T.meshN, scale: 1.0 },
  }),
};

// ---------------------------------------------------------------- nodes
const root = g.node({ name: "MiBand10", matrix: M4.rotZ(90), children: [] });
g.j.scenes[0].nodes.push(root);
const skeletonRoot = g.node({ name: "Skeletons", matrix: M4.rotZ(90), children: [] });
g.j.scenes[0].nodes.push(skeletonRoot);

const NORMAL_MATS = new Set([MAT.frame, MAT.back, MAT.bandTpu, MAT.bandLeather, MAT.bandWoven, MAT.bandMesh]);
const addMeshNode = (name, mesh, mat, parent = root) => {
  const mi = g.meshOf(mesh, mat, { tangents: NORMAL_MATS.has(mat) });
  const ni = g.node({ name, mesh: mi });
  g.j.nodes[parent].children.push(ni);
  return ni;
};

// body
addMeshNode("Frame", buildFrame(), MAT.frame);
addMeshNode("GlassBezel", buildGlassBezel(), MAT.glass);
addMeshNode("GlassWindow", buildGlassWindow(), MAT.glassWindow);
addMeshNode("Screen", buildScreen(), MAT.screen);
addMeshNode("BackCover", buildBack(), MAT.back);
addMeshNode("SensorHousing", buildSensorHousing(), MAT.sensor);
addMeshNode("SensorWindows", buildSensorWindows(), MAT.windows);
addMeshNode("ChargingPins", buildPins(), MAT.pin);
addMeshNode("Latch", buildLatch(), MAT.latch);

// ---------------------------------------------------------------- bands + skeletons
const BAND_MAT = {
  tpu: MAT.bandTpu, leather: MAT.bandLeather, woven: MAT.bandWoven,
  metal: MAT.bandMetal, mesh: MAT.bandMesh,
};

const rigInfo = {};

function rigHalf(type, side, mesh) {
  const frames = mesh.skin.frames;
  const n = frames.length;
  const stationOf = (b) => Math.round((b / (N_BONES - 1)) * (n - 1));
  const worlds = [];
  for (let b = 0; b < N_BONES; b++) {
    const f = frames[stationOf(b)];
    worlds.push(M4.fromFrame(f.pos, f.tangent, f.across, f.normal));
  }
  const jointNodes = [];
  for (let b = 0; b < N_BONES; b++) {
    const local = b === 0 ? worlds[0] : M4.mul(M4.invRigid(worlds[b - 1]), worlds[b]);
    const node = { name: `Bone_${type}_${side > 0 ? "R" : "L"}_${b}`, matrix: local };
    const idx = g.node(node);
    jointNodes.push(idx);
    if (b === 0) g.j.nodes[skeletonRoot].children.push(idx);
    else {
      const p = g.j.nodes[jointNodes[b - 1]];
      p.children = p.children || [];
      p.children.push(idx);
    }
  }
  // joint world = Rx(-90) * deviceWorld, so the skeleton carries the up-axis conversion
  const ibms = worlds.map((w) => M4.invRigid(M4.mul(M4.rotZ(90), w)));
  const skinIdx = g.skin(jointNodes, ibms);
  // skinned vertices must be authored in the skeleton's space: the joint world matrices
  // already contain Rz(90), so bake it into the band vertices (bindMatrix stays identity).
  const mz = M4.rotZ(90);
  for (let i = 0; i < mesh.pos.length; i += 3) {
    const x = mesh.pos[i], y = mesh.pos[i + 1], z = mesh.pos[i + 2];
    mesh.pos[i] = mz[0] * x + mz[4] * y + mz[8] * z;
    mesh.pos[i + 1] = mz[1] * x + mz[5] * y + mz[9] * z;
    mesh.pos[i + 2] = mz[2] * x + mz[6] * y + mz[10] * z;
  }
  const mi = g.meshOf(mesh, BAND_MAT[type], { tangents: true });
  // skinned mesh nodes are scene-root nodes (glTF requirement)
  const ni = g.node({ name: `Band_${type}_${side > 0 ? "R" : "L"}`, mesh: mi, skin: skinIdx });
  g.j.scenes[0].nodes.push(ni);
  return { skinIdx, jointNodes, node: ni };
}

for (const type of Object.keys(BAND_SPEC)) {
  for (const side of [1, -1]) {
    const mesh = type === "metal" ? buildMetalBand(side) : buildHalfBand(type, side, {
      tailLift: 0,
    });
    const info = rigHalf(type, side, mesh);
    rigInfo[`${type}_${side > 0 ? "R" : "L"}`] = {
      skin: info.skinIdx, joints: info.jointNodes, node: info.node,
      tris: mesh.idx.length / 3, verts: mesh.vertexCount,
    };
  }
}

const file = path.join(OUT, "miband10.glb");
const bytes = g.write(file);
fs.writeFileSync(path.join(OUT, "model-manifest.json"), JSON.stringify({
  built: new Date().toISOString(),
  dimensions: D,
  materials: Object.fromEntries(Object.entries(MAT)),
  bands: rigInfo,
  bytes,
}, null, 2));

const tris = g.j.meshes.reduce((a, m) => a + 1, 0);
console.log(`wrote ${file}  ${(bytes / 1024 / 1024).toFixed(2)} MB  meshes=${tris}`);
