const fs = require('fs');
const path = require('path');

function restoreAssets() {
  const sourceDir = path.resolve(__dirname, '../海魔完整版/MassageSeacubus_full_rei');
  const sourceMoc = path.join(sourceDir, 'MassageSeacubus_rei.moc3');
  const sourceTex = path.join(sourceDir, 'MassageSeacubus_rei.4096', 'texture_00.png');

  const mocPath = path.join(__dirname, 'moc3_base64.txt');
  const texPath = path.join(__dirname, 'texture_base64.txt');

  let mocBin;
  let texBin;
  let source = 'Base64 fallback';

  // Prefer the original binary assets stored in the repository.
  // The previous Base64 copies were incomplete/corrupted and produced
  // a valid-looking MOC3 header but failed Cubism Core size validation.
  if (fs.existsSync(sourceMoc) && fs.existsSync(sourceTex)) {
    mocBin = fs.readFileSync(sourceMoc);
    texBin = fs.readFileSync(sourceTex);
    source = 'original repository binaries';
  } else if (fs.existsSync(mocPath) && fs.existsSync(texPath)) {
    const mocB64 = fs.readFileSync(mocPath, 'utf8').trim();
    const texB64 = fs.readFileSync(texPath, 'utf8').trim();
    mocBin = Buffer.from(mocB64, 'base64');
    texBin = Buffer.from(texB64, 'base64');
  } else {
    console.log('[Live2D Auto-Restore] No source assets found, skipping.');
    return;
  }

  console.log(`[Live2D Auto-Restore] Restoring assets from ${source}...`);

  if (mocBin.length < 64 || mocBin.subarray(0, 4).toString('ascii') !== 'MOC3') {
    throw new Error(`[Live2D Auto-Restore] Invalid MOC3 source asset (size=${mocBin.length}, header=${JSON.stringify(mocBin.subarray(0, 4).toString('ascii'))}).`);
  }

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (texBin.length < 8 || !texBin.subarray(0, 8).equals(pngHeader)) {
    throw new Error(`[Live2D Auto-Restore] Invalid PNG source asset (size=${texBin.length}).`);
  }

  const publicMoc = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.moc3');
  const publicTex = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.4096/texture_00.png');

  fs.mkdirSync(path.dirname(publicMoc), { recursive: true });
  fs.mkdirSync(path.dirname(publicTex), { recursive: true });

  fs.writeFileSync(publicMoc, mocBin);
  fs.writeFileSync(publicTex, texBin);

  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    const distMoc = path.resolve(distDir, 'live2d/MassageSeacubus_rei.moc3');
    const distTex = path.resolve(distDir, 'live2d/MassageSeacubus_rei.4096/texture_00.png');
    fs.mkdirSync(path.dirname(distMoc), { recursive: true });
    fs.mkdirSync(path.dirname(distTex), { recursive: true });
    fs.writeFileSync(distMoc, mocBin);
    fs.writeFileSync(distTex, texBin);
  }

  console.log(`[Live2D Auto-Restore] Done! moc3 size: ${mocBin.length} bytes, texture size: ${texBin.length} bytes.`);
}

restoreAssets();
