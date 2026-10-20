// Compresses the source illustrations in assets/ into WebP files under src/assets/images/.
// Run with `npm run images` whenever a source illustration changes.
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const SRC = 'assets';
const OUT = 'src/assets/images';

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
