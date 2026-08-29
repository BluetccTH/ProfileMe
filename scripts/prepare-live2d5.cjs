const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../src/components/Live2DAvatar.tsx");
let source = fs.readFileSync(file, "utf8");

// Keep the legacy UI + interaction code. Only migrate the runtime bootstrap.
let changed = false;

// Legacy adapter -> Cubism 5 / Pixi 8 adapter.
const beforeImport = source;
source = source.replace(/pixi-live2d-display\/cubism4/g, "@naari3/pixi-live2d-display");
source = source.replace(/const\s*\{\s*Live2DLoader\s*,\s*Live2DModel\s*\}\s*=\s*await\s+import\([\"']@naari3\/pixi-live2d-display[\"']\);?/g,
  'const { Live2DModel } = await import("@naari3/pixi-live2d-display");');
changed ||= beforeImport !== source;

// Remove legacy custom loader middleware; the Cubism 5 package resolves FileReferences.
const beforeLoader = source;
source = source.replace(/\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current\s*\|\|\s*!canvasRef\.current\s*\|\|\s*!containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;');
// Also handle the optional-pose variant if present.
source = source.replace(/\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current\s*\|\|\s*!canvasRef\.current\s*\|\|\s*!containerRef\.current\) return;/,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;');
changed ||= beforeLoader !== source;

// PixiJS 7 constructor -> PixiJS 8 async init.
const beforeApp = source;
source = source.replace(/pixiApp\s*=\s*new\s+PIXI\.Application\(\{[\s\S]*?\n\s*\}\);/m,
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
        });`);
changed ||= beforeApp !== source;

// Old autoInteract -> Cubism 5 options.
const beforeModel = source;
source = source.replace(/const\s+model\s*=\s*await\s+Live2DModel\.from\(modelUrl,\s*\{\s*autoInteract:\s*false,?\s*\}\);/m,
`const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: pixiApp.ticker,
        });`);
changed ||= beforeModel !== source;

// Attach renderer before exposing the model.
if (!source.includes("model.setRenderer(pixiApp.renderer);")) {
  source = source.replace(/\n\s*modelRef\.current\s*=\s*model;/,
    '\n\n        model.setRenderer(pixiApp.renderer);\n        modelRef.current = model;');
  changed = true;
}

// Ensure ticker is active.
if (!source.includes("pixiApp.ticker.start();")) {
  source = source.replace(/\n\s*appRef\.current\s*=\s*pixiApp;/,
    '\n        appRef.current = pixiApp;\n        pixiApp.ticker.start();');
  changed = true;
}

// Hard CI guard: the source that Vite sees must be Cubism 5, never Cubism 4.
if (/pixi-live2d-display\/cubism4/.test(source)) {
  throw new Error("[Live2D 5] Legacy Cubism 4 adapter remains in Live2DAvatar.tsx");
}
if (/Live2DLoader\s*\.\s*middlewares/.test(source)) {
  throw new Error("[Live2D 5] Legacy Live2DLoader middleware remains in Live2DAvatar.tsx");
}
if (!/@naari3\/pixi-live2d-display/.test(source)) {
  throw new Error("[Live2D 5] Cubism 5 adapter import was not installed");
}

fs.writeFileSync(file, source, "utf8");
console.log(changed
  ? "[Live2D 5] Preserved legacy UI/interactions; migrated only runtime bootstrap to @naari3/pixi-live2d-display + PixiJS 8."
  : "[Live2D 5] Runtime already migrated; legacy UI/interactions preserved.");
