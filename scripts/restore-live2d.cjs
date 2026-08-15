const fs = require('fs');
const path = require('path');

const MODEL = 'MassageSeacubus_rei';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) throw new Error(`${label} is empty or not a file: ${filePath}`);
}

function validateMoc3(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 64) throw new Error(`MOC3 is too small: ${filePath}`);
  if (buffer.subarray(0, 4).toString('ascii') !== 'MOC3') throw new Error(`MOC3 magic header is invalid: ${filePath}`);
  return buffer.length;
}

function validatePng(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`PNG signature is invalid: ${filePath}`);
}

function validateSource() {
  const root = path.resolve(__dirname, '../public/live2d');
  const modelPath = path.join(root, `${MODEL}.model3.json`);
  const mocPath = path.join(root, `${MODEL}.moc3`);
  const model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
  const refs = model.FileReferences || {};
  if (refs.Moc !== `${MODEL}.moc3`) throw new Error(`Unexpected MOC3 reference: ${refs.Moc || '(missing)'}`);

  const mocSize = validateMoc3(mocPath);
  const refsToCheck = new Set([refs.Moc]);
  for (const file of refs.Textures || []) refsToCheck.add(file);
  for (const expression of refs.Expressions || []) if (expression?.File) refsToCheck.add(expression.File);
  for (const group of Object.values(refs.Motions || {})) for (const motion of Array.isArray(group) ? group : []) if (motion?.File) refsToCheck.add(motion.File);
  for (const key of ['Physics', 'Pose', 'DisplayInfo']) if (refs[key]) refsToCheck.add(refs[key]);

  for (const relativePath of refsToCheck) {
    if (!relativePath || relativePath.startsWith('/') || relativePath.includes('..')) throw new Error(`Unsafe Live2D reference: ${relativePath}`);
    assertFile(path.resolve(root, relativePath), `Referenced Live2D asset ${relativePath}`);
  }

  const textureDir = path.join(root, `${MODEL}.4096`);
  const textures = fs.readdirSync(textureDir).filter(name => /\.png$/i.test(name)).sort();
  if (!textures.length) throw new Error(`No PNG textures found in ${textureDir}`);
  for (const texture of textures) validatePng(path.join(textureDir, texture));

  console.log('[Live2D] Source of truth: public/live2d');
  console.log('[Live2D] Asset copying/modification: DISABLED');
  console.log(`  Model: ${MODEL}`);
  console.log(`  MOC3: ${mocSize} bytes`);
  console.log(`  PNG textures: ${textures.length}`);
}

try { validateSource(); }
catch (error) {
  console.error('\n[Live2D] SOURCE VALIDATION FAILED');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
