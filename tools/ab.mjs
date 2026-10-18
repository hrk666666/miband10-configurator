import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:700,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => { document.body.classList.add("capture"); window.__store.getState().setCameraPreset("front"); window.__snapCamera("front"); });
await p.waitForTimeout(900);
await p.screenshot({ path: "/tmp/ab_on.png" });
const info = await p.evaluate(() => {
  const s = window.__scene.getObjectByName("Screen");
  const w = window.__scene.getObjectByName("GlassWindow");
  return { screen: { color: s.material.color.getHexString(), em: s.material.emissive.getHexString(), ei: s.material.emissiveIntensity, env: s.material.envMapIntensity, map: !!s.material.map, emap: !!s.material.emissiveMap },
           win: { blending: w.material.blending, opacity: w.material.opacity, color: w.material.color.getHexString(), env: w.material.envMapIntensity } };
});
console.log(JSON.stringify(info));
await p.evaluate(() => { window.__setVis((n)=>n==="GlassWindow", false); });
await p.waitForTimeout(500);
await p.screenshot({ path: "/tmp/ab_off.png" });
await b.close();
