import { superellipseOutline, offsetOutline } from "../model/lib/mathx.mjs";
import fs from "node:fs";
const OUT = superellipseOutline(23.285, 11.27, 2.79, 512);
const pts = OUT.pts;
console.log("x range", Math.min(...pts.map(p=>p[0])).toFixed(2), Math.max(...pts.map(p=>p[0])).toFixed(2));
console.log("y range", Math.min(...pts.map(p=>p[1])).toFixed(2), Math.max(...pts.map(p=>p[1])).toFixed(2));
for (const f of [0.5,0.7,0.8,0.9,0.95,0.99]) {
  const x = 23.285*f;
  const near = pts.reduce((a,p)=> Math.abs(p[0]-x) < Math.abs(a[0]-x) ? p : a, pts[0]);
  console.log(`x/a=${f}  x=${x.toFixed(1)}  y=${near[1].toFixed(2)}`);
}
// svg preview
const S = 40;
let d = pts.map((p,i)=>`${i?'L':'M'}${(200+p[0]*S).toFixed(1)},${(300-p[1]*S).toFixed(1)}`).join(" ")+" Z";
fs.writeFileSync("/tmp/outline.html", `<html><body style="background:#fff"><svg width="400" height="600"><path d="${d}" fill="#222"/></svg></body></html>`);
