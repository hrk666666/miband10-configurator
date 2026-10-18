/**
 * Automated visual test: every colourway x every strap x 7 camera presets.
 *
 *   xvfb-run -a node tools/shoot.mjs [--round 1]
 *
 * Writes snapshots/<round>/<colourway>/<strap>/<preset>.png and a run.json index.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const roundArg = args.includes("--round") ? args[args.indexOf("--round") + 1] : "1";
const OUT = `snapshots/round-${roundArg}`;
const COLORS = ["midnight", "glacier", "rose", "pearl", "glimmer"];
const BANDS = ["tpu", "leather", "woven", "metal", "mesh"];
const PRESETS = ["front", "back", "left", "right", "angle", "macro", "lug"];
const W = 900, H = 900;

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
  headless: false,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--disable-gpu-sandbox"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.waitForFunction(() => window.__app?.ready === true, null, { timeout: 180000 });
await page.evaluate(() => document.body.classList.add("capture"));
await page.waitForTimeout(1200);

const index = { round: roundArg, startedAt: new Date().toISOString(), shots: [], errors: [] };

for (const c of COLORS) {
  for (const b of BANDS) {
    for (const p of PRESETS) {
      await page.evaluate(({ c, b, p }) => {
        const s = window.__store.getState();
        s.setBodyColor(c);
        s.setBandType(b);
        s.setCameraPreset(p);
        window.__snapCamera(p);
      }, { c, b, p });
      await page.waitForTimeout(320);
      const dir = path.join(OUT, c, b);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${p}.png`);
      await page.screenshot({ path: file });
      index.shots.push({ color: c, band: b, preset: p, file, bytes: fs.statSync(file).size });
    }
  }
  console.log(`  ${c} done (${BANDS.length * PRESETS.length} shots)`);
}

index.errors = errors.slice(0, 40);
index.finishedAt = new Date().toISOString();
fs.writeFileSync(path.join(OUT, "run.json"), JSON.stringify(index, null, 2));
console.log(`\n${index.shots.length} screenshots -> ${OUT}`);
if (errors.length) console.log(`page errors: ${errors.length}\n${errors.slice(0, 5).join("\n")}`);
await browser.close();
