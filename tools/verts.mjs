import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:900,height:800} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.waitForTimeout(800);
const out = await p.evaluate(() => {
  const mesh = window.__scene.getObjectByName("Band_tpu_R");
  if (!mesh) return "no mesh";
  mesh.updateMatrixWorld(true);
  const pos = mesh.geometry.attributes.position;
  const res = { count: pos.count, isSkinned: !!mesh.isSkinnedMesh, bindMatrix: mesh.bindMatrix?.elements.map(n=>+n.toFixed(2)) };
  res.samples = [];
  const v = new (mesh.position.constructor)();
  for (const i of [0, 5, 12, 100, 500, 1000, 2000]) {
    v.fromBufferAttribute(pos, i);
    const before = v.toArray().map(n=>+n.toFixed(1));
    mesh.applyBoneTransform(i, v);
    const after = v.clone().applyMatrix4(mesh.matrixWorld).toArray().map(n=>+n.toFixed(1));
    res.samples.push({ i, before, after });
  }
  res.bones = mesh.skeleton.bones.map(bn => bn.name);
  return res;
});
console.log(JSON.stringify(out, null, 0));
await b.close();
