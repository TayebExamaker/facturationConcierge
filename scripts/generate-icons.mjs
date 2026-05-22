#!/usr/bin/env node
/**
 * Generate PWA icons from the official Concierge One brand mark.
 *
 * Source : public/brand/logo.jpeg (black bg, white key)
 * Outputs:
 *   public/icons/icon-192.png         (192 x 192)
 *   public/icons/icon-512.png         (512 x 512)
 *   public/icons/apple-touch-icon.png (180 x 180)
 *   public/favicon.ico                (32 x 32 PNG renamed — browsers accept)
 *
 * Re-run after updating the source logo:
 *   node scripts/generate-icons.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const SOURCE = path.join(projectRoot, "public", "brand", "logo.jpeg");
const OUT_DIR = path.join(projectRoot, "public", "icons");
const FAVICON = path.join(projectRoot, "public", "favicon.ico");

const TARGETS = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

async function main() {
  try {
    await fs.access(SOURCE);
  } catch {
    console.error(`Source logo not found: ${SOURCE}`);
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const { file, size } of TARGETS) {
    const out = path.join(OUT_DIR, file);
    await sharp(SOURCE)
      .resize(size, size, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  ✓ ${path.relative(projectRoot, out)}  (${size}x${size})`);
  }

  // Favicon: a 32x32 PNG renamed to .ico — accepted by every modern browser.
  await sharp(SOURCE)
    .resize(32, 32, { fit: "cover" })
    .png({ compressionLevel: 9 })
    .toFile(FAVICON);
  console.log(`  ✓ ${path.relative(projectRoot, FAVICON)}  (32x32)`);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
