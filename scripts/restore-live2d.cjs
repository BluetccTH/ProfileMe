const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error(`${label} is empty or not a file: ${filePath}`);
}

function assertDirectory(dirPath, label) {
  if (!fs.existsSync(dirPath)) throw new Error(`${label} not found: ${dirPath}`);
  if (!fs.statSync(dirPath).isDirectory()) throw new Error(`${label} is not a directory: ${dirPath}`);
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function listFiles(root) {
  const result = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) result.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return result.sort();
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

function validateReferencedPaths(root, model) {
  const refs = model.FileReferences || {};
  const referenced = new Set();

  for (const texture of refs.Textures || []) referenced.add(texture);
  for (const expression of refs.Expressions || []) if (expression.File) referenced.add(expression.File);

  if (refs.Motions) {
    for (const group of Object.values(refs.Motions)) {
      if (Array.isArray(group)) {
        for (const motion of group) if (motion.File) referenced.add(motion.File);
      }
    }
  }

  for (const key of ['Physics', 'Pose', 'DisplayInfo']) {
    if (refs[key]) referenced.add(refs[key]);
  }

  for (const relativePath of referenced) {
    if (!relativePath || relativePath.startsWith('/') || relativePath.includes('..')) {
      throw new Error(`Unsafe Live2D asset reference: ${relativePath}`);
    }
    assertFile(path.resolve(root, relativePath), `Referenced Live2D asset ${relativePath}`);
  }
}

function compareTrees(sourceRoot, distRoot) {
  assertDirectory(distRoot, 'Built dist/live2d directory');
  const sourceFiles = listFiles(sourceRoot);
  const distFiles = listFiles(distRoot);

  if (sourceFiles.join('\n') !== distFiles.join('\n')) {
    const sourceSet = new Set(sourceFiles);
    const distSet = new Set(distFiles);
    const missing = sourceFiles.filter((file) => !distSet.has(file));
    const extra = distFiles.filter((file) => !sourceSet.has(file));
    throw new Error(`Live2D file tree changed. Missing: ${missing.join(', ') || 'none'}; Extra: ${extra.join(', ') || 'none'}`);
  }

  for (const relativePath of sourceFiles) {
    const source = path.join(sourceRoot, relativePath);
    const dist = path.join(distRoot, relativePath);
    const sourceHash = sha256(source);
    const distHash = sha256(dist);
    if (sourceHash !== distHash) {
      throw new Error(`Live2D integrity mismatch: ${relativePath}\nsource=${sourceHash}\ndist=${distHash}`);
    }
  }

  console.log(`[Live2D] SHA-256 verified: ${sourceFiles.length} asset(s), byte-for-byte identical.`);
  for (const relativePath of sourceFiles) {
    console.log(`  ${sha256(path.join(sourceRoot, relativePath))}  ${relativePath}`);
  }
}

function restoreAssets() {
  const root = path.resolve(__dirname, '../public/live2d');
  const distRoot = path.resolve(__dirname, '../dist/live2d');
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
  validateReferencedPaths(root, model);

  const textures = fs.readdirSync(textureDir)
    .filter(name => /\.(png|jpg|jpeg|webp)$/i.test(name))
    .sort();
  if (!textures.length) throw new Error(`No textures found in ${textureDir}`);

  console.log('[Live2D] Source of truth: public/live2d');
  console.log('[Live2D] Fallback copying: DISABLED');
  console.log(`  Model: ${modelName}`);
  console.log(`  MOC3: ${fs.statSync(mocPath).size} bytes`);
  console.log(`  Textures: ${textures.length}`);
  console.log('  No resize / recompression / format conversion.');

  // The second invocation happens after Vite has produced dist/.
  // Verify the final tree against public/live2d without modifying either side.
  if (fs.existsSync(distRoot)) {
    compareTrees(root, distRoot);
  }
}

try {
  restoreAssets();
} catch (error) {
  console.error('\n[Live2D] FAILED');
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  process.exit(1);
}
