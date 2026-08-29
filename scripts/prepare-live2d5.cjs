const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Live2DAvatar.tsx');
let source = fs.readFileSync(file, 'utf8');

// This script is intentionally a minimal compatibility patch.
// The legacy Live2D component is the source of truth for UI + interaction.
// Only the Cubism adapter/runtime bootstrap is changed for Cubism 5 + PixiJS 8.

const requireMarker = (text, marker, label) => {
  if (!text.includes(marker)) {
    throw new Error(`[Live2D 5] Expected legacy marker missing: ${label}`);
  }
};

requireMarker(source, 'const { Live2DLoader, Live2DModel } = await import("pixi-live2d-display/cubism4");', 'legacy adapter import');
requireMarker(source, 'const updateModelParams = () => {', 'legacy animation loop');
requireMarker(source, 'const onWindowMouseMove = (e: MouseEvent) => {', 'legacy mouse tracking');
requireMarker(source, 'const handleModelClick = () => {', 'legacy click reaction');
requireMarker(source, 'const applyExpression = (expId: number) => {', 'legacy expressions');
requireMarker(source, 'const resetPose = () => {', 'legacy reset');

// 1) Replace only the Cubism 4 adapter import.
source = source.replace(
  'const { Live2DLoader, Live2DModel } = await import("pixi-live2d-display/cubism4");',
  'const { Live2DModel } = await import("@naari3/pixi-live2d-display");'
);

// 2) Remove the old custom Pixi Loader middleware. The Cubism 5 adapter handles
// model3.json -> MOC3/texture/physics/expression resource resolution itself.
source = source.replace(
  /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current \|\| !canvasRef\.current \|\| !containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;'
);

// 3) PixiJS 7 Application constructor -> PixiJS 8 async initialization.
source = source.replace(
  /pixiApp\s*=\s*new PIXI\.Application\(\{[\s\S]*?\n\s*\}\);/m,
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
          powerPreference: "high-performance",
        });`
);

// 4) Cubism 5 replaces the deprecated autoInteract option. Keep automatic
// model updating enabled through the app ticker; custom behavior remains below.
source = source.replace(
  /const model = await Live2DModel\.from\(modelUrl,\s*\{\s*autoInteract:\s*false,?\s*\}\);/m,
`const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: pixiApp.ticker,
          autoUpdate: true,
        });`
);

// 5) Explicit renderer binding for the PixiJS 8 adapter.
source = source.replace(
  /modelRef\.current\s*=\s*model;/,
  'model.setRenderer(pixiApp.renderer);\n        modelRef.current = model;'
);

// 6) Keep the application ticker running without touching the legacy animation code.
if (!source.includes('pixiApp.ticker.start();')) {
  source = source.replace(
    /appRef\.current\s*=\s*pixiApp;/,
    'appRef.current = pixiApp;\n        pixiApp.ticker.start();'
  );
}

// 7) Critical Cubism 5 timing fix: the old requestAnimationFrame loop was
// racing the model's motion/physics parameter update. Keep that same loop and
// behavior, but also apply the same values at beforeModelUpdate so the legacy
// parameters win immediately before Core model update/load.
const legacyUpdateBlock = `        const updateModelParams = () => {`;
if (!source.includes('legacyBeforeModelUpdateHandler')) {
  const beforeFirst = source;
  source = source.replace(
    /        const updateModelParams = \(\) => \{[\s\S]*?\n        \};\n\n        animFrameId = requestAnimationFrame\(updateModelParams\);/m,
    (block) => {
      // Preserve the legacy function body exactly; remove only its recursive RAF scheduling.
      const body = block.replace(/\n\s*animFrameId = requestAnimationFrame\(updateModelParams\);\s*$/m, '');
      return `${body}\n\n        const legacyBeforeModelUpdateHandler = () => updateModelParams();\n        const internalModelForHook = modelRef.current?.internalModel;\n        if (internalModelForHook?.on) {\n          internalModelForHook.on("beforeModelUpdate", legacyBeforeModelUpdateHandler);\n        }\n\n        animFrameId = requestAnimationFrame(updateModelParams);`;
    }
  );
  if (beforeFirst === source) {
    throw new Error('[Live2D 5] Could not attach beforeModelUpdate compatibility hook.');
  }
}

// 8) Do not permit the migration to silently destroy the legacy UX.
if (/pixi-live2d-display\/cubism4/.test(source)) {
  throw new Error('[Live2D 5] Legacy Cubism 4 import remains after migration.');
}
if (/Live2DLoader\s*\.\s*middlewares/.test(source)) {
  throw new Error('[Live2D 5] Legacy Live2DLoader middleware remains after migration.');
}
if (!/@naari3\/pixi-live2d-display/.test(source)) {
  throw new Error('[Live2D 5] Cubism 5 adapter import is missing.');
}
if (!source.includes('legacyBeforeModelUpdateHandler')) {
  throw new Error('[Live2D 5] Legacy parameter update hook was not installed.');
}

fs.writeFileSync(file, source, 'utf8');
console.log('[Live2D 5] Legacy UI/interactions preserved; Cubism 5 runtime patched with beforeModelUpdate compatibility hook.');
