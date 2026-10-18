/**
 * Functional test of the configurator interactions (not just rendering):
 * colourway -> frame material, strap -> visibility, upload -> screen texture,
 * preset -> camera, screenshot -> data URL.
 *
 *   xvfb-run -a node tools/features.mjs
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const out = { checks: [], pass: 0, fail: 0 };
const ok = (name, cond, detail = "") => {
  out.checks.push({ name, ok: !!cond, detail });
  if (cond) out.pass++; else out.fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
};

const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  headless: false,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForFunction(() => window.__app?.ready === true, null, { timeout: 180000 });
await page.evaluate(() => document.body.classList.add("capture"));
await page.evaluate(() => { window.__store.getState().setCameraPreset("front"); window.__snapCamera("front"); });
await page.waitForTimeout(900);

// 1. colourway changes the frame material
const frameBefore = await page.evaluate(() => window.__scene.getObjectByName("Frame").material.color.getHexString());
await page.evaluate(() => window.__store.getState().setBodyColor("pearl"));
await page.waitForTimeout(350);
const pearl = await page.evaluate(() => {
  const m = window.__scene.getObjectByName("Frame").material;
  return { color: m.color.getHexString(), metalness: m.metalness };
});
ok("colourway switches frame colour", pearl.color !== frameBefore, `${frameBefore} -> ${pearl.color}`);
ok("ceramic body is non-metallic", pearl.metalness === 0, `metalness=${pearl.metalness}`);

// 2. strap switching shows exactly one strap pair
await page.evaluate(() => window.__store.getState().setBandType("woven"));
await page.waitForTimeout(300);
const vis = await page.evaluate(() => {
  const r = {};
  for (const t of ["tpu", "leather", "woven", "metal", "mesh"]) {
    r[t] = ["R", "L"].map((s) => !!window.__scene.getObjectByName(`Band_${t}_${s}`)?.visible);
  }
  return r;
});
ok("only the selected strap is visible", vis.woven.every(Boolean) && !vis.tpu.some(Boolean) && !vis.metal.some(Boolean), JSON.stringify(vis));

// 3. band colour is applied
await page.evaluate(() => window.__store.getState().setBandColor("#7a4a2a"));
await page.waitForTimeout(300);
const bandColor = await page.evaluate(() => window.__scene.getObjectByName("Band_woven_R").material.color.getHexString());
ok("strap colour picker applies", bandColor === "7a4a2a", bandColor);

// 4. upload replaces the screen texture
const before = await page.screenshot({ clip: { x: 350, y: 300, width: 200, height: 200 } });
const dataUrl = await page.evaluate(async () => {
  const c = document.createElement("canvas");
  c.width = 212; c.height = 520;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 520);
  grad.addColorStop(0, "#0b3d91");
  grad.addColorStop(1, "#ff2d55");
  g.fillStyle = grad;
  g.fillRect(0, 0, 212, 520);
  g.fillStyle = "#fff";
  g.font = "bold 64px sans-serif";
  g.fillText("TEST", 20, 280);
  const img = new Image();
  img.src = c.toDataURL();
  await img.decode();
  window.__store.getState().setCustomScreenImage(img);
  return c.toDataURL().length;
});
await page.waitForTimeout(600);
const after = await page.screenshot({ clip: { x: 350, y: 300, width: 200, height: 200 } });
const changed = Buffer.compare(before, after) !== 0;
ok("uploaded image replaces the watch face", changed, `png bytes ${before.length} -> ${after.length}`);
fs.writeFileSync("snapshots/feature-custom-face.png", after);

// 5. camera preset moves the camera
const p0 = await page.evaluate(() => window.__camera.position.toArray().map((v) => +v.toFixed(1)));
await page.evaluate(() => { window.__store.getState().setCameraPreset("left"); window.__snapCamera("left"); });
await page.waitForTimeout(400);
const p1 = await page.evaluate(() => window.__camera.position.toArray().map((v) => +v.toFixed(1)));
ok("camera preset changes viewpoint", JSON.stringify(p0) !== JSON.stringify(p1), `${p0} -> ${p1}`);

// 6. screenshot API returns a PNG data URL
const shot = await page.evaluate(() => window.__shot());
ok("canvas screenshot returns PNG data URL", shot.startsWith("data:image/png;base64,") && shot.length > 20000, `${Math.round(shot.length / 1024)} KB`);

// 7. bend slider drives the bones
await page.evaluate(() => window.__store.getState().setBend(1));
await page.waitForTimeout(300);
const boneQ = await page.evaluate(() => {
  const b = window.__scene.getObjectByName("Bone_tpu_R_3");
  return b.quaternion.toArray().map((v) => +v.toFixed(3));
});
await page.evaluate(() => window.__store.getState().setBend(0));
await page.waitForTimeout(300);
const boneQ0 = await page.evaluate(() => {
  const b = window.__scene.getObjectByName("Bone_tpu_R_3");
  return b.quaternion.toArray().map((v) => +v.toFixed(3));
});
ok("bend slider rotates the strap bones", JSON.stringify(boneQ) !== JSON.stringify(boneQ0), `${boneQ0} -> ${boneQ}`);

fs.writeFileSync("snapshots/features.json", JSON.stringify(out, null, 2));
console.log(`\n${out.pass} passed, ${out.fail} failed`);
await browser.close();
process.exit(out.fail ? 1 : 0);
