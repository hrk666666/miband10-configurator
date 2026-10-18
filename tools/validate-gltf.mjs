import fs from "node:fs";
import path from "node:path";
import validator from "gltf-validator";

const file = process.argv[2] || "public/models/miband10.glb";
const bytes = new Uint8Array(fs.readFileSync(file));
const report = await validator.validateBytes(bytes, { uri: path.basename(file), maxIssues: 50 });
const { numErrors, numWarnings, numInfos, numHints } = report.issues;
const info = report.info;
console.log(`file      : ${file}  (${(bytes.length / 1048576).toFixed(2)} MB)`);
console.log(`generator : ${info.generator}`);
console.log(`triangles : ${info.totalTriangleCount}`);
console.log(`vertices  : ${info.totalVertexCount}`);
console.log(`materials : ${info.materialCount}   meshes: ${info.meshCount}  nodes: ${info.nodeCount}  skins: ${info.skinCount}`);
console.log(`draw calls: ${info.drawCallCount}`);
console.log(`issues    : ${numErrors} errors, ${numWarnings} warnings, ${numInfos} infos, ${numHints} hints`);
for (const m of report.issues.messages.slice(0, 20)) {
  console.log(`  [${m.severity}] ${m.code} ${m.pointer || ""} — ${m.message}`);
}
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/gltf-validation.json", JSON.stringify(report, null, 2));
process.exit(numErrors > 0 ? 1 : 0);
