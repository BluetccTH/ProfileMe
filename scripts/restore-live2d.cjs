const fs = require('fs');
const path = require('path');

function cleanBase64(value) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/\s+/g, '');
}

function decodeBase64File(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const cleaned = cleanBase64(raw);

  if (!cleaned) {
    throw new Error(`Base64 file is empty: ${filePath}`);
  }

  // Base64 length must be divisible by 4
  if (cleaned.length % 4 !== 0) {
    throw new Error(
      `Invalid Base64 length in ${path.basename(filePath)}: ${cleaned.length}`
    );
  }

  // Detect accidental data-url prefix
  const normalized = cleaned.replace(
    /^data:[^;]+;base64,/i,
    ''
  );

  const buffer = Buffer.from(normalized, 'base64');

  if (!buffer.length) {
    throw new Error(
      `Decoded buffer is empty: ${path.basename(filePath)}`
    );
  }

  return buffer;
}

function validateMoc3(buffer, filePath) {
  // Live2D Cubism MOC3 starts with ASCII "MOC3"
  const magic = buffer.subarray(0, 4).toString('ascii');

  if (magic !== 'MOC3') {
    const hex = buffer
      .subarray(0, 16)
      .toString('hex')
      .match(/.{1,2}/g)
      ?.join(' ') || '';

    throw new Error(
      `.moc3 validation failed: ${path.basename(filePath)}\n` +
      `Expected header: MOC3\n` +
      `Actual header: ${JSON.stringify(magic)}\n` +
      `First bytes: ${hex}`
    );
  }

  if (buffer.length < 64) {
    throw new Error(
      `.moc3 file is suspiciously small: ${buffer.length} bytes`
    );
  }
}

function validatePng(buffer, filePath) {
  const pngSignature = Buffer.from([
    0x89,
    0x50,
    0x4E,
    0x47,
    0x0D,
    0x0A,
    0x1A,
    0x0A
  ]);

  const signature = buffer.subarray(0, 8);

  if (!signature.equals(pngSignature)) {
    const hex = signature.toString('hex')
      .match(/.{1,2}/g)
      ?.join(' ') || '';

    throw new Error(
      `.png validation failed: ${path.basename(filePath)}\n` +
      `Expected PNG signature: 89 50 4e 47 0d 0a 1a 0a\n` +
      `Actual signature: ${hex}`
    );
  }

  if (buffer.length < 100) {
    throw new Error(
      `.png file is suspiciously small: ${buffer.length} bytes`
    );
  }
}

function sameContent(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  return a.equals(b);
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

  validateMoc3(
    mocBin,
    mocPath
  );

  validatePng(
    texBin,
    texPath
  );

  // -----------------------------------------
  // Detect obviously wrong source data
  // -----------------------------------------

  if (sameContent(mocBin, texBin)) {
    throw new Error(
      'CRITICAL: moc3_base64.txt and texture_base64.txt decode to identical binary data. ' +
      'The Base64 source files are wrong or duplicated.'
    );
  }

  // -----------------------------------------
  // Paths
  // -----------------------------------------

  const publicLive2D = path.resolve(
    __dirname,
    '../public/live2d'
  );

  const publicMoc = path.join(
    publicLive2D,
    'MassageSeacubus_rei.moc3'
  );

  const publicTex = path.join(
    publicLive2D,
    'MassageSeacubus_rei.4096',
    'texture_00.png'
  );

  // -----------------------------------------
  // Write public
  // -----------------------------------------

  writeBinary(
    publicMoc,
    mocBin
  );

  writeBinary(
    publicTex,
    texBin
  );

  console.log(
    '[Live2D Auto-Restore] Wrote public assets:'
  );

  console.log(
    `  MOC3 : ${publicMoc}`
  );

  console.log(
    `  PNG  : ${publicTex}`
  );

  // -----------------------------------------
  // Write dist if it exists
  // -----------------------------------------

  const distDir = path.resolve(
    __dirname,
    '../dist'
  );

  if (fs.existsSync(distDir)) {
    const distLive2D = path.join(
      distDir,
      'live2d'
    );

    const distMoc = path.join(
      distLive2D,
      'MassageSeacubus_rei.moc3'
    );

    const distTex = path.join(
      distLive2D,
      'MassageSeacubus_rei.4096',
      'texture_00.png'
    );

    writeBinary(
      distMoc,
      mocBin
    );

    writeBinary(
      distTex,
      texBin
    );

    console.log(
      '[Live2D Auto-Restore] Wrote dist assets:'
    );

    console.log(
      `  MOC3 : ${distMoc}`
    );

    console.log(
      `  PNG  : ${distTex}`
    );
  }

  // -----------------------------------------
  // Final summary
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
