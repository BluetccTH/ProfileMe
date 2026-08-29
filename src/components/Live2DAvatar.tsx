import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Info, RefreshCw, Smile, Sparkles } from "lucide-react";

const asset = (path: string) => {
  const base = (import.meta as any).env?.BASE_URL || "/";
  const clean = path.replace(/^\//, "");
  return new URL(clean, new URL(base, window.location.href)).href;
};

type Mode = "mouse" | "auto" | "locked";

type Expression = readonly [number, string, string, string];

const EXPRESSIONS: Expression[] = [
  [1, "Default", "ParamBiaoQ1", "✨"],
  [2, "Smile", "ParamBiaoQ2", "😊"],
  [3, "Blush", "ParamBiaoQ3", "😳"],
  [4, "Sparkle", "ParamBiaoQ4", "🤩"],
  [5, "Confident", "ParamBiaoQ5", "😎"],
  [6, "Wink", "ParamBiaoQ6", "😉"],
  [7, "Surprise", "ParamBiaoQ7", "😮"],
  [8, "Soft Glow", "ParamBiaoQ6", "🌸"],
];

interface Props {
  className?: string;
  onLoaded?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const Live2DAvatar: React.FC<Props> = ({
  className = "",
  onLoaded,
  width = 380,
  height = 420,
  interactive = true,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const internalRef = useRef<any>(null);
  const destroyedRef = useRef(false);
  const modeRef = useRef<Mode>("mouse");
  const targetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const expressionRef = useRef<number | null>(null);
  const clickReactionRef = useRef(false);
  const loadedRef = useRef(onLoaded);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("mouse");
  const [showExpressions, setShowExpressions] = useState(false);
  const [expression, setExpression] = useState<number | null>(null);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    loadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const setModeState = useCallback((next: Mode) => {
    modeRef.current = next;
    setMode(next);
    if (next === "locked") {
      targetRef.current.tx = targetRef.current.x;
      targetRef.current.ty = targetRef.current.y;
    }
  }, []);

  const safeSet = useCallback((id: string, value: number) => {
    const core = internalRef.current?.coreModel;
    if (!core) return;
    try {
      core.setParameterValueById(id, value);
    } catch {
      // Some optional parameters may not exist in every model.
    }
  }, []);

  const resetExpressions = useCallback(() => {
    for (let i = 1; i <= 7; i++) safeSet(`ParamBiaoQ${i}`, 0);
    safeSet("ParamCheek", 0);
    safeSet("ParamMouthForm", 0);
    safeSet("ParamEyeLSmile", 0);
    safeSet("ParamEyeRSmile", 0);
  }, [safeSet]);

  const applyExpression = useCallback((id: number) => {
    resetExpressions();
    if (expressionRef.current === id) {
      expressionRef.current = null;
      setExpression(null);
      return;
    }

    const item = EXPRESSIONS.find((entry) => entry[0] === id);
    if (!item) return;

    expressionRef.current = id;
    setExpression(id);
    safeSet(item[2], 1);
    if (id === 3 || id === 8) safeSet("ParamCheek", 0.9);
    if (id === 2 || id === 5) safeSet("ParamMouthForm", 1);
  }, [resetExpressions, safeSet]);

  const resetPose = useCallback(() => {
    targetRef.current.tx = 0;
    targetRef.current.ty = 0;
    targetRef.current.x = 0;
    targetRef.current.y = 0;
    expressionRef.current = null;
    clickReactionRef.current = false;
    setExpression(null);
    resetExpressions();
  }, [resetExpressions]);

  useEffect(() => {
    destroyedRef.current = false;
    let app: any = null;
    let model: any = null;
    let internal: any = null;
    let autoTimer = 0;
    let clickTimer: ReturnType<typeof setTimeout> | null = null;

    let lastBlinkAt = performance.now();
    let nextBlinkIn = 3200 + Math.random() * 2800;
    let blinking = false;
    let blinkStartedAt = 0;

    const pointerToTarget = (clientX: number, clientY: number) => {
      if (!interactive || modeRef.current === "locked" || !hostRef.current) return;
      const rect = hostRef.current.getBoundingClientRect();
      const tx = (clientX - (rect.left + rect.width * 0.5)) / Math.max(rect.width * 0.72, 1);
      const ty = (clientY - (rect.top + rect.height * 0.38)) / Math.max(rect.height * 0.72, 1);
      targetRef.current.tx = Math.max(-1, Math.min(1, tx));
      targetRef.current.ty = Math.max(-1, Math.min(1, ty));
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerToTarget(event.clientX, event.clientY);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) pointerToTarget(touch.clientX, touch.clientY);
    };

    const onClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button")) return;
      if (!modelRef.current) return;
      clickReactionRef.current = true;
      setClicks((count) => count + 1);
      safeSet("ParamCheek", 1);
      safeSet("ParamMouthForm", 1);
      safeSet("ParamEyeLSmile", 1);
      safeSet("ParamEyeRSmile", 1);

      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickReactionRef.current = false;
      }, 1400);
    };

    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!canvasRef.current || !hostRef.current) return;

        const PIXI = await import("pixi.js");
        const { Live2DModel } = await import("@naari3/pixi-live2d-display");

        (window as any).PIXI = PIXI;
        Live2DModel.registerTicker(PIXI.Ticker);

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
            script.src = asset("live2dcubismcore.min.js");
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Cubism Core failed to load"));
            document.head.appendChild(script);
          });
        }

        if (!(window as any).Live2DCubismCore) {
          throw new Error("Cubism 5 Core unavailable");
        }

        const rect = hostRef.current.getBoundingClientRect();
        app = new PIXI.Application();
        await app.init({
          canvas: canvasRef.current,
          width: Math.max(1, rect.width || width),
          height: Math.max(1, rect.height || height),
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          preference: "webgl",
          preferWebGLVersion: 2,
          powerPreference: "high-performance",
        } as any);

        if (destroyedRef.current) return;
        appRef.current = app;
        app.ticker.start();

        const modelUrl = `${asset("live2d/MassageSeacubus_rei.model3.json")}?v=20260829-effects-final`;
        console.info("[Live2D] Cubism 5 model URL:", modelUrl);

        model = await Live2DModel.from(modelUrl, {
          ticker: PIXI.Ticker.shared,
          autoHitTest: false,
          autoFocus: false,
          autoUpdate: true,
        } as any);

        if (destroyedRef.current) {
          try { model.destroy({ children: true }); } catch {}
          try { app.destroy(true, { children: true }); } catch {}
          return;
        }

        model.setRenderer(app.renderer);
        modelRef.current = model;
        model.visible = true;
        model.alpha = 1;
        model.eventMode = interactive ? "static" : "none";
        model.cursor = interactive ? "grab" : "default";

        const mw = Math.max(1, Number(model.width) || width);
        const mh = Math.max(1, Number(model.height) || height);
        const scale = Math.min(app.screen.width / mw, app.screen.height / mh) * 3.3;
        model.scale.set(scale);
        model.anchor.set(0.5, 0.22);
        model.position.set(app.screen.width / 2, app.screen.height * 0.48);
        app.stage.addChild(model);

        internal = model.internalModel;
        internalRef.current = internal;

        // Critical: apply custom parameters after the framework's motion, eye-blink,
        // focus, physics and pose systems, but immediately before Core model.update().
        const beforeModelUpdate = () => {
          const core = internalRef.current?.coreModel;
          if (!core || destroyedRef.current) return;

          targetRef.current.x += (targetRef.current.tx - targetRef.current.x) * 0.09;
          targetRef.current.y += (targetRef.current.ty - targetRef.current.y) * 0.09;

          const x = targetRef.current.x;
          const y = targetRef.current.y;
          const now = performance.now();

          try {
            // 1) Smooth mouse/touch head + eye tracking
            core.setParameterValueById("ParamAngleX", x * 28);
            core.setParameterValueById("ParamAngleY", -y * 24);
            core.setParameterValueById("ParamAngleZ", x * y * -15);
            core.setParameterValueById("ParamEyeBallX", x * 0.95);
            core.setParameterValueById("ParamEyeBallY", -y * 0.95);
            core.setParameterValueById("ParamBodyAngleZ", x * 8);

            // 2) Breathing
            core.setParameterValueById("ParamBreath", (Math.sin(now * 0.002) + 1) * 0.5);
            core.setParameterValueById("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);

            // 3) Blink
            if (!blinking && now - lastBlinkAt >= nextBlinkIn) {
              blinking = true;
              blinkStartedAt = now;
            }
            if (blinking) {
              const p = (now - blinkStartedAt) / 170;
              if (p < 1) {
                const eye = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;
                core.setParameterValueById("ParamEyeLOpen", eye);
                core.setParameterValueById("ParamEyeROpen", eye);
              } else {
                blinking = false;
                lastBlinkAt = now;
                nextBlinkIn = 2800 + Math.random() * 4200;
                core.setParameterValueById("ParamEyeLOpen", 1);
                core.setParameterValueById("ParamEyeROpen", 1);
              }
            }

            // 4) Keep selected expression active
            const selected = expressionRef.current;
            if (selected) {
              const item = EXPRESSIONS.find((entry) => entry[0] === selected);
              if (item) core.setParameterValueById(item[2], 1);
              if (selected === 3 || selected === 8) core.setParameterValueById("ParamCheek", 0.9);
              if (selected === 2 || selected === 5) core.setParameterValueById("ParamMouthForm", 1);
            }

            // 5) Click reaction has priority for a short period
            if (clickReactionRef.current) {
              core.setParameterValueById("ParamCheek", 1);
              core.setParameterValueById("ParamMouthForm", 1);
              core.setParameterValueById("ParamEyeLSmile", 1);
              core.setParameterValueById("ParamEyeRSmile", 1);
            }
          } catch {
            // Keep animation alive even if a custom parameter is absent.
          }
        };

        internal.on("beforeModelUpdate", beforeModelUpdate);

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        hostRef.current.addEventListener("click", onClick);

        autoTimer = window.setInterval(() => {
          if (modeRef.current !== "auto") return;
          targetRef.current.tx = (Math.random() - 0.5) * 1.15;
          targetRef.current.ty = (Math.random() - 0.5) * 0.8;
        }, 2200);

        // Force an initial frame and keep render loop alive.
        app.ticker.start();
        app.render();

        setLoading(false);
        console.info("[Live2D] model created", {
          width: mw,
          height: mh,
          scale,
          effects: 11,
        });
        loadedRef.current?.();
      } catch (err: any) {
        console.error("Live2D initialization error:", err);
        setError(err?.message || String(err) || "Failed to load Live2D model");
        setLoading(false);
      }
    };

    void init();

    return () => {
      destroyedRef.current = true;
      if (autoTimer) window.clearInterval(autoTimer);
      if (clickTimer) clearTimeout(clickTimer);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      hostRef.current?.removeEventListener("click", onClick);
      try {
        internal?.off?.("beforeModelUpdate", beforeModelUpdate);
      } catch {}
      try { model?.destroy({ children: true }); } catch {}
      try { app?.destroy(true, { children: true }); } catch {}
      internalRef.current = null;
      modelRef.current = null;
      appRef.current = null;
    };
  }, [height, interactive, safeSet, width]);

  return (
    <div
      ref={hostRef}
      id="live2d-avatar-container"
      className={`relative rounded-3xl overflow-hidden group select-none flex flex-col items-center justify-center ${className}`}
      style={{ minWidth: width, minHeight: height, touchAction: "none", isolation: "isolate" }}
    >
      {/* Frosted glass background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl"
        style={{
          zIndex: 0,
          background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,.22), transparent 40%), linear-gradient(180deg, rgba(11,15,25,.64), rgba(7,9,19,.90))",
          backdropFilter: "blur(28px) saturate(140%)",
          WebkitBackdropFilter: "blur(28px) saturate(140%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-[-35px] rounded-[3rem] pointer-events-none animate-pulse"
        style={{
          zIndex: 1,
          background: "radial-gradient(circle at 50% 44%, rgba(99,102,241,.24), rgba(7,9,19,0) 62%)",
          filter: "blur(34px)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-3xl pointer-events-none"
        style={{ zIndex: 20, border: "1px solid rgba(59,130,246,.24)", boxShadow: "0 20px 70px rgba(59,130,246,.11)" }}
      />

      {/* Status / controls */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
          </span>
          <span className="font-semibold text-cyan-400 tracking-wider">LIVE2D MODEL</span>
          <span className="text-slate-500">•</span>
          <span className="truncate">
            {mode === "mouse" ? "👀 ตามเมาส์เรียลไทม์" : mode === "auto" ? "🌀 สุ่มมองอัตโนมัติ" : "🔒 ล็อกทิศทาง"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" title="เปลี่ยนโหมด" onClick={() => setModeState(mode === "mouse" ? "auto" : mode === "auto" ? "locked" : "mouse")} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300">
            <Eye className="w-3 h-3" />
          </button>
          <button type="button" title="Expressions" onClick={() => setShowExpressions((v) => !v)} className={`p-1.5 rounded-md ${showExpressions ? "bg-purple-500/20 text-purple-300" : "bg-white/5 text-slate-300"}`}>
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button type="button" title="Reset" onClick={resetPose} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {loading && !error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#070913]/82 backdrop-blur-md rounded-3xl">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-full border-2 border-t-blue-500 border-r-indigo-500 border-b-transparent border-l-purple-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-blue-400 absolute inset-0 m-auto" />
          </div>
          <span className="text-xs font-mono text-blue-300">INITIALIZING LIVE2D AVATAR...</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#070913]/95 rounded-3xl p-6 text-center">
          <Info className="w-10 h-10 text-rose-400 mb-3" />
          <span className="text-sm text-rose-400 font-semibold">Live2D Initialization</span>
          <span className="text-xs text-slate-400 mt-2 max-w-xs break-words">{error}</span>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs">ลองใหม่อีกครั้ง</button>
        </div>
      )}

      <canvas ref={canvasRef} id="live2d-canvas" className="relative z-10 w-full h-full block" style={{ minWidth: width, minHeight: height }} />

      {showExpressions && (
        <div onClick={(event) => event.stopPropagation()} className="absolute bottom-14 inset-x-3 z-40 bg-slate-950/92 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-3 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono text-purple-400 font-semibold">😊 Expressions 8 แบบ</span>
            <span className="text-[10px] text-slate-500">Lily</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {EXPRESSIONS.map(([id, name, , emoji]) => {
              const active = expression === id;
              return (
                <button key={id} type="button" onClick={() => applyExpression(id)} className={`px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${active ? "bg-purple-600 text-white scale-105" : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"}`}>
                  <span>{emoji}</span>
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="absolute bottom-3 inset-x-4 z-30 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-400">
        <span className="bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">🖱️ เลื่อนเมาส์ให้ Lily หันหน้า/สบตา</span>
        <span className="hidden sm:inline bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">✨ คลิกโต้ตอบ ({clicks})</span>
      </div>
    </div>
  );
};
