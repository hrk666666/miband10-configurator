import { chromium } from "playwright-core";
const b = await chromium.launch({ executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome", headless:false,
  args:["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"] });
const p = await b.newPage({ viewport:{width:700,height:900} });
await p.goto("http://localhost:5173/", { waitUntil:"load" });
await p.waitForFunction(() => window.__app?.ready === true, null, { timeout:120000 });
await p.evaluate(() => { document.body.classList.add("capture"); window.__store.getState().setCameraPreset("front"); window.__snapCamera("front"); });
await p.waitForTimeout(900);
const res = await p.evaluate(() => {
  const o = window.__scene.getObjectByName("Screen");
  const m = o.material;
  return { type: m.type, color: m.color.getHexString(), emissive: m.emissive.getHexString(), ei: m.emissiveIntensity,
    map: m.map && m.map.image ? [m.map.image.width, m.map.image.height] : null,
    emap: m.emissiveMap && m.emissiveMap.image ? [m.emissiveMap.image.width, m.emissiveMap.image.height] : null,
    env: m.envMapIntensity, rough: m.roughness, metal: m.metalness, mapColorSpace: m.map?.colorSpace };
});
console.log(JSON.stringify(res));
await p.evaluate(() => { const m = window.__scene.getObjectByName("Screen").material; m.emissiveIntensity = 0; m.needsUpdate = true; });
await p.waitForTimeout(400);
await p.screenshot({ path: "/tmp/iso_e0.png", clip:{x:330,y:560,width:60,height:60} });
await b.close();
