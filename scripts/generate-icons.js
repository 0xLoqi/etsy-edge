/**
 * Generate extension icons as simple PNG files.
 * Uses canvas to create orange "EE" icons at required sizes.
 * Run: node scripts/generate-icons.js
 *
 * For now, we create placeholder SVG icons that Chrome can use.
 * Replace with proper designed icons before Chrome Web Store submission.
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "public", "icons");

mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 128];

function createSvgIcon(size) {
  const fontSize = Math.round(size * 0.4);
  const radius = Math.round(size * 0.15);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#ea580c"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}"
        font-weight="800" fill="white">EE</text>
</svg>`;
}

for (const size of sizes) {
  const svg = createSvgIcon(size);
  const path = join(iconsDir, `icon-${size}.svg`);
  writeFileSync(path, svg);
  console.log(`Created ${path}`);
}

console.log("\nDone! SVG icons created.");
console.log("Note: Convert to PNG before Chrome Web Store submission.");
console.log("Use: npx sharp-cli -i public/icons/icon-128.svg -o public/icons/icon-128.png");
