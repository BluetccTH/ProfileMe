const fs = require('fs');
const path = require('path');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error(`${label} is empty or not a file: ${filePath}`);
}

function validateMoc3(buffer, filePath) {
  if (buffer.length < 64) throw new Error(`.moc3 file is too small: ${buffer.length} bytes`);
  if (buffer.subarray(0, 4).toString('ascii') !== 'MOC3') {
    throw new Error(`.moc3 validation failed for ${path.basename(filePath)}: expected MOC3`);
  }
}

function validatePng(buffer, filePath) {
  if (buffer.length < 100 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`.png validation failed for ${path.basename(filePath)}`);
  }
}

function copyBinary(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function validateTextureSet(textureDir) {
  assertFile(textureDir, 'Texture directory');
  const textures = fs.readdirSync(textureDir).filter(n => n.toLowerCase().endsWith('.png')).sort();
  if (!textures.length) throw new Error(`No PNG textures found: ${textureDir}`);
  for (const name of textures) {
    const file = path.join(textureDir, name);
    assertFile(file, `Texture ${name}`);
    validatePng(fs.readFileSync(file), file);
  }
  return textures;
}

function restoreAssets() {
  // Active model: original MassageSeacubus_rei.
  // Keep its native texture files untouched.
  const sourceDir = path.resolve(__dirname, '../public/live2d');
  const publicDir = path.resolve(__dirname, '../public/live2d/MassageSeacubus_rei');

  const sourceModel = path.join(sourceDir, 'MassageSeacubus_rei.model3.json');
  const sourceMoc = path.join(sourceDir, 'MassageSeacubus_rei.moc3');
  const sourcePhysics = path.join(sourceDir, 'MassageSeacubus_rei.physics3.json');
  const sourceCdi = path.join(sourceDir, 'MassageSeacubus_rei.cdi3.json');
  const sourceTextureDir = path.join(sourceDir, 'MassageSeacubus_rei.4096');

  for (const [file, label] of [
    [sourceModel, 'Source model3.json'],
    [sourceMoc, 'Source MOC3'],
    [sourcePhysics, 'Source physics3.json'],
    [sourceCdi, 'Source cdi3.json'],
  ]) assertFile(file, label);

  const textures = validateTextureSet(sourceTextureDir);

  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.mkdirSync(publicDir, { recursive: true });

  copyBinary(sourceModel, path.join(publicDir, 'MassageSeacubus_rei.model3.json'));
  copyBinary(sourceMoc, path.join(publicDir, 'MassageSeacubus_rei.moc3'));
  copyBinary(sourcePhysics, path.join(publicDir, 'MassageSeacubus_rei.physics3.json'));
  copyBinary(sourceCdi, path.join(publicDir, 'MassageSeacubus_rei.cdi3.json'));

  const publicTextureDir = path.join(publicDir, 'MassageSeacubus_rei.4096');
  for (const name of textures) copyBinary(path.join(sourceTextureDir, name), path.join(publicTextureDir, name));

  const moc = fs.readFileSync(path.join(publicDir, 'MassageSeacubus_rei.moc3'));
  validateMoc3(moc, path.join(publicDir, 'MassageSeacubus_rei.moc3'));
  validateTextureSet(publicTextureDir);

  console.log('[Live2D Auto-Restore] MassageSeacubus_rei restored.');
  console.log(`  MOC3 : ${moc.length} bytes`);
  console.log(`  Textures: ${textures.length}`);
  console.log('  Native texture resolution preserved; no resize.');
}

try { restoreAssets(); }
catch (error) {
  console.error('\n[Live2D Auto-Restore] FAILED');
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  process.exit(1);
}
