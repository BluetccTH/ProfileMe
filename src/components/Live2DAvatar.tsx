import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Eye, Smile, RefreshCw, Maximize2, Minimize2, Sliders, Volume2, VolumeX, Camera, Layers, ChevronDown, Info } from "lucide-react";

const resolveAssetUrl = (assetPath: string): string => {
  if (!assetPath) return "";
  if (/^(?:https?:|data:|blob:)/.test(assetPath)) return assetPath;
  const base = (import.meta as any).env?.BASE_URL || "./";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = assetPath.replace(/^\.\//, "").replace(/^\//, "");
  try {
    const loc = new URL(window.location.href);
    if (!loc.pathname.endsWith("/") && !loc.pathname.split("/").pop()?.includes(".")) loc.pathname += "/";
    return new URL(cleanPath, new URL(normalizedBase, loc)).href;
  } catch {
    return `./${cleanPath}`;
  }
};

interface Live2DAvatarProps { className?: string; onLoaded?: () => void; width?: number; height?: number; interactive?: boolean; }

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({ className = "", onLoaded, width = 380, height = 420, interactive = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentExpression, setCurrentExpression] = useState<number | null>(null);
  const [trackingMode, setTrackingMode] = useState<"mouse" | "auto" | "locked">("mouse");
  const [isHovered, setIsHovered] = useState(false);
  const [modelScale, setModelScale] = useState(0.24);
  const [showControls, setShowControls] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const targetPosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isDestroyedRef = useRef(false);

  const expressions = [
    { id: 1, name: "Default (ปกติ)", param: "ParamBiaoQ1", emoji: "✨" },
    { id: 2, name: "Smile (ยิ้ม)", param: "ParamBiaoQ2", emoji: "😊" },
    { id: 3, name: "Blush (เขิน)", param: "ParamBiaoQ3", emoji: "😳" },
    { id: 4, name: "Sparkle (ตาเป็นประกาย)", param: "ParamBiaoQ4", emoji: "🤩" },
    { id: 5, name: "Confident (มั่นใจ)", param: "ParamBiaoQ5", emoji: "😎" },
    { id: 6, name: "Wink (ขยิบตา)", param: "ParamBiaoQ6", emoji: "😉" },
    { id: 7, name: "Surprise (ประหลาดใจ)", param: "ParamBiaoQ7", emoji: "😮" },
    { id: 8, name: "Soft Glow (ละมุน)", param: "ParamBiaoQ6", emoji: "🌸" },
  ];

  useEffect(() => {
    isDestroyedRef.current = false;
    let pixiApp: any = null;
    let animFrameId = 0;

    const initLive2D = async () => {
      try {
        setLoading(true); setLoadingError(null);
        const PIXI = await import("pixi.js");
        try { (PIXI.settings as any).RENDER_OPTIONS = { ...((PIXI.settings as any).RENDER_OPTIONS || {}), hello: false }; } catch {}
        if (!(window as any).Live2DCubismCore) {
          let script = document.querySelector('script[src*="live2dcubismcore"]') as HTMLScriptElement;
          if (!script) { script = document.createElement("script"); script.src = resolveAssetUrl("live2dcubismcore.min.js"); document.head.appendChild(script); }
          for (let i = 0; i < 50 && !(window as any).Live2DCubismCore; i++) await new Promise(r => setTimeout(r, 100));
        }
        if (!(window as any).Live2DCubismCore) throw new Error("Live2DCubismCore not found.");

        (window as any).PIXI = PIXI;
        const { Live2DLoader, Live2DModel } = await import("pixi-live2d-display/cubism4");
        Live2DModel.registerTicker(PIXI.Ticker);
        try { (PIXI.Ticker.shared as any).maxFPS = 0; (PIXI.Ticker.shared as any).minFPS = 0; } catch {}

        Live2DLoader.middlewares = [async (context: any, next: any) => {
          const rawUrl = context.settings ? context.settings.resolveURL(context.url) : context.url;
          const targetUrl = resolveAssetUrl(rawUrl);
          const res = await fetch(targetUrl);
          if (!res.ok) throw new Error(`Failed to load ${targetUrl} (Status ${res.status})`);
          if (context.type === "json") context.result = await res.json();
          else if (context.type === "arraybuffer") {
            const arrayBuffer = await res.arrayBuffer();
            if (targetUrl.endsWith(".moc3")) {
              const magic = new Uint8Array(arrayBuffer, 0, 4);
              if (String.fromCharCode(...magic) !== "MOC3") throw new Error(`Invalid MOC3: ${targetUrl}`);
            }
            context.result = arrayBuffer;
          } else context.result = await res.text();
          if (next) return next();
        }];

        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const appWidth = rect.width || width, appHeight = rect.height || height;
        pixiApp = new PIXI.Application({ view: canvasRef.current, width: appWidth, height: appHeight, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });
        appRef.current = pixiApp;

        // Original full 海魔完整版 model.
        const modelUrl = resolveAssetUrl("live2d/MassageSeacubus_rei.model3.json");
        const model = await Live2DModel.from(modelUrl, { autoInteract: false });
        if (isDestroyedRef.current) { model.destroy(); pixiApp.destroy(true); return; }
        modelRef.current = model;
        const baseScale = Math.min(appWidth / model.width, appHeight / model.height) * 3.3;
        model.scale.set(baseScale); model.anchor.set(0.5, 0.22); model.position.set(appWidth / 2, appHeight * 0.48); pixiApp.stage.addChild(model);

        let lastBlinkTime = performance.now(), blinkDuration = 150, isBlinking = false, nextBlinkInterval = 3000 + Math.random() * 2000;
        const updateModelParams = () => {
          if (!modelRef.current || isDestroyedRef.current) return;
          const now = performance.now();
          const core = modelRef.current.internalModel?.coreModel;
          if (core) {
            const lerpSpeed = 0.08;
            targetPosRef.current.x += (targetPosRef.current.targetX - targetPosRef.current.x) * lerpSpeed;
            targetPosRef.current.y += (targetPosRef.current.targetY - targetPosRef.current.y) * lerpSpeed;
            const mx = targetPosRef.current.x, my = targetPosRef.current.y;
            // Original 海魔完整版 uses standard Cubism Angle/EyeBall parameters.
            core.setParameterValueById("ParamAngleX", mx * 30);
            core.setParameterValueById("ParamAngleY", -my * 25);
            core.setParameterValueById("ParamAngleZ", mx * my * -15);
            core.setParameterValueById("ParamEyeBallX", mx);
            core.setParameterValueById("ParamEyeBallY", -my);
            core.setParameterValueById("ParamBodyAngleZ", mx * 8);
            if (!isBlinking && now - lastBlinkTime > nextBlinkInterval) { isBlinking = true; lastBlinkTime = now; }
            if (isBlinking) {
              const elapsed = now - lastBlinkTime;
              if (elapsed < blinkDuration) {
                const p = elapsed / blinkDuration;
                const eyeOpen = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;
                core.setParameterValueById("ParamEyeLOpen", eyeOpen); core.setParameterValueById("ParamEyeROpen", eyeOpen);
              } else { isBlinking = false; lastBlinkTime = now; nextBlinkInterval = 2500 + Math.random() * 3500; core.setParameterValueById("ParamEyeLOpen", 1); core.setParameterValueById("ParamEyeROpen", 1); }
            }
          }
          animFrameId = requestAnimationFrame(updateModelParams);
        };
        animFrameId = requestAnimationFrame(updateModelParams);
        setLoading(false); onLoaded?.();
      } catch (err: any) { console.error("Live2D initialization error:", err); setLoadingError(err?.message || "Failed to load Live2D model"); setLoading(false); }
    };
    initLive2D();
    return () => { isDestroyedRef.current = true; cancelAnimationFrame(animFrameId); if (modelRef.current) { try { modelRef.current.destroy({ children: true }); } catch {} modelRef.current = null; } if (pixiApp) { try { pixiApp.destroy(true, { children: true, texture: true }); } catch {} pixiApp = null; } };
  }, [width, height, onLoaded]);
