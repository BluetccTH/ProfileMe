const fs = require('fs');
const path = require('path');

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
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a
  ]);

  if (buffer.length < 100) {
    throw new Error(`.png file is too small: ${buffer.length} bytes`);
  }

  if (!buffer.subarray(0, 8).equals(pngSignature)) {
    throw new Error(
      `.png validation failed for ${path.basename(filePath)}: ` +
      `invalid PNG signature ${buffer.subarray(0, 8).toString('hex')}`
    );
  }
}

function writeBinary(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function restoreAssets() {
  const live2dDir = path.resolve(__dirname, '../public/live2d');

  const mocPath = path.join(
    live2dDir,
    'MassageSeacubus_rei.moc3'
  );

  const pngPath = path.join(
    live2dDir,
    'MassageSeacubus_rei.4096/texture_00.png'
  );

  // This repository already contains the original PNG alongside the working
  // texture path. The working texture was previously damaged by text/UTF-8
  // handling, so use the original binary instead of trying to reconstruct a
  // 3.6 MB PNG from a giant text file.
  const originalPngPath = path.join(
    live2dDir,
    'MassageSeacubus_rei.4096/texture_00_orig.png'
  );

  assertFile(mocPath, 'MOC3 source');
  assertFile(originalPngPath, 'Original PNG source');

  const mocBin = fs.readFileSync(mocPath);
  const pngBin = fs.readFileSync(originalPngPath);

  validateMoc3(mocBin, mocPath);
  validatePng(pngBin, originalPngPath);

  if (mocBin.equals(pngBin)) {
    throw new Error('CRITICAL: MOC3 and PNG are identical binaries.');
  }

  // Always restore the canonical texture_00.png from the original binary.
  // This makes the two assets separate files with their real binary bytes.
  writeBinary(pngPath, pngBin);

  console.log('[Live2D Auto-Restore] Source binaries are valid.');
  console.log(`  MOC3 source : ${mocBin.length} bytes`);
  console.log(`  PNG source  : ${pngBin.length} bytes`);
  console.log('  PNG restored from texture_00_orig.png');

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

    writeBinary(distMoc, mocBin);
    writeBinary(distPng, pngBin);

    const deployedMoc = fs.readFileSync(distMoc);
    const deployedPng = fs.readFileSync(distPng);

    validateMoc3(deployedMoc, distMoc);
    validatePng(deployedPng, distPng);

    if (!deployedMoc.equals(mocBin) || !deployedPng.equals(pngBin)) {
      throw new Error(
        'CRITICAL: dist Live2D binaries differ from source binaries.'
      );
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
