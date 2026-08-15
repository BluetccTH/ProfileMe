const fs = require('fs');
const path = require('path');

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47,
  0x0d, 0x0a, 0x1a, 0x0a
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

function writeBinary(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function normalizePng(buffer, filePath) {
  // A previous UTF-8/text edit converted the first PNG byte 0x89 into the
  // three-byte UTF-8 replacement character EF BF BD. Restore that byte only.
  const corruptedPrefix = Buffer.from([0xef, 0xbf, 0xbd, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (buffer.subarray(0, corruptedPrefix.length).equals(corruptedPrefix)) {
    console.warn(
      `[Live2D Auto-Restore] Repairing UTF-8 replacement-character prefix in ${path.basename(filePath)}.`
    );
    return Buffer.concat([
      PNG_SIGNATURE,
      buffer.subarray(corruptedPrefix.length)
    ]);
  }

  // Another attempted repair removed the replacement character entirely,
  // leaving the PNG signature as 50 4E 47.... Restore the missing 0x89.
  const missingFirstByte = Buffer.from([0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (buffer.subarray(0, missingFirstByte.length).equals(missingFirstByte)) {
    console.warn(
      `[Live2D Auto-Restore] Repairing missing PNG signature byte in ${path.basename(filePath)}.`
    );
    return Buffer.concat([
      Buffer.from([0x89]),
      buffer
    ]);
  }

  return buffer;
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

  const originalPngPath = path.join(
    live2dDir,
    'MassageSeacubus_rei.4096/texture_00_orig.png'
  );

  assertFile(mocPath, 'MOC3 source');
  assertFile(originalPngPath, 'Original PNG source');

  const mocBin = fs.readFileSync(mocPath);
  const pngSource = fs.readFileSync(originalPngPath);
  const pngBin = normalizePng(pngSource, originalPngPath);

  validateMoc3(mocBin, mocPath);
  validatePng(pngBin, originalPngPath);

  if (mocBin.equals(pngBin)) {
    throw new Error('CRITICAL: MOC3 and PNG are identical binaries.');
  }

  writeBinary(pngPath, pngBin);

  // Verify the actual public files, not just the in-memory buffers.
  const restoredMoc = fs.readFileSync(mocPath);
  const restoredPng = fs.readFileSync(pngPath);
  validateMoc3(restoredMoc, mocPath);
  validatePng(restoredPng, pngPath);

  if (!restoredMoc.equals(mocBin) || !restoredPng.equals(pngBin)) {
    throw new Error('CRITICAL: public Live2D binaries differ from validated source binaries.');
  }

  console.log('[Live2D Auto-Restore] Source binaries are valid.');
  console.log(`  MOC3 : ${mocBin.length} bytes`);
  console.log(`  PNG  : ${pngBin.length} bytes`);
  console.log(`  PNG header: ${pngBin.subarray(0, 8).toString('hex')}`);

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
