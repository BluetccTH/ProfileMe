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
      `expected MOC3, got ${JSON.stringify(magic)}`
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
  // IMPORTANT:
  // Do not reconstruct the binaries from huge Base64 text files anymore.
  // The exact binary assets are already tracked in public/live2d/.
  // Re-encoding them as text caused truncation/corruption and even produced
  // a texture with the same size as the MOC3 file.
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

  const mocBin = fs.readFileSync(publicMoc);
  const texBin = fs.readFileSync(publicTex);

  validateMoc3(mocBin, publicMoc);
  validatePng(texBin, publicTex);

  if (mocBin.equals(texBin)) {
    throw new Error('CRITICAL: MOC3 and PNG are identical binaries.');
  }

  console.log('[Live2D Auto-Restore] Source binaries are valid.');
  console.log(`  MOC3 : ${mocBin.length} bytes`);
  console.log(`  PNG  : ${texBin.length} bytes`);

  const distDir = path.resolve(__dirname, '../dist');

  // This runs both before and after Vite build.
  // Before build: dist normally does not exist, so nothing is copied.
  // After build: overwrite/verify the exact binaries in dist.
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

    // Read back what will actually be deployed.
    const deployedMoc = fs.readFileSync(distMoc);
    const deployedTex = fs.readFileSync(distTex);

    validateMoc3(deployedMoc, distMoc);
    validatePng(deployedTex, distTex);

    if (!deployedMoc.equals(mocBin) || !deployedTex.equals(texBin)) {
      throw new Error('CRITICAL: dist Live2D binaries differ from public source binaries.');
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
