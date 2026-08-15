const fs = require('fs');
const path = require('path');

const MODEL = 'MassageSeacubus_rei';
const EXPECTED_MOC3_SIZE = 2628790;

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error(`${label} is empty or not a file: ${filePath}`);
}

function assertDirectory(dirPath, label) {
  if (!fs.existsSync(dirPath)) throw new Error(`${label} not found: ${dirPath}`);
  if (!fs.statSync(dirPath).isDirectory()) throw new Error(`${label} is not a directory: ${dirPath}`);
}

function validateMoc3(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length !== EXPECTED_MOC3_SIZE) {
    throw new Error(`MOC3 size mismatch: expected ${EXPECTED_MOC3_SIZE}, got ${buffer.length}`);
  }
  if (buffer.subarray(0, 4).toString('ascii') !== 'MOC3') {
    throw new Error(`MOC3 magic header is invalid: ${filePath}`);
  }
}

function validateModelJson(filePath) {
  assertFile(filePath, 'Model JSON');
  const model = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const refs = model.FileReferences || {};
  if (refs.Moc !== `${MODEL}.moc3`) throw new Error(`Unexpected MOC3 reference: ${refs.Moc || '(missing)'}`);
  if (!Array.isArray(refs.Textures) || refs.Textures.length === 0) throw new Error('Model JSON has no texture references');
  return model;
}

function validateReferencedPaths(root, model) {
  const refs = model.FileReferences || {};
  const referenced = new Set([refs.Moc]);
  for (const texture of refs.Textures || []) referenced.add(texture);
  for (const expression of refs.Expressions || []) if (expression.File) referenced.add(expression.File);
  for (const group of Object.values(refs.Motions || {})) {
    for (const motion of Array.isArray(group) ? group : []) if (motion.File) referenced.add(motion.File);
  }
  for (const key of ['Physics', 'Pose', 'DisplayInfo']) if (refs[key]) referenced.add(refs[key]);

  for (const relativePath of referenced) {
    if (!relativePath || relativePath.startsWith('/') || relativePath.includes('..')) {
      throw new Error(`Unsafe Live2D asset reference: ${relativePath}`);
    }
    assertFile(path.resolve(root, relativePath), `Referenced Live2D asset ${relativePath}`);
  }
}

function validateSource() {
  const root = path.resolve(__dirname, '../public/live2d');
  assertDirectory(root, 'Live2D source directory');

  const modelPath = path.join(root, `${MODEL}.model3.json`);
  const mocPath = path.join(root, `${MODEL}.moc3`);
  const physicsPath = path.join(root, `${MODEL}.physics3.json`);
  const cdiPath = path.join(root, `${MODEL}.cdi3.json`);
  const textureDir = path.join(root, `${MODEL}.4096`);

  const model = validateModelJson(modelPath);
  assertFile(mocPath, 'MOC3');
  validateMoc3(mocPath);
  assertFile(physicsPath, 'Physics');
  assertFile(cdiPath, 'CDI');
  assertDirectory(textureDir, 'Texture directory');
  validateReferencedPaths(root, model);

  const textures = fs.readdirSync(textureDir).filter(name => /\.png$/i.test(name)).sort();
  if (!textures.length) throw new Error(`No PNG textures found in ${textureDir}`);

  console.log('[Live2D] Source of truth: public/live2d');
  console.log('[Live2D] Asset copying/modification: DISABLED');
  console.log(`  Model: ${MODEL}`);
  console.log(`  MOC3: ${fs.statSync(mocPath).size} bytes (expected ${EXPECTED_MOC3_SIZE})`);
  console.log(`  PNG textures: ${textures.length}`);
  console.log('  No resize / recompression / format conversion / regeneration.');
}

try {
  validateSource();
} catch (error) {
  console.error('\n[Live2D] SOURCE VALIDATION FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
