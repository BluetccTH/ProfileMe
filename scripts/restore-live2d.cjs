const fs = require('fs');
const path = require('path');

const EXPECTED_MOC3_SIZE = 2628790;
const EXPECTED_TEXTURE_SIZE = 3603048;
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x0d, 0x0a, 0x1a, 0x0a]);

function isValidMoc(file) {
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  if (stat.size !== EXPECTED_MOC3_SIZE) return false;
  const header = fs.readFileSync(file).subarray(0, 4).toString('ascii');
  return header === 'MOC3';
}

function isValidTexture(file) {
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  if (stat.size !== EXPECTED_TEXTURE_SIZE) return false;
  const header = fs.readFileSync(file).subarray(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return header.equals(expected);
}

function restoreAssets() {
  const publicMoc = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.moc3');
  const publicTex = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.4096/texture_00.png');

  // Keep the known-good Live2D binary pair already tracked in public/live2d.
  // Do not replace it with the newer source-folder pair, which is a different
  // binary/texture combination and fails Cubism Core validation at runtime.
  if (isValidMoc(publicMoc) && isValidTexture(publicTex)) {
    console.log(`[Live2D Auto-Restore] Keeping known-good assets: moc3=${EXPECTED_MOC3_SIZE} bytes, texture=${EXPECTED_TEXTURE_SIZE} bytes.`);
    return;
  }

  const sourceDir = path.resolve(__dirname, '../海魔完整版/MassageSeacubus_full_rei');
  const sourceMoc = path.join(sourceDir, 'MassageSeacubus_rei.moc3');
  const sourceTex = path.join(sourceDir, 'MassageSeacubus_rei.4096', 'texture_00.png');
  const mocPath = path.join(__dirname, 'moc3_base64.txt');
  const texPath = path.join(__dirname, 'texture_base64.txt');

  let mocBin;
  let texBin;
  let source = 'Base64 fallback';

  if (fs.existsSync(sourceMoc) && fs.existsSync(sourceTex)) {
    mocBin = fs.readFileSync(sourceMoc);
    texBin = fs.readFileSync(sourceTex);
    source = 'original repository binaries';
  } else if (fs.existsSync(mocPath) && fs.existsSync(texPath)) {
    mocBin = Buffer.from(fs.readFileSync(mocPath, 'utf8').trim(), 'base64');
    texBin = Buffer.from(fs.readFileSync(texPath, 'utf8').trim(), 'base64');
  } else {
    console.log('[Live2D Auto-Restore] No source assets found, skipping.');
    return;
  }

  if (mocBin.length < 64 || mocBin.subarray(0, 4).toString('ascii') !== 'MOC3') {
    throw new Error(`[Live2D Auto-Restore] Invalid MOC3 source asset (size=${mocBin.length}, header=${JSON.stringify(mocBin.subarray(0, 4).toString('ascii'))}).`);
  }
  const expectedPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (texBin.length < 8 || !texBin.subarray(0, 8).equals(expectedPng)) {
    throw new Error(`[Live2D Auto-Restore] Invalid PNG source asset (size=${texBin.length}).`);
  }

  console.log(`[Live2D Auto-Restore] Restoring assets from ${source}: moc3=${mocBin.length}, texture=${texBin.length}.`);

  fs.mkdirSync(path.dirname(publicMoc), { recursive: true });
  fs.mkdirSync(path.dirname(publicTex), { recursive: true });
  fs.writeFileSync(publicMoc, mocBin);
  fs.writeFileSync(publicTex, texBin);
}

restoreAssets();
