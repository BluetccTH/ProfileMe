const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Live2DAvatar.tsx');
let source = fs.readFileSync(file, 'utf8');

// This script intentionally preserves the legacy Live2D UI/interaction code.
// It only adapts the runtime bootstrap from the old Cubism 4/Pixi 7 API to
// @naari3/pixi-live2d-display + PixiJS 8 (Cubism 5).

if (source.includes('from "pixi-live2d-display/cubism4"')) {
  source = source.replace(
    'const { Live2DLoader, Live2DModel } = await import("pixi-live2d-display/cubism4");',
    'const { Live2DModel } = await import("@naari3/pixi-live2d-display");'
  );

  source = source.replace(/\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current \|\| !canvasRef\.current \|\| !containerRef\.current\) return;/, '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;');

  source = source.replace(/pixiApp = new PIXI\.Application\(\{[\s\S]*?resolution: window\.devicePixelRatio \|\| 1,\n        \}\);/, `pixiApp = new PIXI.Application();
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
        });`);

  source = source.replace(
    'const model = await Live2DModel.from(modelUrl, {\n          autoInteract: false,\n        });',
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

  fs.writeFileSync(file, source);
  console.log('[Live2D 5] Legacy UI preserved; Cubism 4 runtime bootstrap migrated to Cubism 5/Pixi 8.');
} else {
  console.log('[Live2D 5] Source already uses the migrated runtime; leaving it unchanged.');
}
