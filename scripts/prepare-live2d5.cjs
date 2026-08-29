const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "../src/components/Live2DAvatar.tsx");
let source = fs.readFileSync(file, "utf8");
let changed = false;

// Keep the legacy UI/interaction implementation intact. Only adapt the runtime.
// This script is intentionally deterministic so the same source produces the
// same Cubism 5/Pixi 8 bootstrap on every build.

// 1) Swap the old adapter import to the Cubism 5 adapter.
const beforeAdapter = source;
source = source.replace(
  /const\s*\{\s*Live2DLoader\s*,\s*Live2DModel\s*\}\s*=\s*await\s+import\([\"']pixi-live2d-display\/cubism4[\"']\);?/g,
  'const { Live2DModel } = await import("@naari3/pixi-live2d-display");'
);
source = source.replace(
  /await\s+import\([\"']pixi-live2d-display\/cubism4[\"']\)/g,
  'await import("@naari3/pixi-live2d-display")'
);
changed ||= beforeAdapter !== source;

// 2) Remove the legacy loader middleware. The Cubism 5 package resolves the
// model3.json FileReferences itself.
const beforeLoader = source;
source = source.replace(
  /\n\s*\/\/ Modern fetch-based loader middleware[\s\S]*?\n\s*if \(isDestroyedRef\.current\s*\|\|\s*!canvasRef\.current\s*\|\|\s*!containerRef\.current\) return;/g,
  '\n\n        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;'
);
changed ||= beforeLoader !== source;

// 3) Pixi 7 -> Pixi 8 application bootstrap. Keep the original visual intent.
const beforeApp = source;
source = source.replace(
  /pixiApp\s*=\s*new\s+PIXI\.Application\(\{[\s\S]*?\n\s*\}\);/m,
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

// 4) Register the Live2D model with the Pixi ticker and application ticker
// plugin when these exports are available. This keeps automatic model updates.
const beforeTickerRegistration = source;
source = source.replace(
  /\(window as any\)\.PIXI = PIXI;\n\s*const \{ Live2DModel \} = await import\("@naari3\/pixi-live2d-display"\);\n\s*Live2DModel\.registerTicker\(PIXI\.Ticker\);/m,
`(window as any).PIXI = PIXI;
        const { Live2DModel } = await import("@naari3/pixi-live2d-display");
        if ((PIXI as any).Ticker && (Live2DModel as any).registerTicker) {
          (Live2DModel as any).registerTicker((PIXI as any).Ticker);
        }
        if ((PIXI as any).Application && (PIXI as any).TickerPlugin && (PIXI as any).Application.registerPlugin) {
          try {
            (PIXI as any).Application.registerPlugin((PIXI as any).TickerPlugin);
          } catch (_) {}
        }`);
changed ||= beforeTickerRegistration !== source;

// 5) Old autoInteract is deprecated. Keep automatic focus/hit-testing disabled
// because the component already owns the mouse/touch interaction logic.
const beforeModelOptions = source;
source = source.replace(
  /const\s+model\s*=\s*await\s+Live2DModel\.from\(modelUrl,\s*\{\s*autoInteract:\s*false,?\s*\}\);/m,
`const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
        });`);
changed ||= beforeModelOptions !== source;

// 6) Attach the actual renderer before the model enters the stage.
if (!source.includes("model.setRenderer(pixiApp.renderer);")) {
  source = source.replace(
    /\n\s*modelRef\.current\s*=\s*model;/,
    '\n\n        if (typeof model.setRenderer === "function") {\n          model.setRenderer(pixiApp.renderer);\n        }\n        modelRef.current = model;'
  );
  changed = true;
}

// 7) Make the legacy animation logic run at the correct point in Cubism's
// update cycle. Live2D's InternalModel emits beforeModelUpdate immediately
// before Core update/loadParameters, so our custom parameters win over motion,
// physics and focus updates without rewriting the original interaction code.
const animationPattern = /\n\s*\/\/ Core animation & tracking loop[\s\S]*?\n\s*setLoading\(false\);\n\s*if \(onLoaded\) onLoaded\(\);/m;
const animationReplacement = `
        // Core animation & tracking loop (legacy behavior, Cubism 5 timing)
        let lastBlinkTime = performance.now();
        const blinkDuration = 150;
        let isBlinking = false;
        let nextBlinkInterval = 3000 + Math.random() * 2000;

        const updateModelParams = () => {
          if (!modelRef.current || isDestroyedRef.current) return;

          const now = performance.now();
          const internal = modelRef.current.internalModel;
          const core = internal?.coreModel;
          if (!core) return;

          const lerpSpeed = 0.08;
          targetPosRef.current.x += (targetPosRef.current.targetX - targetPosRef.current.x) * lerpSpeed;
          targetPosRef.current.y += (targetPosRef.current.targetY - targetPosRef.current.y) * lerpSpeed;

          const mx = targetPosRef.current.x;
          const my = targetPosRef.current.y;

          // Head / face
          core.setParameterValueById("ParamAngleX", mx * 28);
          core.setParameterValueById("ParamAngleY", -my * 24);
          core.setParameterValueById("ParamAngleZ", mx * my * -15);

          // Eyes
          core.setParameterValueById("ParamEyeBallX", mx * 0.95);
          core.setParameterValueById("ParamEyeBallY", -my * 0.95);

          // Body turn
          core.setParameterValueById("ParamBodyAngleZ", mx * 8);

          // Breathing
          const breathCycle = Math.sin(now * 0.002);
          core.setParameterValueById("ParamBreath", (breathCycle + 1) * 0.5);
          core.setParameterValueById("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);

          // Blink
          if (!isBlinking && now - lastBlinkTime > nextBlinkInterval) {
            isBlinking = true;
            lastBlinkTime = now;
          }
          if (isBlinking) {
            const elapsed = now - lastBlinkTime;
            if (elapsed < blinkDuration) {
              const progress = elapsed / blinkDuration;
              const eyeOpen = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
              core.setParameterValueById("ParamEyeLOpen", eyeOpen);
              core.setParameterValueById("ParamEyeROpen", eyeOpen);
            } else {
              isBlinking = false;
              lastBlinkTime = now;
              nextBlinkInterval = 2500 + Math.random() * 3500;
              core.setParameterValueById("ParamEyeLOpen", 1.0);
              core.setParameterValueById("ParamEyeROpen", 1.0);
            }
          }
        };

        if (internal && typeof internal.on === "function") {
          internal.on("beforeModelUpdate", updateModelParams);
        } else {
          // Fallback for unexpected adapter changes.
          const fallbackTick = () => updateModelParams();
          pixiApp.ticker.add(fallbackTick);
        }

        setLoading(false);
        if (onLoaded) onLoaded();`;

if (animationPattern.test(source)) {
  source = source.replace(animationPattern, animationReplacement);
  changed = true;
} else if (!source.includes('beforeModelUpdate", updateModelParams')) {
  throw new Error("[Live2D 5] Could not locate the legacy animation block.");
}

// 8) Start the app ticker when the adapter exposes it.
if (!source.includes("pixiApp.ticker.start();")) {
  source = source.replace(
    /appRef\.current\s*=\s*pixiApp;/,
    'appRef.current = pixiApp;\n        if (pixiApp.ticker && typeof pixiApp.ticker.start === "function") {\n          pixiApp.ticker.start();\n        }'
  );
  changed = true;
}

// 9) Guard the build: never allow the old adapter/middleware to reach Vite.
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
  ? "[Live2D 5] Legacy UI/interactions preserved; Cubism 5 runtime and update timing migrated."
  : "[Live2D 5] Source already migrated; legacy UI/interactions preserved.");
