const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Live2DAvatar.tsx');
let source = fs.readFileSync(file, 'utf8');

// Preserve the legacy Live2D component as the source of truth.
// Only migrate the adapter/runtime bootstrap and parameter timing to Cubism 5 + PixiJS 8.

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

// 1) Cubism 4 adapter -> Cubism 5 adapter.
source = source.replace(
  'const { Live2DLoader, Live2DModel } = await import("pixi-live2d-display/cubism4");',
  'const { Live2DModel } = await import("@naari3/pixi-live2d-display");'
);

// 2) Remove the legacy Pixi Loader middleware. The Cubism 5 package resolves
// model3.json FileReferences, physics, motions, expressions and textures.
source = source.replace(
  /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current \|\| !canvasRef\.current \|\| !containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;'
);

// 3) PixiJS 7 Application constructor -> PixiJS 8 async init.
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

// 4) Use Cubism 5 interaction options and the application's ticker.
source = source.replace(
  /const model = await Live2DModel\.from\(modelUrl,\s*\{\s*autoInteract:\s*false,?\s*\}\);/m,
`const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: pixiApp.ticker,
          autoUpdate: true,
        });`
);

// 5) Bind the renderer explicitly for PixiJS 8.
source = source.replace(
  /modelRef\.current\s*=\s*model;/,
  'model.setRenderer(pixiApp.renderer);\n        modelRef.current = model;'
);

// 6) Ensure the Pixi ticker is running.
if (!source.includes('pixiApp.ticker.start();')) {
  source = source.replace(
    /appRef\.current\s*=\s*pixiApp;/,
    'appRef.current = pixiApp;\n        pixiApp.ticker.start();'
  );
}

// 7) IMPORTANT: the legacy requestAnimationFrame loop races the Cubism
// motion/physics pass on the modern adapter. Keep its existing parameter logic
// unchanged, but invoke it from beforeModelUpdate so it runs immediately before
// the core model is finalized for rendering. Do not run a second RAF loop.
if (!source.includes('legacyBeforeModelUpdateHandler')) {
  const pattern = /        const updateModelParams = \(\) => \{[\s\S]*?\n        \};\n\n        animFrameId = requestAnimationFrame\(updateModelParams\);/m;
  const match = source.match(pattern);
  if (!match) {
    throw new Error('[Live2D 5] Could not locate legacy updateModelParams block.');
  }

  const matched = match[0];
  const withoutRaf = matched.replace(/\n\s*animFrameId = requestAnimationFrame\(updateModelParams\);\s*$/m, '');

  const replacement = `${withoutRaf}

        const legacyBeforeModelUpdateHandler = () => updateModelParams();
        const internalModelForHook = modelRef.current?.internalModel;
        if (internalModelForHook?.on) {
          internalModelForHook.on("beforeModelUpdate", legacyBeforeModelUpdateHandler);
        } else {
          throw new Error("[Live2D 5] InternalModel beforeModelUpdate event is unavailable.");
        }`;

  source = source.replace(pattern, replacement);
}

// 8) Cleanup the event listener when the component is destroyed.
const cleanupMarker = `isDestroyedRef.current = true;`;
if (!source.includes('internalModelForHook.off("beforeModelUpdate", legacyBeforeModelUpdateHandler);')) {
  source = source.replace(
    cleanupMarker,
    `${cleanupMarker}\n      try {\n        const cleanupInternalModel = modelRef.current?.internalModel;\n        if (cleanupInternalModel?.off && typeof legacyBeforeModelUpdateHandler === "function") {\n          cleanupInternalModel.off("beforeModelUpdate", legacyBeforeModelUpdateHandler);\n        }\n      } catch (e) {}`
  );
}

// 9) Hard guards: no legacy adapter/middleware and no silent removal of legacy UX.
if (/pixi-live2d-display\/cubism4/.test(source)) {
  throw new Error('[Live2D 5] Legacy Cubism 4 adapter remains after migration.');
}
if (/Live2DLoader\s*\.\s*middlewares/.test(source)) {
  throw new Error('[Live2D 5] Legacy Live2DLoader middleware remains after migration.');
}
if (!/@naari3\/pixi-live2d-display/.test(source)) {
  throw new Error('[Live2D 5] Cubism 5 adapter import is missing.');
}
if (!source.includes('legacyBeforeModelUpdateHandler')) {
  throw new Error('[Live2D 5] Legacy parameter timing hook was not installed.');
}

fs.writeFileSync(file, source, 'utf8');
console.log('[Live2D 5] Legacy UI/interactions preserved; custom parameter updates now run on beforeModelUpdate.');
