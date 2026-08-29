const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/components/Live2DAvatar.tsx');
let source = fs.readFileSync(file, 'utf8');

// Preserve the legacy Live2D component as the source of truth.
// Only migrate the Cubism adapter/runtime bootstrap and parameter timing.

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

// 2) Remove the legacy Pixi Loader middleware. The Cubism 5 adapter resolves
// model3.json FileReferences, textures, motions, expressions and physics.
source = source.replace(
  /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current \|\| !canvasRef\.current \|\| !containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;'
);

// 3) PixiJS 7 Application constructor -> PixiJS 8 async initialization.
const appBefore = source;
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
if (source === appBefore) {
  throw new Error('[Live2D 5] Could not migrate the PixiJS Application initialization.');
}

// 4) Cubism 5 options. Use the shared ticker path expected by the adapter.
const modelBefore = source;
source = source.replace(
  /const model = await Live2DModel\.from\(modelUrl,\s*\{\s*autoInteract:\s*false,?\s*\}\);/m,
`const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: PIXI.Ticker.shared,
          autoUpdate: true,
        });`
);
if (source === modelBefore) {
  throw new Error('[Live2D 5] Could not migrate Live2DModel.from options.');
}

// 5) Explicit renderer binding for PixiJS 8.
if (!source.includes('model.setRenderer(pixiApp.renderer);')) {
  source = source.replace(
    /modelRef\.current\s*=\s*model;/,
    'model.setRenderer(pixiApp.renderer);\n        modelRef.current = model;'
  );
}
if (!source.includes('model.setRenderer(pixiApp.renderer);')) {
  throw new Error('[Live2D 5] Could not attach PixiJS 8 renderer to Live2D model.');
}

// 6) The shared ticker path is started by PIXI. Do not create a second
// model-specific ticker path that can desynchronize legacy behavior.
if (!source.includes('appRef.current = pixiApp;')) {
  throw new Error('[Live2D 5] PixiJS application reference was lost.');
}

// 7) IMPORTANT: preserve the legacy parameter logic exactly, but stop its
// requestAnimationFrame recursion. Run the same function from the model's
// beforeModelUpdate lifecycle event, immediately before Core model.update().
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
        if (!internalModelForHook?.on) {
          throw new Error("[Live2D 5] InternalModel beforeModelUpdate event is unavailable.");
        }
        internalModelForHook.on("beforeModelUpdate", legacyBeforeModelUpdateHandler);`;

  source = source.replace(pattern, replacement);
}

if (!source.includes('legacyBeforeModelUpdateHandler')) {
  throw new Error('[Live2D 5] beforeModelUpdate hook was not installed.');
}

// 8) No legacy adapter or custom legacy loader may reach Rollup.
if (/pixi-live2d-display\/cubism4/.test(source)) {
  throw new Error('[Live2D 5] Legacy Cubism 4 adapter remains after migration.');
}
if (/Live2DLoader\s*\.\s*middlewares/.test(source)) {
  throw new Error('[Live2D 5] Legacy Live2DLoader middleware remains after migration.');
}
if (!/@naari3\/pixi-live2d-display/.test(source)) {
  throw new Error('[Live2D 5] Cubism 5 adapter import is missing.');
}

fs.writeFileSync(file, source, 'utf8');
console.log('[Live2D 5] Legacy UI/interactions preserved; Cubism 5 runtime uses the shared Pixi ticker.');
