const fs = require('fs');
const path = require('path');

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isValidMoc(file) {
  if (!fs.existsSync(file)) return false;
  const stat = fs.statSync(file);
  if (stat.size < 64) return false;
  return fs.readFileSync(file).subarray(0, 4).toString('ascii') === 'MOC3';
}

function isValidTexture(file) {
  if (!fs.existsSync(file)) return false;
  const data = fs.readFileSync(file);
  return data.length >= 8 && data.subarray(0, 8).equals(PNG_HEADER);
}

function restoreAssets() {
  const publicMoc = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.moc3');
  const publicTex = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.4096/texture_00.png');

  // Never replace a valid tracked binary merely because its byte length differs
  // from an older build. The legacy model's original MOC is 1,751,104 bytes.
  if (isValidMoc(publicMoc) && isValidTexture(publicTex)) {
    console.log('[Live2D Auto-Restore] Keeping valid tracked Live2D binary pair.');
    return;
  }

  const sourceDir = path.resolve(__dirname, '../海魔完整版/MassageSeacubus_full_rei');
  const sourceMoc = path.join(sourceDir, 'MassageSeacubus_rei.moc3');
  const sourceTex = path.join(sourceDir, 'MassageSeacubus_rei.4096', 'texture_00.png');
  const mocPath = path.join(__dirname, 'moc3_base64.txt');
  const texPath = path.join(__dirname, 'texture_base64.txt');

  let mocBin;
  let texBin;
  let source = 'base64 fallback';

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

  if (!isValidMocBuffer(mocBin)) {
    throw new Error(`[Live2D Auto-Restore] Invalid MOC3 source asset (size=${mocBin.length}).`);
  }
  if (!isValidPngBuffer(texBin)) {
    throw new Error(`[Live2D Auto-Restore] Invalid PNG source asset (size=${texBin.length}).`);
  }

  fs.mkdirSync(path.dirname(publicMoc), { recursive: true });
  fs.mkdirSync(path.dirname(publicTex), { recursive: true });
  fs.writeFileSync(publicMoc, mocBin);
  fs.writeFileSync(publicTex, texBin);
  console.log(`[Live2D Auto-Restore] Restored ${source}: moc3=${mocBin.length}, texture=${texBin.length}.`);
}

function isValidMocBuffer(buffer) {
  return buffer.length >= 64 && buffer.subarray(0, 4).toString('ascii') === 'MOC3';
}

function isValidPngBuffer(buffer) {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_HEADER);
}

restoreAssets();
