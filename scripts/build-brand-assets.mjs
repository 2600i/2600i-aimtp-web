/**
 * Derives every brand raster this site serves from one vendored source file.
 *
 * The source is the shared 2600i artwork as it ships on the sibling homeschool
 * site: the dart, the "2600i" numerals, the blue accent on the "i", and a
 * sub-brand line ("HOMESCHOOL") tracked out underneath. AIMTP is a different
 * sub-brand of the same entity, so it needs the same mark with a different word
 * beneath it — and that word is set as live text in the page rather than drawn
 * into a raster. Same technique the sibling already uses for its tagline: it
 * stays sharp at any size, is selectable and readable aloud, and can be
 * restyled without re-exporting anything.
 *
 * So the only thing this script really does is cut the sub-brand line off and
 * trim to ink. No new logo is created here.
 *
 * Run: npm run brand
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "assets/brand/2600i-lockup-source.webp");
const OUT_DIR = path.join(root, "public/brand");

/**
 * Measured from the source's own alpha channel rather than hardcoded, so a
 * re-exported source with different padding still lands correctly.
 *
 * The lockup has a clean horizontal band of zero ink between the numerals and
 * the sub-brand line (rows 202-238 in the current artwork). Splitting on the
 * widest such gap is what separates "the mark" from "the word underneath it"
 * without knowing either one's position in advance.
 */
async function inkRows(image) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const rows = new Array(height).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] > 24) rows[y] += 1;
    }
  }
  return { rows, width, height, data, channels };
}

/** The tallest run of empty rows below the artwork's vertical midpoint. */
function subBrandSplit(rows) {
  let best = { start: -1, length: 0 };
  let runStart = -1;
  for (let y = Math.floor(rows.length / 2); y < rows.length; y += 1) {
    if (rows[y] === 0) {
      if (runStart === -1) runStart = y;
    } else if (runStart !== -1) {
      if (y - runStart > best.length) best = { start: runStart, length: y - runStart };
      runStart = -1;
    }
  }
  if (best.start === -1) throw new Error("No blank band found; is the source the expected lockup?");
  return best.start;
}

/** Tight bounding box of ink within rows [0, limit). */
function inkBounds({ data, width, channels }, limit) {
  let minX = width;
  let maxX = -1;
  let minY = limit;
  let maxY = -1;
  for (let y = 0; y < limit; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Bounding box of the accent on the "i" — the only saturated blue in the mark.
 */
async function accentBounds(image) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let maxX = -1;
  let minY = height;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const isAccent = data[i + 3] > 40 && data[i + 2] > 150 && data[i + 2] - data[i] > 60;
      if (!isAccent) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
    }
  }
  if (maxX === -1) throw new Error("No accent colour found in the mark");
  return { top: minY, centreX: (minX + maxX) / 2 };
}

async function main() {
  if (!existsSync(SOURCE)) throw new Error(`Missing source artwork: ${SOURCE}`);
  mkdirSync(OUT_DIR, { recursive: true });

  const source = sharp(SOURCE);
  const profile = await inkRows(source);
  const split = subBrandSplit(profile.rows);
  const box = inkBounds(profile, split);

  console.log(`source        ${profile.width}x${profile.height}`);
  console.log(`sub-brand cut  y=${split}`);
  console.log(`mark ink       ${box.width}x${box.height} at (${box.left},${box.top})`);

  /*
   * The full mark, trimmed to its own ink so the "2" starts exactly where the
   * image does. The hero sets it flush against the headline below it, and any
   * baked-in padding would show up there as an unexplained indent.
   */
  await sharp(SOURCE)
    .extract(box)
    .webp({ quality: 92 })
    .toFile(path.join(OUT_DIR, "mark.webp"));
  console.log(`wrote          public/brand/mark.webp (${box.width}x${box.height})`);

  /*
   * A square icon for the tab and the home screen. The full mark is ~5.4:1 and
   * turns to mush at 32px, so the icon is the one part of the lockup that still
   * reads there: the "i", its blue accent, and the dart arriving over it.
   *
   * Located by finding the accent itself rather than by hardcoded coordinates —
   * it is the only saturated blue in an otherwise cream-on-transparent mark, so
   * it is trivially separable and it moves with the artwork if that is ever
   * re-exported.
   */
  const mark = sharp(path.join(OUT_DIR, "mark.webp"));
  const accent = await accentBounds(mark);
  // Square, from just above the accent down to the mark's baseline, centred on
  // the accent's own midline. Padding above the dot keeps the dart in frame.
  const side = Math.min(box.height, box.height - accent.top + 20);
  const iconBox = {
    left: Math.max(0, Math.min(box.width - side, Math.round(accent.centreX - side / 2))),
    top: Math.max(0, box.height - side),
    width: side,
    height: side,
  };
  const glyph = await mark.clone().extract(iconBox).resize(384, 384).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 5, g: 6, b: 8, alpha: 1 } },
  })
    .composite([{ input: glyph, gravity: "centre" }])
    .png()
    .toFile(path.join(OUT_DIR, "icon.png"));
  console.log(`wrote          public/brand/icon.png (512x512, glyph ${side}px)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
