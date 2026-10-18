import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:900,height:800} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.waitForTimeout(1000);
const out = await p.evaluate(() => {
  const res = [];
  const v = new (window.__scene.constructor.prototype.constructor === Object ? Object : Object)();
  window.__scene.updateMatrixWorld(true);
  window.__scene.traverse((o) => {
    if (/^Bone_tpu_R_\d$/.test(o.name)) {
      const p3 = o.getWorldPosition(new (o.position.constructor)());
      res.push([o.name, +p3.x.toFixed(1), +p3.y.toFixed(1), +p3.z.toFixed(1)]);
    }
  });
  const root = window.__scene.getObjectByName("MiBand10");
  const q = root ? root.quaternion.toArray().map(n=>+n.toFixed(3)) : null;
  return { bones: res, rootQ: q };
});
console.log(JSON.stringify(out, null, 0));
await b.close();
