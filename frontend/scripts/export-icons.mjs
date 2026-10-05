/** Zero-cost icon export: rasterizes public/assets/Logo (2).svg via sharp. */
import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "public", "assets", "Logo (2).svg");

const targets = [
  { file: "app/apple-icon.png", size: 180 },
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
];

for (const t of targets) {
  await sharp(src)
    .resize(t.size, t.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(root, t.file));
  console.log(`wrote ${t.file} (${t.size}x${t.size})`);
}
