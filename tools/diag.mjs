import { chromium } from "playwright-core";
const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  headless: false,
  args: ["--no-sandbox","--enable-unsafe-swiftshader","--use-gl=angle","--use-angle=swiftshader","--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on("pageerror", (e) => console.log("[err]", e.message.slice(0,200)));
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForFunction(() => window.__app?.ready === true, null, { timeout: 120000 });
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__store.getState().setCameraPreset("front"); window.__snapCamera("front"); });
await page.waitForTimeout(1200);
console.log("cam", await page.evaluate(() => { const c = window.__scene?.parent; return null; }));

await page.screenshot({ path: "/tmp/front_all.png" });
const boxes = await page.evaluate(() => {
  const THREE = window.__three;
  const out = [];
  window.__scene.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox;
    out.push({ name: o.name, visible: o.visible, min: b.min.toArray().map(v=>+v.toFixed(1)), max: b.max.toArray().map(v=>+v.toFixed(1)) });
  });
  return out;
});
console.log(JSON.stringify(boxes, null, 0));
await page.evaluate(() => window.__setVis((n) => n.startsWith("Band_"), false));
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/front_body.png" });
await page.evaluate(() => { window.__setVis(() => true, false); window.__setVis((n)=> n==="Band_tpu_R"||n==="Band_tpu_L", true); });
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/front_band.png" });
await browser.close();
