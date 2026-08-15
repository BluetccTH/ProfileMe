const fs = require('fs');
const path = require('path');

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error(`${label} is empty or not a file: ${filePath}`);
}

function assertDirectory(dirPath, label) {
  if (!fs.existsSync(dirPath)) throw new Error(`${label} not found: ${dirPath}`);
  if (!fs.statSync(dirPath).isDirectory()) throw new Error(`${label} is not a directory: ${dirPath}`);
}

function validateMoc3(buffer, filePath) {
  if (buffer.length < 64 || buffer.subarray(0, 4).toString('ascii') !== 'MOC3') {
    throw new Error(`.moc3 validation failed for ${path.basename(filePath)}`);
  }
}

function isPng(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(signature);
}

function validatePng(buffer, filePath) {
  // Only validate the standard 8-byte PNG signature.
  // Never decode, resize, recompress, or rewrite the texture.
  if (!isPng(buffer)) {
    throw new Error(`.png validation failed for ${path.basename(filePath)}`);
  }
}

function copyBinary(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function validateTextureSet(textureDir, allowNonPng = false) {
  assertDirectory(textureDir, 'Texture directory');
  const textures = fs.readdirSync(textureDir).filter(n => /\.(png|jpg|jpeg|webp)$/i.test(n)).sort();
  if (!textures.length) throw new Error(`No texture files found: ${textureDir}`);

  for (const name of textures) {
    const file = path.join(textureDir, name);
    assertFile(file, `Texture ${name}`);
    const buffer = fs.readFileSync(file);
    if (/\.png$/i.test(name)) validatePng(buffer, file);
    else if (!allowNonPng) throw new Error(`Unsupported texture format: ${name}`);
  }
  return textures;
}

function findFallbackFile(primaryRoot, fallbackRoot, relativePath) {
  const primary = path.join(primaryRoot, relativePath);
  if (fs.existsSync(primary) && fs.statSync(primary).isFile()) return { path: primary, source: 'live2d' };
  const fallback = path.join(fallbackRoot, relativePath);
  if (fs.existsSync(fallback) && fs.statSync(fallback).isFile()) return { path: fallback, source: '海魔完整版' };
  return null;
}

function copyIfMissing(primaryRoot, fallbackRoot, relativePath) {
  const result = findFallbackFile(primaryRoot, fallbackRoot, relativePath);
  if (!result) throw new Error(`Missing required Live2D asset: ${relativePath}`);
  const destination = path.join(primaryRoot, relativePath);
  if (result.source === '海魔完整版') {
    copyBinary(result.path, destination);
    console.log(`[Live2D Fallback] Restored missing asset: ${relativePath}`);
  }
}

function restoreAssets() {
  // Primary: public/live2d. Fallback: 海魔完整版/MassageSeacubus_full_rei.
  // Existing live2d files are never overwritten and textures are never modified.
  const primaryRoot = path.resolve(__dirname, '../public/live2d');
  const fallbackRoot = path.resolve(__dirname, '../海魔完整版/MassageSeacubus_full_rei');
  const modelName = 'MassageSeacubus_rei';

  assertDirectory(primaryRoot, 'Primary Live2D directory');
  assertDirectory(fallbackRoot, 'Live2D fallback directory');

  const requiredFiles = [
    `${modelName}.model3.json`,
    `${modelName}.moc3`,
    `${modelName}.physics3.json`,
    `${modelName}.cdi3.json`,
  ];
  for (const relativePath of requiredFiles) copyIfMissing(primaryRoot, fallbackRoot, relativePath);

  // Prefer the texture directory already referenced by the primary model.
  const primaryTextureDir = path.join(primaryRoot, `${modelName}.4096`);
  const fallbackTextureDir = path.join(fallbackRoot, `${modelName}.4096`);
  if (!fs.existsSync(primaryTextureDir) || !fs.statSync(primaryTextureDir).isDirectory() ||
      fs.readdirSync(primaryTextureDir).filter(n => /\.(png|jpg|jpeg|webp)$/i.test(n)).length === 0) {
    assertDirectory(fallbackTextureDir, 'Fallback texture directory');
    fs.mkdirSync(primaryTextureDir, { recursive: true });
    for (const name of fs.readdirSync(fallbackTextureDir).filter(n => /\.(png|jpg|jpeg|webp)$/i.test(n))) {
      const destination = path.join(primaryTextureDir, name);
      if (!fs.existsSync(destination)) copyBinary(path.join(fallbackTextureDir, name), destination);
    }
  }

  // Expressions and motions referenced by the primary model are fallback-only.
  const modelFile = path.join(primaryRoot, `${modelName}.model3.json`);
  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const referenced = new Set();
  const refs = model.FileReferences || {};
  if (Array.isArray(refs.Expressions)) {
    for (const expression of refs.Expressions) if (expression.File) referenced.add(expression.File);
  }
  if (refs.Motions) {
    for (const group of Object.values(refs.Motions)) {
      if (Array.isArray(group)) for (const motion of group) if (motion.File) referenced.add(motion.File);
    }
  }
  for (const relativePath of referenced) copyIfMissing(primaryRoot, fallbackRoot, relativePath);

  const mocPath = path.join(primaryRoot, `${modelName}.moc3`);
  validateMoc3(fs.readFileSync(mocPath), mocPath);
  const textures = validateTextureSet(primaryTextureDir, true);

  console.log('[Live2D Auto-Restore] Primary: public/live2d');
  console.log('[Live2D Auto-Restore] Fallback: 海魔完整版/MassageSeacubus_full_rei');
  console.log(`  MOC3: ${fs.statSync(mocPath).size} bytes`);
  console.log(`  Textures: ${textures.length}`);
  console.log('  Existing live2d assets preserved; fallback used only when missing.');
  console.log('  Native texture files preserved; no resize/recompression.');
}

try { restoreAssets(); }
catch (error) {
  console.error('\n[Live2D Auto-Restore] FAILED');
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  process.exit(1);
}
