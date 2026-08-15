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

function restoreAssets() {
  // Use the original tracked Live2D binaries directly.
  // Do NOT reconstruct .moc3/.png from Base64 text: those text files were
  // truncated/corrupted and caused invalid Core model data and PNG headers.
  const sourceDir = path.resolve(
    __dirname,
    '../海魔完整版/MassageSeacubus_full_rei'
  );

  const publicDir = path.resolve(__dirname, '../public/live2d');
  const sourceMoc = path.join(sourceDir, 'MassageSeacubus_rei.moc3');
  const sourcePng = path.join(
    sourceDir,
    'MassageSeacubus_rei.4096/texture_00.png'
  );
  const sourceModel = path.join(sourceDir, 'MassageSeacubus_rei.model3.json');
  const sourcePhysics = path.join(sourceDir, 'MassageSeacubus_rei.physics3.json');
  const sourceCdi = path.join(sourceDir, 'MassageSeacubus_rei.cdi3.json');

  for (const [file, label] of [
    [sourceMoc, 'Source MOC3'],
    [sourcePng, 'Source PNG'],
    [sourceModel, 'Source model3.json'],
    [sourcePhysics, 'Source physics3.json'],
    [sourceCdi, 'Source cdi3.json'],
  ]) {
    assertFile(file, label);
  }

  const publicMoc = path.join(publicDir, 'MassageSeacubus_rei.moc3');
  const publicPng = path.join(
    publicDir,
    'MassageSeacubus_rei.4096/texture_00.png'
  );
  const publicModel = path.join(publicDir, 'MassageSeacubus_rei.model3.json');
  const publicPhysics = path.join(publicDir, 'MassageSeacubus_rei.physics3.json');
  const publicCdi = path.join(publicDir, 'MassageSeacubus_rei.cdi3.json');

  copyBinary(sourceMoc, publicMoc);
  copyBinary(sourcePng, publicPng);
  copyBinary(sourceModel, publicModel);
  copyBinary(sourcePhysics, publicPhysics);
  copyBinary(sourceCdi, publicCdi);

  const mocBin = fs.readFileSync(publicMoc);
  const pngBin = fs.readFileSync(publicPng);

  validateMoc3(mocBin, publicMoc);
  validatePng(pngBin, publicPng);

  if (mocBin.equals(pngBin)) {
    throw new Error('CRITICAL: MOC3 and PNG are identical binaries.');
  }

  const sourceMocBin = fs.readFileSync(sourceMoc);
  const sourcePngBin = fs.readFileSync(sourcePng);

  if (!mocBin.equals(sourceMocBin) || !pngBin.equals(sourcePngBin)) {
    throw new Error('CRITICAL: public Live2D binaries differ from the original tracked binaries.');
  }

  console.log('[Live2D Auto-Restore] Original tracked Live2D binaries copied.');
  console.log(`  MOC3 : ${mocBin.length} bytes`);
  console.log(`  PNG  : ${pngBin.length} bytes`);
  console.log(`  MOC3 header: ${mocBin.subarray(0, 4).toString('ascii')}`);
  console.log(`  PNG header : ${pngBin.subarray(0, 8).toString('hex')}`);

  const distDir = path.resolve(__dirname, '../dist');

  if (fs.existsSync(distDir)) {
    const distMoc = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.moc3'
    );
    const distPng = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.4096/texture_00.png'
    );
    const distModel = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.model3.json'
    );
    const distPhysics = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.physics3.json'
    );
    const distCdi = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.cdi3.json'
    );

    copyBinary(publicMoc, distMoc);
    copyBinary(publicPng, distPng);
    copyBinary(publicModel, distModel);
    copyBinary(publicPhysics, distPhysics);
    copyBinary(publicCdi, distCdi);

    const deployedMoc = fs.readFileSync(distMoc);
    const deployedPng = fs.readFileSync(distPng);

    validateMoc3(deployedMoc, distMoc);
    validatePng(deployedPng, distPng);

    if (!deployedMoc.equals(mocBin) || !deployedPng.equals(pngBin)) {
      throw new Error('CRITICAL: dist Live2D binaries differ from public source binaries.');
    }

    console.log('[Live2D Auto-Restore] Dist binaries verified.');
    console.log(`  dist MOC3 : ${deployedMoc.length} bytes`);
    console.log(`  dist PNG  : ${deployedPng.length} bytes`);
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
