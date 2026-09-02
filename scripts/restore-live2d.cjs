const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, '海魔完整版', 'MassageSeacubus_full_rei');
const publicRoot = path.join(root, 'public', 'live2d');
const distRoot = path.join(root, 'dist', 'live2d');

const filesToCopy = [
  'MassageSeacubus_rei.moc3',
  'MassageSeacubus_rei.4096/texture_00.png',
  'MassageSeacubus_rei.model3.json',
  'MassageSeacubus_rei.physics3.json',
  'MassageSeacubus_rei.cdi3.json',
];

function copyIfExists(relativePath, destinationRoot) {
  const source = path.join(sourceRoot, relativePath);
  const destination = path.join(destinationRoot, relativePath);

  if (!fs.existsSync(source)) {
    throw new Error(`Missing source Live2D asset: ${source}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return fs.statSync(destination).size;
}

function restoreAssets() {
  if (!fs.existsSync(sourceRoot)) {
    throw new Error(`Live2D source directory not found: ${sourceRoot}`);
  }

  console.log('[Live2D Restore] Copying original binary Live2D assets from repository...');

  for (const relativePath of filesToCopy) {
    copyIfExists(relativePath, publicRoot);
  }

  if (fs.existsSync(path.join(root, 'dist'))) {
    for (const relativePath of filesToCopy) {
      copyIfExists(relativePath, distRoot);
    }
  }

  const mocPath = path.join(publicRoot, 'MassageSeacubus_rei.moc3');
  const texturePath = path.join(publicRoot, 'MassageSeacubus_rei.4096', 'texture_00.png');
  const mocHeader = fs.readFileSync(mocPath).subarray(0, 4).toString('ascii');
  const pngHeader = fs.readFileSync(texturePath).subarray(0, 8).toString('hex');

  if (mocHeader !== 'MOC3') {
    throw new Error(`Invalid MOC3 header: ${JSON.stringify(mocHeader)}`);
  }

  if (pngHeader !== '89504e470d0a1a0a') {
    throw new Error('Invalid PNG signature in Live2D texture.');
  }

  console.log(`[Live2D Restore] OK: moc3=${fs.statSync(mocPath).size} bytes`);
  console.log(`[Live2D Restore] OK: texture=${fs.statSync(texturePath).size} bytes`);
  console.log('[Live2D Restore] OK: using original repository binaries; no Base64 conversion.');
}

restoreAssets();
