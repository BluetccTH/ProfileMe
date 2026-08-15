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

function validateModelJson(filePath, modelName) {
  assertFile(filePath, 'Model JSON');
  const model = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const refs = model.FileReferences || {};
  if (refs.Moc !== `${modelName}.moc3`) {
    throw new Error(`Model JSON points to unexpected MOC3: ${refs.Moc || '(missing)'}`);
  }
  if (!Array.isArray(refs.Textures) || refs.Textures.length === 0) {
    throw new Error('Model JSON has no texture references');
  }
  return model;
}

function restoreAssets() {
  // public/live2d is the ONLY source of truth.
  // Do not mix files from 海魔完整版 into this model.
  // Textures are copied/deployed byte-for-byte and are never resized,
  // decoded, recompressed, or format-converted here.
  const root = path.resolve(__dirname, '../public/live2d');
  const modelName = 'MassageSeacubus_rei';

  assertDirectory(root, 'Live2D directory');

  const modelPath = path.join(root, `${modelName}.model3.json`);
  const mocPath = path.join(root, `${modelName}.moc3`);
  const physicsPath = path.join(root, `${modelName}.physics3.json`);
  const cdiPath = path.join(root, `${modelName}.cdi3.json`);
  const textureDir = path.join(root, `${modelName}.4096`);

  const model = validateModelJson(modelPath, modelName);
  assertFile(mocPath, 'MOC3');
  validateMoc3(fs.readFileSync(mocPath), mocPath);
  assertFile(physicsPath, 'Physics');
  assertFile(cdiPath, 'CDI');
  assertDirectory(textureDir, 'Texture directory');

  const textures = fs.readdirSync(textureDir)
    .filter(name => /\.(png|jpg|jpeg|webp)$/i.test(name))
    .sort();

  if (!textures.length) throw new Error(`No textures found in ${textureDir}`);

  const referencedTextures = new Set(model.FileReferences.Textures || []);
  for (const texture of referencedTextures) {
    assertFile(path.join(textureDir, path.basename(texture)), `Referenced texture ${texture}`);
  }

  const referenced = new Set();
  const refs = model.FileReferences || {};

  if (Array.isArray(refs.Expressions)) {
    for (const expression of refs.Expressions) {
      if (expression.File) referenced.add(expression.File);
    }
  }

  if (refs.Motions) {
    for (const group of Object.values(refs.Motions)) {
      if (Array.isArray(group)) {
        for (const motion of group) {
          if (motion.File) referenced.add(motion.File);
        }
      }
    }
  }

  for (const relativePath of referenced) {
    assertFile(path.join(root, relativePath), `Referenced Live2D asset ${relativePath}`);
  }

  console.log('[Live2D] Source of truth: public/live2d');
  console.log('[Live2D] Fallback copying: DISABLED');
  console.log(`  Model: ${modelName}`);
  console.log(`  MOC3: ${fs.statSync(mocPath).size} bytes`);
  console.log(`  Textures: ${textures.length}`);
  console.log('  Texture binaries preserved byte-for-byte.');
  console.log('  No resize / recompression / format conversion.');
}

try {
  restoreAssets();
} catch (error) {
  console.error('\n[Live2D] FAILED');
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  process.exit(1);
}
