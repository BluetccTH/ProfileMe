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

function validatePng(buffer, filePath) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error(`.png validation failed for ${path.basename(filePath)}`);
  }
}

function copyBinary(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function validateTextureSet(textureDir) {
  assertDirectory(textureDir, 'Texture directory');
  const textures = fs.readdirSync(textureDir).filter(n => n.toLowerCase().endsWith('.png')).sort();
  if (!textures.length) throw new Error(`No PNG textures found: ${textureDir}`);
  for (const name of textures) {
    const file = path.join(textureDir, name);
    assertFile(file, `Texture ${name}`);
    validatePng(fs.readFileSync(file), file);
  }
  return textures;
}

function findFallbackFile(primaryRoot, fallbackRoot, relativePath) {
  const primary = path.join(primaryRoot, relativePath);
  if (fs.existsSync(primary)) return { path: primary, source: 'live2d' };
  const fallback = path.join(fallbackRoot, relativePath);
  if (fs.existsSync(fallback)) return { path: fallback, source: '海魔完整版' };
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
  // Primary source: public/live2d.
  // Fallback only for missing assets: 海魔完整版/MassageSeacubus_full_rei.
  // Existing live2d files are never overwritten.
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
    `${modelName}.4096/texture_00.png`,
  ];

  for (const relativePath of requiredFiles) {
    copyIfMissing(primaryRoot, fallbackRoot, relativePath);
  }

  // Expressions and motions referenced by the primary model are also fallback-only.
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
  const textureDir = path.join(primaryRoot, `${modelName}.4096`);
  validateMoc3(fs.readFileSync(mocPath), mocPath);
  const textures = validateTextureSet(textureDir);

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
