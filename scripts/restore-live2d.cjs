const fs = require('fs');
const path = require('path');

function restoreAssets() {
  const mocPath = path.join(__dirname, 'moc3_base64.txt');
  const texPath = path.join(__dirname, 'texture_base64.txt');

  if (!fs.existsSync(mocPath) || !fs.existsSync(texPath)) {
    console.log('[Live2D Auto-Restore] Base64 files not found, skipping.');
    return;
  }

  console.log('[Live2D Auto-Restore] Restoring pure binary Live2D model and textures from ASCII Base64...');
  const mocB64 = fs.readFileSync(mocPath, 'utf8').trim();
  const texB64 = fs.readFileSync(texPath, 'utf8').trim();

  const mocBin = Buffer.from(mocB64, 'base64');
  const texBin = Buffer.from(texB64, 'base64');

  // 1. Write to public/live2d/
  const publicMoc = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.moc3');
  const publicTex = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei.4096/texture_00.png');
  
  fs.mkdirSync(path.dirname(publicMoc), { recursive: true });
  fs.mkdirSync(path.dirname(publicTex), { recursive: true });

  fs.writeFileSync(publicMoc, mocBin);
  fs.writeFileSync(publicTex, texBin);

  // 2. Write to dist/live2d/ if dist directory exists
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
