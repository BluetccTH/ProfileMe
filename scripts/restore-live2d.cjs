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

// A previous text-based upload accidentally introduced the UTF-8 encoding of
// U+FFFD (EF BF BD) immediately before the real binary header. Remove that
// prefix if present, but do not otherwise modify the binary payload.
function stripUtf8ReplacementPrefix(buffer) {
  const replacement = Buffer.from([0xef, 0xbf, 0xbd]);

  if (buffer.subarray(0, 3).equals(replacement)) {
    console.warn(
      '[Live2D Auto-Restore] Removing accidental UTF-8 replacement-character prefix.'
    );
    return buffer.subarray(3);
  }

  return buffer;
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
  const publicMoc = path.resolve(
    __dirname,
    '../public/live2d/MassageSeacubus_rei.moc3'
  );

  const publicTex = path.resolve(
    __dirname,
    '../public/live2d/MassageSeacubus_rei.4096/texture_00.png'
  );

  assertFile(publicMoc, 'MOC3 source');
  assertFile(publicTex, 'PNG source');

  let mocBin = fs.readFileSync(publicMoc);
  let texBin = fs.readFileSync(publicTex);

  // Repair only the known UTF-8 replacement-character prefix. The rest of
  // each binary remains byte-for-byte unchanged.
  mocBin = stripUtf8ReplacementPrefix(mocBin);
  texBin = stripUtf8ReplacementPrefix(texBin);

  validateMoc3(mocBin, publicMoc);
  validatePng(texBin, publicTex);

  if (mocBin.equals(texBin)) {
    throw new Error('CRITICAL: MOC3 and PNG are identical binaries.');
  }

  console.log('[Live2D Auto-Restore] Source binaries are valid.');
  console.log(`  MOC3 : ${mocBin.length} bytes`);
  console.log(`  PNG  : ${texBin.length} bytes`);

  const distDir = path.resolve(__dirname, '../dist');

  if (fs.existsSync(distDir)) {
    const distMoc = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.moc3'
    );

    const distTex = path.join(
      distDir,
      'live2d/MassageSeacubus_rei.4096/texture_00.png'
    );

    writeBinary(distMoc, mocBin);
    writeBinary(distTex, texBin);

    const deployedMoc = fs.readFileSync(distMoc);
    const deployedTex = fs.readFileSync(distTex);

    validateMoc3(deployedMoc, distMoc);
    validatePng(deployedTex, distTex);

    if (!deployedMoc.equals(mocBin) || !deployedTex.equals(texBin)) {
      throw new Error(
        'CRITICAL: dist Live2D binaries differ from public source binaries.'
      );
    }

    console.log('[Live2D Auto-Restore] Dist binaries verified.');
    console.log(`  dist MOC3 : ${deployedMoc.length} bytes`);
    console.log(`  dist PNG  : ${deployedTex.length} bytes`);
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
