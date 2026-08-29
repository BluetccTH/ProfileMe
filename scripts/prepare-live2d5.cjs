const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Live2DAvatar.tsx');
let source = fs.readFileSync(file, 'utf8');

// Keep the legacy Live2D UI/interaction implementation intact.
// Only migrate the runtime bootstrap from the old Cubism 4/Pixi 7 package
// to @naari3/pixi-live2d-display + PixiJS 8 (Cubism 5).

// 1) Replace any legacy adapter import, regardless of formatting.
source = source.replace(
  /const\s*\{\s*Live2DLoader\s*,\s*Live2DModel\s*\}\s*=\s*await\s+import\(["']pixi-live2d-display\/cubism4["']\);?/g,
  'const { Live2DModel } = await import("@naari3/pixi-live2d-display");'
);
source = source.replace(
  /await\s+import\(["']pixi-live2d-display\/cubism4["']\)/g,
  'await import("@naari3/pixi-live2d-display")'
);
source = source.replace(/\bLive2DLoader\b/g, '/* Live2DLoader removed for Cubism 5 */');

// 2) Remove the custom legacy loader middleware block. The Cubism 5 package
// owns model3.json and FileReferences resolution and must receive the URL.
source = source.replace(
  /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current\s*\|\|\s*!canvasRef\.current\s*\|\|\s*!containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;'
);

// 3) Convert the Pixi 7 constructor to Pixi 8 async init, preserving visual options.
source = source.replace(
  /pixiApp\s*=\s*new\s+PIXI\.Application\(\{[\s\S]*?resolution:\s*window\.devicePixelRatio\s*\|\|\s*1,\s*\}\);/m,
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

// 4) Convert the old autoInteract option to the Cubism 5 options.
source = source.replace(
  /const model = await Live2DModel\.from\(modelUrl,\s*\{\s*autoInteract:\s*false,?\s*\}\);/m,
  `const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: pixiApp.ticker,
        });`
);

// 5) Attach the Pixi 8 renderer explicitly before storing the model.
source = source.replace(
  /modelRef\.current\s*=\s*model;/,
  'model.setRenderer(pixiApp.renderer);\n        modelRef.current = model;'
);

// 6) Ensure ticker is running after app initialization.
source = source.replace(
  /appRef\.current\s*=\s*pixiApp;/,
  'appRef.current = pixiApp;\n        pixiApp.ticker.start();'
);

// Never allow an unresolved legacy subpath through to Rollup.
if (/pixi-live2d-display\/cubism4/.test(source)) {
  throw new Error('[Live2D 5] Legacy cubism4 import remains after migration.');
}
if (/Live2DLoader\s*\.\s*middlewares/.test(source)) {
  throw new Error('[Live2D 5] Legacy Live2DLoader middleware remains after migration.');
}

fs.writeFileSync(file, source);
console.log('[Live2D 5] Legacy UI preserved; only runtime bootstrap migrated to @naari3/pixi-live2d-display + PixiJS 8.');
