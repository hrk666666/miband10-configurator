import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:760,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => { window.__store.getState().setCameraPreset("front"); window.__snapCamera("front"); });
await p.waitForTimeout(900);
await p.evaluate(() => { window.__setVis((n)=>n==="GlassWindow"||n==="GlassBezel", false); });
await p.waitForTimeout(400);
await p.screenshot({ path: "/tmp/screen_only.png" });
const info = await p.evaluate(() => {
  const out = {};
  for (const n of ["Screen","GlassWindow","GlassBezel"]) {
    const o = window.__scene.getObjectByName(n);
    const uv = o.geometry.attributes.uv;
    out[n] = { uvCount: uv.count, uv0: Array.from(uv.array.slice(0,4)).map(v=>+v.toFixed(2)), mat: o.material.type, side: o.material.side, transparent: o.material.transparent, opacity: o.material.opacity, emissiveMap: !!o.material.emissiveMap };
  }
  return out;
});
console.log(JSON.stringify(info,null,1));
await b.close();
