import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles,
  Eye,
  Smile,
  RefreshCw,
  Maximize2,
  Minimize2,
  Sliders,
  Volume2,
  VolumeX,
  Camera,
  Layers,
  ChevronDown,
  Info
} from "lucide-react";

// Helper to safely resolve assets on both root domains and GitHub Pages subpaths (e.g. /ProfileMe/)
const resolveAssetUrl = (assetPath: string): string => {
  if (!assetPath) return "";
  if (
    assetPath.startsWith("http://") ||
    assetPath.startsWith("https://") ||
    assetPath.startsWith("data:") ||
    assetPath.startsWith("blob:")
  ) {
    return assetPath;
  }
  const base = (import.meta as any).env?.BASE_URL || "./";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = assetPath.startsWith("./")
    ? assetPath.slice(2)
    : assetPath.startsWith("/")
    ? assetPath.slice(1)
    : assetPath;

  try {
    const loc = new URL(window.location.href);
    if (!loc.pathname.endsWith("/") && !loc.pathname.split("/").pop()?.includes(".")) {
      loc.pathname += "/";
    }
    return new URL(cleanPath, new URL(normalizedBase, loc)).href;
  } catch (e) {
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
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [currentExpression, setCurrentExpression] = useState<number | null>(null);
  const [trackingMode, setTrackingMode] = useState<"mouse" | "auto" | "locked">("mouse");
  const [isHovered, setIsHovered] = useState(false);
  const [modelScale, setModelScale] = useState(0.24);
  const [showControls, setShowControls] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // References to keep Pixi app and model
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const targetPosRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isDestroyedRef = useRef(false);

  // Expression list based on the exp files
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

  // Initialize Pixi & Live2D
  useEffect(() => {
    isDestroyedRef.current = false;
    let pixiApp: any = null;
    let animFrameId: number;

    const initLive2D = async () => {
      try {
        setLoading(true);
        setLoadingError(null);

        // Dynamically import pixi.js and pixi-live2d-display to prevent SSR / early execution issues
        const PIXI = await import("pixi.js");

        // Silence PixiJS v7 hello without triggering deprecation warnings
        if (PIXI.settings) {
          try {
            (PIXI.settings as any).RENDER_OPTIONS = {
              ...((PIXI.settings as any).RENDER_OPTIONS || {}),
              hello: false,
            };
          } catch (e) {}
        }
        try {
          const origWarn = console.warn;
          console.warn = (...args: any[]) => {
            if (typeof args[0] === "string" && (args[0].includes("PixiJS Deprecation Warning") || args[0].includes("skipHello"))) {
              return;
            }
            origWarn.apply(console, args);
          };
          if (console.groupCollapsed) {
            const origGroup = console.groupCollapsed;
            console.groupCollapsed = (...args: any[]) => {
              if (typeof args[0] === "string" && (args[0].includes("PixiJS Deprecation Warning") || args[0].includes("skipHello"))) {
                return;
              }
              origGroup.apply(console, args);
            };
          }
        } catch (e) {}
        
        // Ensure Live2DCubismCore is loaded
        if (!(window as any).Live2DCubismCore) {
          let script = document.querySelector('script[src*="live2dcubismcore"]') as HTMLScriptElement;
          if (!script) {
            script = document.createElement("script");
            script.src = resolveAssetUrl("live2dcubismcore.min.js");
            document.head.appendChild(script);
          }
          let waitAttempts = 0;
          while (!(window as any).Live2DCubismCore && waitAttempts < 50) {
            await new Promise((r) => setTimeout(r, 100));
            waitAttempts++;
          }
        }

        if (!(window as any).Live2DCubismCore) {
          throw new Error("Live2DCubismCore not found. Please ensure live2dcubismcore.min.js is loaded.");
        }

        // Set global PIXI before importing cubism4
        (window as any).PIXI = PIXI;
        const { Live2DLoader, Live2DModel } = await import("pixi-live2d-display/cubism4");
        Live2DModel.registerTicker(PIXI.Ticker);

        // Safe guard PIXI v7 interaction compatibility to prevent 'manager.on is not a function' errors
        if (Live2DModel.prototype) {
          (Live2DModel.prototype as any).registerInteraction = function (manager: any) {
            if (manager !== (this as any).interactionManager) {
              (this as any).unregisterInteraction();
              if ((this as any)._autoInteract && manager && typeof manager.on === "function") {
                (this as any).interactionManager = manager;
                manager.on("pointermove", (this as any).onPointerMove, this);
              }
            }
          };
        }

        // Modern fetch-based loader middleware to bypass browser XHR issues & correctly resolve relative assets
        Live2DLoader.middlewares = [
          async (context: any, next: any) => {
            const rawUrl = context.settings
              ? context.settings.resolveURL(context.url)
              : context.url;
            const targetUrl = resolveAssetUrl(rawUrl);

            // Handle optional pose files or missing pose files gracefully
            if (!context.url || context.url === "Pose" || context.url === "pose") {
              context.result = null;
              return;
            }

            try {
              const res = await fetch(targetUrl, { cache: "no-cache" });
              if (!res.ok) {
                // If optional pose or auxiliary file is not found, don't crash
                if (targetUrl.toLowerCase().includes("pose")) {
                  context.result = null;
                  return;
                }
                throw new Error(`Failed to load ${targetUrl} (Status ${res.status})`);
              }
              if (context.type === "json") {
                context.result = await res.json();
              } else if (context.type === "arraybuffer") {
                const arrayBuffer = await res.arrayBuffer();
                // Validate Live2D Moc3 file integrity
                if (targetUrl.endsWith(".moc3") || (context.settings && context.settings.moc === context.url)) {
                  if (arrayBuffer.byteLength < 64) {
                    throw new Error(`Invalid .moc3 file size: ${arrayBuffer.byteLength} bytes.`);
                  }
                  const magic = new Uint8Array(arrayBuffer, 0, 4);
                  const magicStr = String.fromCharCode(...magic);
                  if (magicStr !== "MOC3") {
                    throw new Error(`File ${targetUrl} header is corrupted (got "${magicStr}", expected "MOC3"). Ensure binary files were not uploaded as text in Git/GitHub.`);
                  }
                }
                context.result = arrayBuffer;
              } else {
                context.result = await res.text();
              }
            } catch (fetchErr: any) {
              if (targetUrl.toLowerCase().includes("pose")) {
                context.result = null;
                return;
              }
              console.error("[Live2D Loader] Error fetching resource:", targetUrl, fetchErr);
              throw fetchErr;
            }
          }
        ];

        if (isDestroyedRef.current || !canvasRef.current || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const appWidth = rect.width || width;
        const appHeight = rect.height || height;

        // Initialize PIXI Application
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

        // Load Model with resolved URL (using modern options to avoid deprecation warnings)
        const modelUrl = resolveAssetUrl("live2d/MassageSeacubus_rei.model3.json");
        const model = await Live2DModel.from(modelUrl, {
          autoInteract: false,
          autoHitTest: false,
          autoFocus: false,
          crossOrigin: "anonymous",
        } as any);

        if (isDestroyedRef.current) {
          model.destroy();
          pixiApp.destroy(true);
          return;
        }

        model.autoInteract = false;
        modelRef.current = model;

        // Position and scale model to show half-body / upper body view
        const baseScale = Math.min(appWidth / model.width, appHeight / model.height) * 3.3;
        model.scale.set(baseScale);
        model.anchor.set(0.5, 0.22);
        model.position.set(appWidth / 2, appHeight * 0.48);

        pixiApp.stage.addChild(model);

        // Core animation & tracking loop
        let lastBlinkTime = performance.now();
        let blinkDuration = 150;
        let isBlinking = false;
        let nextBlinkInterval = 3000 + Math.random() * 2000;

        const updateModelParams = () => {
          if (!modelRef.current || isDestroyedRef.current) return;

          const now = performance.now();
          const internal = modelRef.current.internalModel;
          const core = internal?.coreModel;

          if (core) {
            // Smooth interpolate target mouse position
            const lerpSpeed = 0.08;
            targetPosRef.current.x += (targetPosRef.current.targetX - targetPosRef.current.x) * lerpSpeed;
            targetPosRef.current.y += (targetPosRef.current.targetY - targetPosRef.current.y) * lerpSpeed;

            const mx = targetPosRef.current.x; // [-1, 1]
            const my = targetPosRef.current.y; // [-1, 1]

            // 1. Head & Face Rotation
            const angleX = mx * 28; // -28 to +28 deg
            const angleY = -my * 24; // look up when mouse is up
            const angleZ = mx * my * -15; // natural tilt

            core.setParameterValueById("ParamAngleX", angleX);
            core.setParameterValueById("ParamAngleY", angleY);
            core.setParameterValueById("ParamAngleZ", angleZ);

            // 2. Eyeball Direction
            const eyeX = mx * 0.95;
            const eyeY = -my * 0.95;
            core.setParameterValueById("ParamEyeBallX", eyeX);
            core.setParameterValueById("ParamEyeBallY", eyeY);

            // 3. Body Turn
            const bodyZ = mx * 8;
            core.setParameterValueById("ParamBodyAngleZ", bodyZ);

            // 4. Natural Breathing Cycle
            const breathCycle = Math.sin(now * 0.002);
            core.setParameterValueById("ParamBreath", (breathCycle + 1) * 0.5);
            core.setParameterValueById("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);

            // 5. Natural Eye Blinking
            if (!isBlinking && now - lastBlinkTime > nextBlinkInterval) {
              isBlinking = true;
              lastBlinkTime = now;
            }

            if (isBlinking) {
              const elapsed = now - lastBlinkTime;
              if (elapsed < blinkDuration) {
                const progress = elapsed / blinkDuration;
                // Triangular blink curve: 1 -> 0 -> 1
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
          }

          animFrameId = requestAnimationFrame(updateModelParams);
        };

        animFrameId = requestAnimationFrame(updateModelParams);

        setLoading(false);
        if (onLoaded) onLoaded();
      } catch (err: any) {
        console.error("Live2D initialization error:", err);
        setLoadingError(err?.message || "Failed to load Live2D model");
        setLoading(false);
      }
    };

    initLive2D();

    return () => {
      isDestroyedRef.current = true;
      cancelAnimationFrame(animFrameId);
      if (modelRef.current) {
        try {
          modelRef.current.destroy({ children: true });
        } catch (e) {}
        modelRef.current = null;
      }
      if (pixiApp) {
        try {
          pixiApp.destroy(true, { children: true, texture: true });
        } catch (e) {}
        pixiApp = null;
      }
    };
  }, [width, height, onLoaded]);

  // Handle global and container mouse movements
  const handleMouseMove = useCallback((clientX: number, clientY: number) => {
    if (trackingMode === "locked" || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height * 0.4;

    // Calculate normalized offset from center [-1, 1]
    const maxRadiusX = Math.max(window.innerWidth * 0.45, rect.width * 1.5);
    const maxRadiusY = Math.max(window.innerHeight * 0.45, rect.height * 1.5);

    const deltaX = (clientX - centerX) / maxRadiusX;
    const deltaY = (clientY - centerY) / maxRadiusY;

    // Clamp between -1 and 1
    const clampedX = Math.max(-1, Math.min(1, deltaX));
    const clampedY = Math.max(-1, Math.min(1, deltaY));

    targetPosRef.current.targetX = clampedX;
    targetPosRef.current.targetY = clampedY;
  }, [trackingMode]);

  // Global mouse move listener
  useEffect(() => {
    const onWindowMouseMove = (e: MouseEvent) => {
      if (trackingMode === "mouse") {
        handleMouseMove(e.clientX, e.clientY);
      }
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (trackingMode === "mouse" && e.touches.length > 0) {
        handleMouseMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener("mousemove", onWindowMouseMove, { passive: true });
    window.addEventListener("touchmove", onWindowTouchMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("touchmove", onWindowTouchMove);
    };
  }, [trackingMode, handleMouseMove]);

  // Auto idle gazing mode if set to "auto"
  useEffect(() => {
    if (trackingMode !== "auto") return;

    const interval = setInterval(() => {
      // Pick random gentle gaze
      const randX = (Math.random() - 0.5) * 1.2;
      const randY = (Math.random() - 0.5) * 0.8;
      targetPosRef.current.targetX = randX;
      targetPosRef.current.targetY = randY;
    }, 2400);

    return () => clearInterval(interval);
  }, [trackingMode]);

  // Handle Model Click Reaction
  const handleModelClick = () => {
    setClickCount((prev) => prev + 1);

    if (modelRef.current?.internalModel?.coreModel) {
      const core = modelRef.current.internalModel.coreModel;
      
      // Quick blush and wink reaction
      core.setParameterValueById("ParamCheek", 1.0);
      core.setParameterValueById("ParamMouthForm", 1.2);
      core.setParameterValueById("ParamEyeLSmile", 1.0);
      core.setParameterValueById("ParamEyeRSmile", 1.0);

      // Brief nod
      targetPosRef.current.y += 0.4;

      setTimeout(() => {
        if (modelRef.current?.internalModel?.coreModel) {
          core.setParameterValueById("ParamCheek", 0.0);
        }
      }, 1500);
    }
  };

  // Toggle or apply expression
  const applyExpression = (expId: number) => {
    if (!modelRef.current?.internalModel?.coreModel) return;
    const core = modelRef.current.internalModel.coreModel;

    // Reset all expressions first
    for (let i = 1; i <= 7; i++) {
      core.setParameterValueById(`ParamBiaoQ${i}`, 0.0);
    }
    core.setParameterValueById("ParamCheek", 0.0);

    if (currentExpression === expId) {
      setCurrentExpression(null);
      return;
    }

    setCurrentExpression(expId);

    // Apply selected expression parameter
    const exp = expressions.find((e) => e.id === expId);
    if (exp) {
      core.setParameterValueById(exp.param, 1.0);
      if (expId === 3 || expId === 8) {
        core.setParameterValueById("ParamCheek", 0.9);
      }
      if (expId === 2 || expId === 5) {
        core.setParameterValueById("ParamMouthForm", 1.0);
      }
    }
  };

  // Reset Model to center
  const resetPose = () => {
    targetPosRef.current.targetX = 0;
    targetPosRef.current.targetY = 0;
    setCurrentExpression(null);
    if (modelRef.current?.internalModel?.coreModel) {
      const core = modelRef.current.internalModel.coreModel;
      for (let i = 1; i <= 7; i++) {
        core.setParameterValueById(`ParamBiaoQ${i}`, 0.0);
      }
      core.setParameterValueById("ParamCheek", 0.0);
    }
  };

  return (
    <div
      ref={containerRef}
      id="live2d-avatar-container"
      className={`relative rounded-3xl overflow-hidden group select-none flex flex-col items-center justify-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (trackingMode === "mouse") {
          // Return gently to center forward gaze
          targetPosRef.current.targetX = 0;
          targetPosRef.current.targetY = 0;
        }
      }}
      onClick={handleModelClick}
    >
      {/* Background Cyber Frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f19]/80 via-[#0d1224]/70 to-[#070913]/90 backdrop-blur-xl border border-blue-500/20 rounded-3xl shadow-2xl shadow-blue-500/10 -z-10" />

      {/* Cyber Neon Ambient Glow Behind Avatar */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-tr from-blue-600/20 via-indigo-500/20 to-purple-600/20 rounded-full blur-[50px] pointer-events-none -z-10 animate-pulse" />

      {/* Top Status & Mode Bar */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur-md z-20 text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
          </span>
          <span className="font-semibold text-cyan-400 tracking-wider">LIVE2D MODEL</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-sans truncate max-w-[110px] sm:max-w-none">
            {trackingMode === "mouse" ? "👀 ตามเมาส์เรียลไทม์" : trackingMode === "auto" ? "🌀 สุ่มมองอัตโนมัติ" : "🔒 ล็อกทิศทาง"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="สลับโหมดการมอง"
            onClick={(e) => {
              e.stopPropagation();
              setTrackingMode((prev) => (prev === "mouse" ? "auto" : prev === "auto" ? "locked" : "mouse"));
            }}
            className={`p-1 px-2 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
              trackingMode === "mouse"
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span className="text-[10px] hidden sm:inline">{trackingMode.toUpperCase()}</span>
          </button>

          <button
            type="button"
            title="ปรับอารมณ์ / แสดงเมนู"
            onClick={(e) => {
              e.stopPropagation();
              setShowControls((prev) => !prev);
            }}
            className={`p-1 px-1.5 rounded-md transition-colors cursor-pointer ${
              showControls ? "bg-purple-500/30 text-purple-300 border border-purple-500/40" : "bg-white/5 text-slate-400 hover:text-white"
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="รีเซ็ตท่าทาง"
            onClick={(e) => {
              e.stopPropagation();
              resetPose();
            }}
            className="p-1 px-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/90 backdrop-blur-md z-30 rounded-3xl p-6 text-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-2 border-t-blue-500 border-r-indigo-500 border-b-transparent border-l-purple-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-xs font-mono text-blue-400 tracking-wider font-semibold mb-1">
            INITIALIZING LIVE2D AVATAR...
          </p>
          <p className="text-[11px] text-slate-400">
            กำลังโหลดโมเดล 3D/Live2D และเชื่อมต่อ Neural Mouse Tracking
          </p>
        </div>
      )}

      {/* Error Fallback */}
      {loadingError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/95 z-30 rounded-3xl p-6 text-center">
          <Info className="w-10 h-10 text-rose-400 mb-3" />
          <p className="text-sm font-semibold text-rose-400 mb-1">Live2D Initialization</p>
          <p className="text-xs text-slate-400 max-w-xs mb-4">{loadingError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-medium cursor-pointer"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* Live2D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        id="live2d-canvas"
        className="w-full h-full object-contain cursor-grab active:cursor-grabbing"
        style={{ minHeight: `${height}px`, minWidth: `${width}px` }}
      />

      {/* Interactive Floating Expression Palette */}
      {showControls && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 inset-x-3 bg-slate-950/90 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-3 shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-purple-400 font-semibold flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5" /> แสดงอารมณ์ / Expressions
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              คลิกที่ปุ่มเพื่อเปลี่ยนหน้า
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {expressions.map((exp) => {
              const active = currentExpression === exp.id;
              return (
                <button
                  key={exp.id}
                  onClick={() => applyExpression(exp.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    active
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/30 scale-105"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
                  }`}
                >
                  <span>{exp.emoji}</span>
                  <span className="text-[10px] truncate">{exp.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Floating Hint Bar */}
      <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-400">
        <span className="bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">
          🖱️ เลื่อนเมาส์เพื่อให้โมเดลหันหน้า/สบตา
        </span>
        <span className="hidden sm:inline bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">
          ✨ คลิกบนตัวเพื่อโต้ตอบ ({clickCount})
        </span>
      </div>
    </div>
  );
};
