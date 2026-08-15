const fs = require('fs');
const path = require('path');

const files = [
  path.resolve(__dirname, '../dist/live2d/MassageSeacubus_rei.moc3'),
  path.resolve(__dirname, '../dist/live2d/MassageSeacubus_rei.4096/texture_00.png'),
];

console.log('[Live2D Verify] Checking production assets...');

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`[Live2D Verify] Missing: ${path.relative(process.cwd(), file)}`);
    process.exit(1);
  }

  const size = fs.statSync(file).size;
  if (size <= 0) {
    console.error(`[Live2D Verify] Empty file: ${path.relative(process.cwd(), file)}`);
    process.exit(1);
  }

  console.log(`[Live2D Verify] OK: ${path.relative(process.cwd(), file)} (${size} bytes)`);
}

const mocPath = files[0];
const mocHeader = fs.readFileSync(mocPath).subarray(0, 4).toString('ascii');
if (mocHeader !== 'moc3') {
  console.error(`[Live2D Verify] Invalid moc3 header: ${JSON.stringify(mocHeader)}`);
  process.exit(1);
}

const texPath = files[1];
const pngHeader = fs.readFileSync(texPath).subarray(0, 8);
const expectedPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!pngHeader.equals(expectedPng)) {
  console.error('[Live2D Verify] Invalid PNG texture header.');
  process.exit(1);
}

console.log('[Live2D Verify] moc3 header OK. PNG texture header OK.');
console.log('[Live2D Verify] All Live2D production assets are valid.');
