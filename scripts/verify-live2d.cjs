const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '../public/live2d');
const dist = path.resolve(__dirname, '../dist/live2d');
const MODEL = 'MassageSeacubus_rei';
const EXPECTED_MOC3_SIZE = 2628790;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function files(rootDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(path.relative(rootDir, full).split(path.sep).join('/'));
    }
  };
  walk(rootDir);
  return out.sort();
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assertFile(file, label) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`${label} missing: ${file}`);
}

function validatePng(file, label) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    const header = buffer.subarray(0, 16).toString('hex').match(/.{1,2}/g)?.join(' ') || '(empty)';
    throw new Error(`PNG signature is invalid: ${label}\nFirst bytes: ${header}`);
  }
}

function validatePngs(rootDir) {
  for (const rel of files(rootDir).filter(file => /\.png$/i.test(file))) {
    validatePng(path.join(rootDir, rel), rel);
  }
}

function assertSameTree() {
  assertFile(path.join(root, `${MODEL}.model3.json`), 'Model JSON');
  assertFile(path.join(root, `${MODEL}.moc3`), 'MOC3');

  const moc = fs.readFileSync(path.join(root, `${MODEL}.moc3`));
  if (moc.length !== EXPECTED_MOC3_SIZE) {
    throw new Error(`MOC3 size mismatch: expected ${EXPECTED_MOC3_SIZE}, got ${moc.length}`);
  }
  if (moc.subarray(0, 4).toString('ascii') !== 'MOC3') throw new Error('MOC3 magic header is invalid');

  validatePngs(root);

  if (!fs.existsSync(dist)) throw new Error('dist/live2d does not exist');
  const sourceFiles = files(root);
  const distFiles = files(dist);
  if (sourceFiles.join('\n') !== distFiles.join('\n')) {
    throw new Error(`Live2D file tree differs. Source=${sourceFiles.length}, dist=${distFiles.length}`);
  }

  for (const rel of sourceFiles) {
    const source = path.join(root, rel);
    const built = path.join(dist, rel);
    assertFile(built, `Built Live2D asset ${rel}`);
    const a = sha256(source);
    const b = sha256(built);
    if (a !== b) throw new Error(`Live2D SHA-256 mismatch: ${rel}\nsource=${a}\ndist=${b}`);
  }

  validatePngs(dist);

  console.log(`[Live2D] Build integrity OK: ${sourceFiles.length} file(s), byte-for-byte identical.`);
  console.log(`[Live2D] ${MODEL}.moc3: ${EXPECTED_MOC3_SIZE} bytes`);
}

function verifyModelReferences() {
  const modelFile = path.join(dist, `${MODEL}.model3.json`);
  const model = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
  const refs = model.FileReferences || {};
  const referenced = new Set();
  if (refs.Moc) referenced.add(refs.Moc);
  if (refs.Physics) referenced.add(refs.Physics);
  if (refs.Pose) referenced.add(refs.Pose);
  if (refs.DisplayInfo) referenced.add(refs.DisplayInfo);
  for (const file of refs.Textures || []) referenced.add(file);
  for (const expression of refs.Expressions || []) if (expression.File) referenced.add(expression.File);
  for (const group of Object.values(refs.Motions || {})) {
    for (const motion of Array.isArray(group) ? group : []) if (motion.File) referenced.add(motion.File);
  }

  for (const rel of referenced) {
    if (!rel || rel.startsWith('/') || rel.includes('..')) throw new Error(`Unsafe Live2D reference: ${rel}`);
    assertFile(path.resolve(dist, rel), `Referenced Live2D file ${rel}`);
  }
  console.log(`[Live2D] Model references OK: ${referenced.size} referenced file(s) exist in dist/live2d.`);
}

assertSameTree();
verifyModelReferences();
