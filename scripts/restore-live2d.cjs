const fs = require('fs');
const path = require('path');

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a,
]);

function assertFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`${label} is empty or not a file: ${filePath}`);
  }
}

function validateMoc3(buffer, filePath) {
  if (buffer.length < 64) {
    throw new Error(`.moc3 file is too small: ${buffer.length} bytes`);
  }

  const magic = buffer.subarray(0, 4).toString('ascii');
  if (magic !== 'MOC3') {
    throw new Error(
      `.moc3 validation failed for ${path.basename(filePath)}: ` +
      `expected MOC3, got ${JSON.stringify(magic)} ` +
      `(${buffer.subarray(0, 16).toString('hex')})`
    );
  }
}

function validatePng(buffer, filePath) {
  if (buffer.length < 100) {
    throw new Error(`.png file is too small: ${buffer.length} bytes`);
  }

  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(
      `.png validation failed for ${path.basename(filePath)}: ` +
      `invalid PNG signature ${buffer.subarray(0, 8).toString('hex')}`
    );
  }
}

function copyBinary(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function validateTextureSet(textureDir) {
  const textures = fs
    .readdirSync(textureDir)
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .sort();

  if (textures.length === 0) {
    throw new Error(`No PNG textures found: ${textureDir}`);
  }

  for (const name of textures) {
    const filePath = path.join(textureDir, name);
    assertFile(filePath, `Texture ${name}`);
    const buffer = fs.readFileSync(filePath);
    validatePng(buffer, filePath);
  }

  return textures;
}

function restoreAssets() {
  // The active Live2D model is English version-Full / Number1.
  // The previous implementation hard-coded the removed MassageSeacubus source,
  // which made every production build fail before Vite could run.
  const sourceDir = path.resolve(
    __dirname,
    '../English version-Full/Model_Full'
  );

  const publicDir = path.resolve(
    __dirname,
    '../public/live2d/English_version_Full'
  );

  const sourceMoc = path.join(sourceDir, 'Number1.moc3');
  const sourceModel = path.join(sourceDir, 'Number1.model3.json');
  const sourcePhysics = path.join(sourceDir, 'Number1.physics3.json');
  const sourceCdi = path.join(sourceDir, 'Number1.cdi3.json');
  const sourceTextureDir = path.join(sourceDir, 'Number1.4096');
  const sourceExpressionsDir = path.join(sourceDir, 'Expressions');
  const sourceMotion = path.join(sourceDir, 'Scene1.motion3.json');
  const sourceVtube = path.join(sourceDir, 'Number1.vtube.json');

  for (const [file, label] of [
    [sourceMoc, 'Source MOC3'],
    [sourceModel, 'Source model3.json'],
    [sourcePhysics, 'Source physics3.json'],
    [sourceCdi, 'Source cdi3.json'],
    [sourceMotion, 'Source motion3.json'],
    [sourceVtube, 'Source vtube.json'],
  ]) {
    assertFile(file, label);
  }

  const textures = validateTextureSet(sourceTextureDir);

  // Expressions are optional at runtime, but we expect the uploaded model pack
  // to contain the expression files so the UI can expose them.
  if (!fs.existsSync(sourceExpressionsDir)) {
    throw new Error(`Source Expressions directory not found: ${sourceExpressionsDir}`);
  }

  const expressions = fs
    .readdirSync(sourceExpressionsDir)
    .filter((name) => name.toLowerCase().endsWith('.exp3.json'))
    .sort();

  if (expressions.length === 0) {
    throw new Error(`No .exp3.json expressions found: ${sourceExpressionsDir}`);
  }

  // Rebuild the public model directory from the uploaded source pack.
  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.mkdirSync(publicDir, { recursive: true });

  copyBinary(sourceMoc, path.join(publicDir, 'Number1.moc3'));
  copyBinary(sourceModel, path.join(publicDir, 'Number1.model3.json'));
  copyBinary(sourcePhysics, path.join(publicDir, 'Number1.physics3.json'));
  copyBinary(sourceCdi, path.join(publicDir, 'Number1.cdi3.json'));
  copyBinary(sourceMotion, path.join(publicDir, 'Scene1.motion3.json'));
  copyBinary(sourceVtube, path.join(publicDir, 'Number1.vtube.json'));

  const publicTextureDir = path.join(publicDir, 'Number1.4096');
  fs.mkdirSync(publicTextureDir, { recursive: true });
  for (const name of textures) {
    copyBinary(
      path.join(sourceTextureDir, name),
      path.join(publicTextureDir, name)
    );
  }

  const publicExpressionsDir = path.join(publicDir, 'Expressions');
  fs.mkdirSync(publicExpressionsDir, { recursive: true });
  for (const name of expressions) {
    copyBinary(
      path.join(sourceExpressionsDir, name),
      path.join(publicExpressionsDir, name)
    );
  }

  const publicMoc = path.join(publicDir, 'Number1.moc3');
  const publicModel = path.join(publicDir, 'Number1.model3.json');
  const publicPhysics = path.join(publicDir, 'Number1.physics3.json');
  const publicCdi = path.join(publicDir, 'Number1.cdi3.json');

  const mocBin = fs.readFileSync(publicMoc);
  validateMoc3(mocBin, publicMoc);

  for (const file of [publicModel, publicPhysics, publicCdi]) {
    assertFile(file, `Public ${path.basename(file)}`);
  }

  validateTextureSet(publicTextureDir);

  const sourceMocBin = fs.readFileSync(sourceMoc);
  if (!mocBin.equals(sourceMocBin)) {
    throw new Error('CRITICAL: public MOC3 differs from the uploaded English version-Full model.');
  }

  console.log('[Live2D Auto-Restore] English version-Full model prepared.');
  console.log(`  MOC3 : ${mocBin.length} bytes`);
  console.log(`  Textures: ${textures.length}`);
  console.log(`  Expressions: ${expressions.length}`);
  console.log(`  Motion: Scene1.motion3.json`);

  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    const distModelDir = path.join(distDir, 'live2d/English_version_Full');
    const distMoc = path.join(distModelDir, 'Number1.moc3');
    const distModel = path.join(distModelDir, 'Number1.model3.json');
    const distPhysics = path.join(distModelDir, 'Number1.physics3.json');
    const distCdi = path.join(distModelDir, 'Number1.cdi3.json');

    for (const [file, label] of [
      [distMoc, 'Dist MOC3'],
      [distModel, 'Dist model3.json'],
      [distPhysics, 'Dist physics3.json'],
      [distCdi, 'Dist cdi3.json'],
    ]) {
      assertFile(file, label);
    }

    const deployedMoc = fs.readFileSync(distMoc);
    validateMoc3(deployedMoc, distMoc);
    validateTextureSet(path.join(distModelDir, 'Number1.4096'));

    if (!deployedMoc.equals(mocBin)) {
      throw new Error('CRITICAL: dist MOC3 differs from public English version-Full MOC3.');
    }

    console.log('[Live2D Auto-Restore] Dist English model verified.');
    console.log(`  dist MOC3 : ${deployedMoc.length} bytes`);
  }

  console.log('[Live2D Auto-Restore] SUCCESS');
}

try {
  restoreAssets();
} catch (error) {
  console.error('');
  console.error('[Live2D Auto-Restore] FAILED');
  console.error(error instanceof Error ? error.message : error);
  console.error('');
  process.exit(1);
}
