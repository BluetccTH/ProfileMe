import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Info, RefreshCw } from "lucide-react";

const resolveAssetUrl = (assetPath: string): string => {
  const base = (import.meta as any).env?.BASE_URL || "/";
  const clean = assetPath.replace(/^\.\//, "").replace(/^\//, "");
  return new URL(clean, new URL(base, window.location.href)).href;
};

interface Live2DAvatarProps {
  className?: string;
  onLoaded?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({
  className = "",
  onLoaded,
  width = 380,
  height = 420,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    const start = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!(window as any).Live2DCubismCore) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector("script[src*='live2dcubismcore']") as HTMLScriptElement | null;
            if (existing) {
              if ((window as any).Live2DCubismCore) {
                resolve();
                return;
              }
              existing.addEventListener("load", () => resolve(), { once: true });
              existing.addEventListener("error", () => reject(new Error("Cubism Core failed to load")), { once: true });
              return;
            }
            const script = document.createElement("script");
            script.src = resolveAssetUrl("live2dcubismcore.min.js");
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Cubism Core failed to load"));
            document.head.appendChild(script);
          });
        }

        const PIXI = await import("pixi.js");
        const { Live2DModel } = await import("@naari3/pixi-live2d-display");

        if (!(window as any).Live2DCubismCore) {
          throw new Error("Cubism 5 Core is not available");
        }
        if (!canvasRef.current || !containerRef.current || disposed) return;

        (window as any).PIXI = PIXI;
        Live2DModel.registerTicker(PIXI.Ticker);

        const rect = containerRef.current.getBoundingClientRect();
        const appWidth = Math.max(1, rect.width || width);
        const appHeight = Math.max(1, rect.height || height);

        const app = new PIXI.Application();
        await app.init({
          canvas: canvasRef.current,
          width: appWidth,
          height: appHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          preference: "webgl",
          preferWebGLVersion: 2,
        });

        if (disposed) {
          app.destroy(true);
          return;
        }
        appRef.current = app;

        // Let the Cubism 5 adapter parse model3.json itself. This preserves
        // optional FileReferences such as Pose/Physics/Motions/Expressions
        // exactly as the package expects and avoids reshaping its settings.
        const modelUrl = `${resolveAssetUrl("live2d/MassageSeacubus_rei.model3.json")}?v=20260829`;
        console.info("[Live2D] Cubism 5 model URL:", modelUrl);

        const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          autoUpdate: true,
          ticker: app.ticker,
        } as any);

        if (disposed) {
          model.destroy();
          app.destroy(true);
          return;
        }
        modelRef.current = model;

        const scale = Math.min(appWidth / model.width, appHeight / model.height) * 3.1;
        model.scale.set(scale);
        model.anchor.set(0.5, 0.2);
        model.position.set(appWidth / 2, appHeight * 0.48);
        app.stage.addChild(model);

        const onMove = (event: PointerEvent) => {
          const r = containerRef.current?.getBoundingClientRect();
          const core = modelRef.current?.internalModel?.coreModel;
          if (!r || !core) return;
          const x = Math.max(-1, Math.min(1, ((event.clientX - (r.left + r.width / 2)) / r.width) * 2));
          const y = Math.max(-1, Math.min(1, ((event.clientY - (r.top + r.height * 0.4)) / r.height) * 2));
          try {
            core.setParameterValueById("ParamAngleX", x * 28);
            core.setParameterValueById("ParamAngleY", -y * 24);
            core.setParameterValueById("ParamAngleZ", x * y * -12);
            core.setParameterValueById("ParamEyeBallX", x);
            core.setParameterValueById("ParamEyeBallY", -y);
          } catch (_) {}
        };

        containerRef.current.addEventListener("pointermove", onMove, { passive: true });
        (containerRef.current as any).__live2dPointerMove = onMove;

        setLoading(false);
        onLoaded?.();
      } catch (err: any) {
        console.error("Live2D initialization error:", err);
        setError(err?.message || String(err) || "Cubism 5 failed to initialize");
        setLoading(false);
      }
    };

    void start();

    return () => {
      disposed = true;
      const container = containerRef.current;
      const pointerMove = container && (container as any).__live2dPointerMove;
      if (container && pointerMove) container.removeEventListener("pointermove", pointerMove);
      try { modelRef.current?.destroy(); } catch (_) {}
      try { appRef.current?.destroy(true); } catch (_) {}
      modelRef.current = null;
      appRef.current = null;
    };
  }, [width, height, onLoaded]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-3xl flex items-center justify-center ${className}`}
      style={{ minWidth: width, minHeight: height }}
    >
      <canvas ref={canvasRef} className="w-full h-full" />

      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/90 rounded-3xl">
          <Sparkles className="w-8 h-8 text-blue-400 animate-pulse mb-3" />
          <span className="text-xs text-blue-300 font-mono">INITIALIZING CUBISM 5...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/95 rounded-3xl p-5 text-center">
          <Info className="w-9 h-9 text-rose-400 mb-2" />
          <div className="text-sm text-rose-400 font-semibold">Live2D Initialization</div>
          <div className="text-xs text-slate-400 mt-1 max-w-xs break-words">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs"
          >
            <RefreshCw className="inline w-3 h-3 mr-1" /> ลองใหม่อีกครั้ง
          </button>
        </div>
      )}
    </div>
  );
};
