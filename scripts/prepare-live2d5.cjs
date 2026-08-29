const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Live2DAvatar.tsx');
let source = fs.readFileSync(file, 'utf8');

// Preserve the legacy Live2D UI/interaction implementation. Only migrate the
// runtime bootstrap from the old Cubism 4/Pixi 7 package to Cubism 5/Pixi 8.

const legacyImport = /const\s*\{\s*Live2DLoader,\s*Live2DModel\s*\}\s*=\s*await import\(['"]pixi-live2d-display\/cubism4['"]\);/;
if (legacyImport.test(source)) {
  source = source.replace(
    legacyImport,
    'const { Live2DModel } = await import("@naari3/pixi-live2d-display");'
  );
}

// Remove the legacy custom Live2DLoader middleware. Cubism 5 resolves
// FileReferences from the model URL itself.
source = source.replace(
  /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current \|\| !canvasRef\.current \|\| !containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;'
);

// PixiJS 8 uses async Application.init(). Preserve the legacy dimensions/options.
source = source.replace(
  /pixiApp = new PIXI\.Application\(\{[\s\S]*?resolution: window\.devicePixelRatio \|\| 1,\n\s*\}\);/,
  `pixiApp = new PIXI.Application();
        await pixiApp.init({
          view: canvasRef.current,
          width: appWidth,
          height: appHeight,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          preference: "webgl",
          preferWebGLVersion: 2,
          powerPreference: "high-performance",
        });`
);

// Cubism 5/Pixi 8 runtime options. The rest of the old interaction code stays intact.
source = source.replace(
  /const model = await Live2DModel\.from\(modelUrl, \{\s*autoInteract:\s*false,\s*\}\);/,
  `const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: pixiApp.ticker,
        });`
);

source = source.replace(
  'modelRef.current = model;\n',
  'model.setRenderer(pixiApp.renderer);\n        modelRef.current = model;\n'
);

source = source.replace(
  'appRef.current = pixiApp;\n',
  'appRef.current = pixiApp;\n        pixiApp.ticker.start();\n'
);

if (/pixi-live2d-display\/cubism4/.test(source)) {
  throw new Error('[Live2D 5] Legacy cubism4 import remains after migration.');
}

fs.writeFileSync(file, source);
console.log('[Live2D 5] Legacy UI preserved; only Cubism 4 runtime bootstrap was migrated to @naari3/pixi-live2d-display + PixiJS 8.');
