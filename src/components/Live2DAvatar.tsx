import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Info, RefreshCw, Smile, Sparkles } from "lucide-react";

const resolveAssetUrl = (assetPath: string): string => {
  if (!assetPath) return "";
  if (/^(https?:|data:|blob:)/.test(assetPath)) return assetPath;

  const base = (import.meta as any).env?.BASE_URL || "./";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = assetPath.replace(/^\.\//, "").replace(/^\//, "");

  try {
    const locationUrl = new URL(window.location.href);
    if (!locationUrl.pathname.endsWith("/") && !locationUrl.pathname.split("/").pop()?.includes(".")) {
      locationUrl.pathname += "/";
    }
    return new URL(cleanPath, new URL(normalizedBase, locationUrl)).href;
  } catch {
    return `./${cleanPath}`;
  }
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
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const destroyedRef = useRef(false);
  const targetRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<"mouse" | "auto" | "locked">("mouse");
  const [currentExpression, setCurrentExpression] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const expressions = [
    { id: 1, name: "Default", param: "ParamBiaoQ1", emoji: "✨" },
    { id: 2, name: "Smile", param: "ParamBiaoQ2", emoji: "😊" },
    { id: 3, name: "Blush", param: "ParamBiaoQ3", emoji: "😳" },
    { id: 4, name: "Sparkle", param: "ParamBiaoQ4", emoji: "🤩" },
    { id: 5, name: "Confident", param: "ParamBiaoQ5", emoji: "😎" },
    { id: 6, name: "Wink", param: "ParamBiaoQ6", emoji: "😉" },
    { id: 7, name: "Surprise", param: "ParamBiaoQ7", emoji: "😮" },
    { id: 8, name: "Soft Glow", param: "ParamBiaoQ6", emoji: "🌸" },
  ];

  useEffect(() => {
    destroyedRef.current = false;
    let pixiApp: any = null;
    let animationFrame = 0;

    const initLive2D = async () => {
      try {
        setLoading(true);
        setLoadingError(null);

        const PIXI = await import("pixi.js");

        if ((PIXI as any).settings) {
          try {
            (PIXI as any).settings.RENDER_OPTIONS = {
              ...((PIXI as any).settings.RENDER_OPTIONS || {}),
              hello: false,
            };
          } catch {}
        }

        if (!(window as any).Live2DCubismCore) {
          let script = document.querySelector('script[src*="live2dcubismcore"]') as HTMLScriptElement | null;
          if (!script) {
            script = document.createElement("script");
            script.src = resolveAssetUrl("live2dcubismcore.min.js");
            script.async = false;
            document.head.appendChild(script);
          }

          for (let attempt = 0; attempt < 100 && !(window as any).Live2DCubismCore; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

        if (!(window as any).Live2DCubismCore) {
          throw new Error("Live2DCubismCore could not be initialized.");
        }

        if (destroyedRef.current || !canvasRef.current || !containerRef.current) return;

        (window as any).PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");
        Live2DModel.registerTicker(PIXI.Ticker);

        const rect = containerRef.current.getBoundingClientRect();
        const appWidth = rect.width || width;
        const appHeight = rect.height || height;

        pixiApp = new PIXI.Application({
          view: canvasRef.current,
          width: appWidth,
          height: appHeight,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
        });
        appRef.current = pixiApp;

        // Direct static GitHub Pages URL. No runtime transform, encryption,
        // decryption, Blob URL, fetch middleware, or binary rewriting.
        const modelUrl = resolveAssetUrl("live2d/MassageSeacubus_rei.model3.json");
        const model = await Live2DModel.from(modelUrl, { autoInteract: false });

        if (destroyedRef.current) {
          model.destroy();
          pixiApp.destroy(true);
          return;
        }

        modelRef.current = model;
        const baseScale = Math.min(appWidth / model.width, appHeight / model.height) * 3.3;
        model.scale.set(baseScale);
        model.anchor.set(0.5, 0.22);
        model.position.set(appWidth / 2, appHeight * 0.48);
        pixiApp.stage.addChild(model);

        let lastBlink = performance.now();
        let nextBlink = 3000 + Math.random() * 2000;
        let blinking = false;
        const blinkDuration = 150;

        const updateModel = () => {
          if (destroyedRef.current || !modelRef.current) return;

          const now = performance.now();
          const core = modelRef.current.internalModel?.coreModel;
          if (core) {
            const smoothing = 0.08;
            targetRef.current.x += (targetRef.current.targetX - targetRef.current.x) * smoothing;
            targetRef.current.y += (targetRef.current.targetY - targetRef.current.y) * smoothing;

            const mx = targetRef.current.x;
            const my = targetRef.current.y;

            core.setParameterValueById("ParamAngleX", mx * 28);
            core.setParameterValueById("ParamAngleY", -my * 24);
            core.setParameterValueById("ParamAngleZ", mx * my * -15);
            core.setParameterValueById("ParamEyeBallX", mx * 0.95);
            core.setParameterValueById("ParamEyeBallY", -my * 0.95);
            core.setParameterValueById("ParamBodyAngleZ", mx * 8);
            core.setParameterValueById("ParamBreath", (Math.sin(now * 0.002) + 1) * 0.5);
            core.setParameterValueById("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);

            if (!blinking && now - lastBlink > nextBlink) {
              blinking = true;
              lastBlink = now;
            }
            if (blinking) {
              const elapsed = now - lastBlink;
              if (elapsed < blinkDuration) {
                const progress = elapsed / blinkDuration;
                const eyeOpen = progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2;
                core.setParameterValueById("ParamEyeLOpen", eyeOpen);
                core.setParameterValueById("ParamEyeROpen", eyeOpen);
              } else {
                blinking = false;
                lastBlink = now;
                nextBlink = 2500 + Math.random() * 3500;
                core.setParameterValueById("ParamEyeLOpen", 1);
                core.setParameterValueById("ParamEyeROpen", 1);
              }
            }
          }

          animationFrame = requestAnimationFrame(updateModel);
        };

        animationFrame = requestAnimationFrame(updateModel);
        setLoading(false);
        onLoaded?.();
      } catch (error: any) {
        console.error("Live2D initialization error:", error);
        setLoadingError(error?.message || "Failed to load Live2D model");
        setLoading(false);
      }
    };

    initLive2D();

    return () => {
      destroyedRef.current = true;
      cancelAnimationFrame(animationFrame);
      if (modelRef.current) {
        try { modelRef.current.destroy({ children: true }); } catch {}
        modelRef.current = null;
      }
      if (pixiApp) {
        try { pixiApp.destroy(true, { children: true, texture: true }); } catch {}
        pixiApp = null;
      }
      appRef.current = null;
    };
  }, [width, height, onLoaded]);

  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    if (!interactive || trackingMode === "locked" || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.4;
    const maxX = Math.max(window.innerWidth * 0.45, rect.width * 1.5);
    const maxY = Math.max(window.innerHeight * 0.45, rect.height * 1.5);
    targetRef.current.targetX = Math.max(-1, Math.min(1, (clientX - centerX) / maxX));
    targetRef.current.targetY = Math.max(-1, Math.min(1, (clientY - centerY) / maxY));
  }, [interactive, trackingMode]);

  useEffect(() => {
    if (trackingMode !== "mouse") return;
    const move = (event: MouseEvent) => handleMouseMove(event.clientX, event.clientY);
    const touch = (event: TouchEvent) => {
      if (event.touches.length) handleMouseMove(event.touches[0].clientX, event.touches[0].clientY);
    };
    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("touchmove", touch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("touchmove", touch);
    };
  }, [trackingMode, handleMouseMove]);

  useEffect(() => {
    if (trackingMode !== "auto") return;
    const timer = window.setInterval(() => {
      targetRef.current.targetX = (Math.random() - 0.5) * 1.2;
      targetRef.current.targetY = (Math.random() - 0.5) * 0.8;
    }, 2400);
    return () => window.clearInterval(timer);
  }, [trackingMode]);

  const setExpression = (id: number) => {
    const core = modelRef.current?.internalModel?.coreModel;
    if (!core) return;
    for (let i = 1; i <= 7; i++) core.setParameterValueById(`ParamBiaoQ${i}`, 0);
    core.setParameterValueById("ParamCheek", 0);
    if (currentExpression === id) {
      setCurrentExpression(null);
      return;
    }
    const expression = expressions.find((item) => item.id === id);
    if (!expression) return;
    core.setParameterValueById(expression.param, 1);
    if (id === 3 || id === 8) core.setParameterValueById("ParamCheek", 0.9);
    if (id === 2 || id === 5) core.setParameterValueById("ParamMouthForm", 1);
    setCurrentExpression(id);
  };

  const resetPose = () => {
    targetRef.current.targetX = 0;
    targetRef.current.targetY = 0;
    setCurrentExpression(null);
    const core = modelRef.current?.internalModel?.coreModel;
    if (!core) return;
    for (let i = 1; i <= 7; i++) core.setParameterValueById(`ParamBiaoQ${i}`, 0);
    core.setParameterValueById("ParamCheek", 0);
  };

  const handleClick = () => {
    setClickCount((count) => count + 1);
    const core = modelRef.current?.internalModel?.coreModel;
    if (!core) return;
    core.setParameterValueById("ParamCheek", 1);
    core.setParameterValueById("ParamMouthForm", 1.2);
    targetRef.current.targetY = Math.max(-1, Math.min(1, targetRef.current.targetY + 0.4));
    window.setTimeout(() => {
      if (modelRef.current?.internalModel?.coreModel) {
        modelRef.current.internalModel.coreModel.setParameterValueById("ParamCheek", 0);
      }
    }, 1500);
  };

  return (
    <div
      ref={containerRef}
      id="live2d-avatar-container"
      className={`relative rounded-3xl overflow-hidden group select-none flex flex-col items-center justify-center ${className}`}
      onClick={handleClick}
      onMouseLeave={() => {
        if (trackingMode === "mouse") {
          targetRef.current.targetX = 0;
          targetRef.current.targetY = 0;
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f19]/80 via-[#0d1224]/70 to-[#070913]/90 backdrop-blur-xl border border-blue-500/20 rounded-3xl shadow-2xl shadow-blue-500/10 -z-10" />
      <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur-md z-20 text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" /></span>
          <span className="font-semibold text-cyan-400 tracking-wider">LIVE2D MODEL</span>
          <span className="text-slate-500">•</span>
          <span>{trackingMode === "mouse" ? "👀 ตามเมาส์เรียลไทม์" : trackingMode === "auto" ? "🌀 สุ่มมองอัตโนมัติ" : "🔒 ล็อกทิศทาง"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" title="สลับโหมดการมอง" onClick={(e) => { e.stopPropagation(); setTrackingMode((mode) => mode === "mouse" ? "auto" : mode === "auto" ? "locked" : "mouse"); }} className="p-1 px-2 rounded-md bg-white/5 text-slate-300">
            <Eye className="w-3 h-3" />
          </button>
          <button type="button" title="Expressions" onClick={(e) => { e.stopPropagation(); setShowControls((value) => !value); }} className="p-1 px-1.5 rounded-md bg-white/5 text-slate-300">
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="รีเซ็ตท่าทาง" onClick={(e) => { e.stopPropagation(); resetPose(); }} className="p-1 px-1.5 rounded-md bg-white/5 text-slate-300">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/90 backdrop-blur-md z-30 rounded-3xl p-6 text-center">
          <div className="relative w-16 h-16 mb-4"><div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" /><div className="w-16 h-16 rounded-full border-2 border-t-blue-500 border-r-indigo-500 border-b-transparent border-l-purple-500 animate-spin" /><Sparkles className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" /></div>
          <p className="text-xs font-mono text-blue-400 tracking-wider font-semibold">INITIALIZING LIVE2D AVATAR...</p>
        </div>
      )}

      {loadingError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/95 z-30 rounded-3xl p-6 text-center">
          <Info className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-sm font-semibold text-rose-400 mb-1">Live2D Initialization</p>
          <p className="text-xs text-slate-400 max-w-xs mb-4">{loadingError}</p>
          <button type="button" onClick={() => window.location.reload()} className="px-4 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium">ลองใหม่อีกครั้ง</button>
        </div>
      )}

      <canvas ref={canvasRef} id="live2d-canvas" className="w-full h-full object-contain cursor-grab active:cursor-grabbing" style={{ minHeight: `${height}px`, minWidth: `${width}px` }} />

      {showControls && (
        <div onClick={(e) => e.stopPropagation()} className="absolute bottom-14 inset-x-3 bg-slate-950/90 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-3 shadow-2xl z-30">
          <div className="flex items-center justify-between mb-2"><span className="text-[11px] font-mono text-purple-400 font-semibold">😊 Expressions</span><span className="text-[10px] text-slate-400">คลิกเพื่อเปลี่ยนหน้า</span></div>
          <div className="grid grid-cols-4 gap-1.5">
            {expressions.map((expression) => (
              <button key={expression.id} type="button" onClick={() => setExpression(expression.id)} className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all ${currentExpression === expression.id ? "bg-purple-600 text-white" : "bg-white/5 text-slate-300 border border-white/5"}`}>
                <span>{expression.emoji}</span><span className="text-[10px] truncate">{expression.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-400">
        <span className="bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">🖱️ เลื่อนเมาส์เพื่อให้โมเดลหันหน้า/สบตา</span>
        <span className="hidden sm:inline bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">✨ คลิกบนตัวเพื่อโต้ตอบ ({clickCount})</span>
      </div>
    </div>
  );
};
