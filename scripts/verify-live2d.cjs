const fs = require('fs');
const path = require('path');

const distRoot = path.resolve(__dirname, '../dist/live2d');
const modelPath = path.join(distRoot, 'MassageSeacubus_rei.model3.json');
const mocPath = path.join(distRoot, 'MassageSeacubus_rei.moc3');
const texturePath = path.join(distRoot, 'MassageSeacubus_rei.4096', 'texture_00.png');

function fail(message) {
  console.error(`[Live2D Verify] ERROR: ${message}`);
  process.exit(1);
}

function readRequired(filePath, label) {
  if (!fs.existsSync(filePath)) fail(`Missing ${label}: ${filePath}`);
  return fs.readFileSync(filePath);
}

console.log('[Live2D Verify] Checking production assets...');

const modelBuffer = readRequired(modelPath, 'model3.json');
const mocBuffer = readRequired(mocPath, 'moc3');
const textureBuffer = readRequired(texturePath, 'texture');

let model;
try {
  model = JSON.parse(modelBuffer.toString('utf8'));
} catch (error) {
  fail(`Invalid model3.json: ${error.message}`);
}

if (mocBuffer.length < 64) {
  fail(`moc3 is unexpectedly small (${mocBuffer.length} bytes)`);
}

const mocHeader = mocBuffer.subarray(0, 4).toString('ascii');
if (mocHeader !== 'MOC3') {
  fail(`Invalid moc3 header: ${JSON.stringify(mocHeader)}`);
}

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
if (!textureBuffer.subarray(0, 8).equals(pngSignature)) {
  fail('Invalid PNG signature for texture_00.png');
}

const refs = model?.FileReferences || {};
if (refs.Moc !== 'MassageSeacubus_rei.moc3') {
  fail(`Unexpected Moc reference: ${JSON.stringify(refs.Moc)}`);
}
if (!Array.isArray(refs.Textures) || refs.Textures.length === 0) {
  fail('model3.json has no texture references');
}
if (refs.Textures[0] !== 'MassageSeacubus_rei.4096/texture_00.png') {
  fail(`Unexpected texture reference: ${JSON.stringify(refs.Textures[0])}`);
}

const referencedFiles = [
  refs.Physics,
  refs.DisplayInfo,
  refs.Motions?.Idle?.[0]?.File,
  ...(Array.isArray(refs.Expressions) ? refs.Expressions.map((entry) => entry.File) : []),
].filter(Boolean);

for (const relativeRef of referencedFiles) {
  const referencedPath = path.resolve(distRoot, relativeRef);
  if (!referencedPath.startsWith(`${distRoot}${path.sep}`)) {
    fail(`Unsafe model reference: ${relativeRef}`);
  }
  if (!fs.existsSync(referencedPath)) {
    fail(`Missing referenced Live2D asset: ${relativeRef}`);
  }
}

console.log(`[Live2D Verify] OK: ${path.relative(path.resolve(__dirname, '..'), mocPath)} (${mocBuffer.length} bytes)`);
console.log(`[Live2D Verify] OK: ${path.relative(path.resolve(__dirname, '..'), texturePath)} (${textureBuffer.length} bytes)`);
console.log('[Live2D Verify] OK: model3.json is valid and all referenced assets exist.');
