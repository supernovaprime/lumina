/** Exports optimized raster sizes from the master SVG logo via sharp. */
import sharp from "sharp";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "public", "assets", "logo.svg");
const background = { r: 10, g: 14, b: 26, alpha: 1 };

const targets = [
  { file: "public/assets/logo-mark.png", size: 256 },
  { file: "app/icon.png", size: 512 },
  { file: "app/apple-icon.png", size: 180 },
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
];

for (const target of targets) {
  await sharp(src, { density: 144 })
    .resize(target.size, target.size, { fit: "contain", background })
    .flatten({ background })
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toFile(path.join(root, target.file));
  console.log(`wrote ${target.file} (${target.size}x${target.size})`);
}
