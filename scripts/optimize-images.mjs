import sharp from 'sharp';
const map = { 1: 'pilates-reformer', 2: 'boxing-studio', 3: 'aerial-hoop', 4: 'suspension' };
for (const [n, name] of Object.entries(map)) {
  await sharp(`scripts/${n}.png`).webp({ quality: 88 }).toFile(`public/images/${name}.webp`);
  console.log('wrote', name);
}
