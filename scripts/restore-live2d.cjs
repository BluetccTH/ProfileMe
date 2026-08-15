const fs = require('fs');
const path = require('path');

function cleanBase64(value) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\r?\n/g, '')
    .replace(/\s+/g, '')
    .trim();
}

function decodeBase64File(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let cleaned = cleanBase64(raw);

  if (!cleaned) {
    throw new Error(
      `Base64 file is empty: ${path.basename(filePath)}`
    );
  }

  // Remove accidental data URI prefix
  cleaned = cleaned.replace(
    /^data:[^;]+;base64,/i,
    ''
  );

  // Only valid Base64 characters are allowed.
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
    throw new Error(
      `Invalid Base64 characters in ${path.basename(filePath)}`
    );
  }

  const remainder = cleaned.length % 4;

  if (remainder !== 0) {
    throw new Error(
      `Invalid Base64 length in ${path.basename(filePath)}: ${cleaned.length} ` +
      `(length must be divisible by 4). ` +
      `The Base64 file is probably truncated or corrupted.`
    );
  }

  const buffer = Buffer.from(cleaned, 'base64');

  if (!buffer.length) {
    throw new Error(
      `Decoded buffer is empty: ${path.basename(filePath)}`
    );
  }

  return buffer;
}

function validateMoc3(buffer, sourcePath) {
  if (buffer.length < 64) {
    throw new Error(
      `.moc3 file is too small: ${buffer.length} bytes`
    );
  }

  const magic = buffer
    .subarray(0, 4)
    .toString('ascii');

  if (magic !== 'MOC3') {
    const firstBytes = buffer
      .subarray(0, 16)
      .toString('hex')
      .match(/.{1,2}/g)
      ?.join(' ') || '';

    throw new Error(
      `.moc3 validation failed for ${path.basename(sourcePath)}\n` +
      `Expected header: MOC3\n` +
      `Actual header: ${JSON.stringify(magic)}\n` +
      `First bytes: ${firstBytes}`
    );
  }
}

function validatePng(buffer, sourcePath) {
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4E, 0x47,
    0x0D, 0x0A, 0x1A, 0x0A
  ]);

  if (buffer.length < 100) {
    throw new Error(
      `.png file is too small: ${buffer.length} bytes`
    );
  }

  const signature = buffer.subarray(0, 8);

  if (!signature.equals(pngSignature)) {
    throw new Error(
      `.png validation failed for ${path.basename(sourcePath)}\n` +
      `Expected PNG signature: 89504e470d0a1a0a\n` +
      `Actual signature: ${signature.toString('hex')}`
    );
  }
}

function buffersAreIdentical(a, b) {
  return a.length === b.length && a.equals(b);
}

function writeBinary(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), {
    recursive: true
  });

  fs.writeFileSync(filePath, buffer);
}

function restoreAssets() {
  const mocPath = path.join(
    __dirname,
    'moc3_base64.txt'
  );

  const texPath = path.join(
    __dirname,
    'texture_base64.txt'
  );

  if (!fs.existsSync(mocPath)) {
    console.log(
      '[Live2D Auto-Restore] moc3_base64.txt not found, skipping.'
    );
    return;
  }

  if (!fs.existsSync(texPath)) {
    console.log(
      '[Live2D Auto-Restore] texture_base64.txt not found, skipping.'
    );
    return;
  }

  console.log(
    '[Live2D Auto-Restore] Restoring Live2D binary assets...'
  );

  // -----------------------------------------
  // Decode
  // -----------------------------------------

  const mocBin = decodeBase64File(mocPath);
  const texBin = decodeBase64File(texPath);

  console.log(
    `[Live2D Auto-Restore] Decoded MOC3: ${mocBin.length} bytes`
  );

  console.log(
    `[Live2D Auto-Restore] Decoded PNG : ${texBin.length} bytes`
  );

  // -----------------------------------------
  // Validate
  // -----------------------------------------

  validateMoc3(mocBin, mocPath);
  validatePng(texBin, texPath);

  // -----------------------------------------
  // Make sure the two files are actually different
  // -----------------------------------------

  if (buffersAreIdentical(mocBin, texBin)) {
    throw new Error(
      'CRITICAL: moc3_base64.txt and texture_base64.txt decode to identical binary data. ' +
      'The source Base64 files are duplicated or mapped incorrectly.'
    );
  }

  // -----------------------------------------
  // Output paths
  // -----------------------------------------

  const publicDir = path.resolve(
    __dirname,
    '../public/live2d'
  );

  const publicMoc = path.join(
    publicDir,
    'MassageSeacubus_rei.moc3'
  );

  const publicTex = path.join(
    publicDir,
    'MassageSeacubus_rei.4096',
    'texture_00.png'
  );

  // -----------------------------------------
  // Write public assets
  // -----------------------------------------

  writeBinary(publicMoc, mocBin);
  writeBinary(publicTex, texBin);

  console.log(
    '[Live2D Auto-Restore] Public assets written.'
  );

  // -----------------------------------------
  // Write dist assets if dist exists
  // -----------------------------------------

  const distDir = path.resolve(
    __dirname,
    '../dist'
  );

  if (fs.existsSync(distDir)) {
    const distMoc = path.join(
      distDir,
      'live2d',
      'MassageSeacubus_rei.moc3'
    );

    const distTex = path.join(
      distDir,
      'live2d',
      'MassageSeacubus_rei.4096',
      'texture_00.png'
    );

    writeBinary(distMoc, mocBin);
    writeBinary(distTex, texBin);

    console.log(
      '[Live2D Auto-Restore] Dist assets written.'
    );
  }

  // -----------------------------------------
  // Final verification
  // -----------------------------------------

  console.log('');
  console.log(
    '[Live2D Auto-Restore] SUCCESS'
  );

  console.log(
    `  MOC3 size    : ${mocBin.length} bytes`
  );

  console.log(
    `  Texture size : ${texBin.length} bytes`
  );

  console.log(
    `  MOC3 header  : ${mocBin.subarray(0, 4).toString('ascii')}`
  );

  console.log(
    `  PNG header   : ${texBin.subarray(0, 8).toString('hex')}`
  );
}

try {
  restoreAssets();
} catch (error) {
  console.error('');
  console.error(
    '[Live2D Auto-Restore] FAILED'
  );
  console.error(
    error instanceof Error
      ? error.message
      : error
  );
  console.error('');
  process.exit(1);
}
