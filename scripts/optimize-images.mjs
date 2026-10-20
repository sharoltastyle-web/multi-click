// Compresses the source illustrations in assets/ into WebP files under src/assets/images/,
// and generates the PWA icons under public/icons/ from assets/app-icon.png.
// Run with `npm run images` whenever a source illustration changes.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'assets';
const OUT = 'src/assets/images';
const ICONS_OUT = 'public/icons';

const jobs = [
  { name: 'hero', resize: { width: 960 } },
  { name: 'header-bg', resize: { width: 960 } },
  { name: 'avatar-1', resize: { width: 256, height: 256 } },
  { name: 'avatar-2', resize: { width: 256, height: 256 } },
  { name: 'avatar-3', resize: { width: 256, height: 256 } },
];

await mkdir(OUT, { recursive: true });
for (const job of jobs) {
  const info = await sharp(`${SRC}/${job.name}.png`)
    .resize(job.resize)
    .webp({ quality: 80 })
    .toFile(`${OUT}/${job.name}.webp`);
  console.log(`${job.name}.webp  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}

// PWA icons. The icon background is a flat color, so the maskable version is the
// icon scaled to 80% and centered on that same color (keeps the × inside the safe zone).
const ICON_SRC = `${SRC}/app-icon.png`;
const { data: corner } = await sharp(ICON_SRC)
  .extract({ left: 4, top: 4, width: 1, height: 1 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const background = { r: corner[0], g: corner[1], b: corner[2], alpha: 1 };

await mkdir(ICONS_OUT, { recursive: true });
const icons = [
  { file: 'pwa-192.png', size: 192 },
  { file: 'pwa-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
];
for (const icon of icons) {
  const info = await sharp(ICON_SRC)
    .resize(icon.size, icon.size)
    .flatten({ background })
    .png({ compressionLevel: 9 })
    .toFile(`${ICONS_OUT}/${icon.file}`);
  console.log(`${icon.file}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB`);
}

const MASKABLE = 512;
const inner = Math.round(MASKABLE * 0.8);
const scaled = await sharp(ICON_SRC).resize(inner, inner).png().toBuffer();
const maskable = await sharp({
  create: { width: MASKABLE, height: MASKABLE, channels: 4, background },
})
  .composite([{ input: scaled, gravity: 'center' }])
  .flatten({ background })
  .png({ compressionLevel: 9 })
  .toFile(`${ICONS_OUT}/maskable-512.png`);
console.log(`maskable-512.png  ${maskable.width}x${maskable.height}  ${Math.round(maskable.size / 1024)} KB`);
