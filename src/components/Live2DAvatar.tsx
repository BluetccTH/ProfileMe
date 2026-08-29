import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Info, RefreshCw, Smile, Sparkles } from "lucide-react";

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

const EXPRESSIONS = [
  { id: 1, name: "Default", param: "ParamBiaoQ1", emoji: "✨" },
  { id: 2, name: "Smile", param: "ParamBiaoQ2", emoji: "😊" },
  { id: 3, name: "Blush", param: "ParamBiaoQ3", emoji: "😳" },
  { id: 4, name: "Sparkle", param: "ParamBiaoQ4", emoji: "🤩" },
  { id: 5, name: "Confident", param: "ParamBiaoQ5", emoji: "😎" },
  { id: 6, name: "Wink", param: "ParamBiaoQ6", emoji: "😉" },
  { id: 7, name: "Surprise", param: "ParamBiaoQ7", emoji: "😮" },
  { id: 8, name: "Soft", param: "ParamBiaoQ6", emoji: "🌸" },
];

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({ className = "", onLoaded, width = 380, height = 420, interactive = true }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);
  const destroyedRef = useRef(false);
  const trackingModeRef = useRef<"mouse" | "auto" | "locked">("mouse");
  const targetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const onLoadedRef = useRef(onLoaded);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackingMode, setTrackingMode] = useState<"mouse" | "auto" | "locked">("mouse");
  const [showControls, setShowControls] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<number | null>(null);
  const [clickCount, setClickCount] = useState(0);

  useEffect(() => { onLoadedRef.current = onLoaded; }, [onLoaded]);
  useEffect(() => { trackingModeRef.current = trackingMode; }, [trackingMode]);

  useEffect(() => {
    destroyedRef.current = false;
    let frame = 0;
    let app: any = null;
    let model: any = null;
    let clickTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastBlink = performance.now();
    let nextBlink = 3200 + Math.random() * 2600;
    let blinking = false;
    let blinkStarted = 0;

    const safeSet = (id: string, value: number) => {
      const core = modelRef.current?.internalModel?.coreModel;
      if (!core) return;
      try { core.setParameterValueById(id, value); } catch (_) {}
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!interactive || trackingModeRef.current === "locked" || !containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      targetRef.current.tx = Math.max(-1, Math.min(1, (event.clientX - (r.left + r.width / 2)) / Math.max(r.width * 0.72, 1)));
      targetRef.current.ty = Math.max(-1, Math.min(1, (event.clientY - (r.top + r.height * 0.38)) / Math.max(r.height * 0.72, 1)));
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      onPointerMove({ clientX: touch.clientX, clientY: touch.clientY } as PointerEvent);
    };

    const onModelClick = (event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button")) return;
      setClickCount((n) => n + 1);
      safeSet("ParamCheek", 1);
      safeSet("ParamMouthForm", 1);
      safeSet("ParamEyeLSmile", 1);
      safeSet("ParamEyeRSmile", 1);
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => safeSet("ParamCheek", 0), 1400);
    };

    const start = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!canvasRef.current || !containerRef.current) return;

        const PIXI = await import("pixi.js");
        const { Live2DModel } = await import("@naari3/pixi-live2d-display");
        (window as any).PIXI = PIXI;
        Live2DModel.registerTicker(PIXI.Ticker);

        if (!(window as any).Live2DCubismCore) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector("script[src*='live2dcubismcore']") as HTMLScriptElement | null;
            if (existing) {
              if ((window as any).Live2DCubismCore) { resolve(); return; }
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
        if (!(window as any).Live2DCubismCore) throw new Error("Cubism 5 Core is unavailable");

        const rect = containerRef.current.getBoundingClientRect();
        const appWidth = Math.max(1, rect.width || width);
        const appHeight = Math.max(1, rect.height || height);
        app = new PIXI.Application();
        await app.init({ canvas: canvasRef.current, width: appWidth, height: appHeight, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), preference: "webgl", preferWebGLVersion: 2, powerPreference: "high-performance" } as any);
        if (destroyedRef.current) { app.destroy(true); return; }
        appRef.current = app;

        const modelUrl = `${resolveAssetUrl("live2d/MassageSeacubus_rei.model3.json")}?v=20260829-all-effects2`;
        console.info("[Live2D] Cubism 5 model URL:", modelUrl);
        model = await Live2DModel.from(modelUrl, { ticker: PIXI.Ticker.shared, autoHitTest: false, autoFocus: false, autoUpdate: true } as any);
        if (destroyedRef.current) { try { model.destroy({ children: true }); } catch (_) {} try { app.destroy(true, { children: true }); } catch (_) {} return; }

        model.setRenderer(app.renderer);
        modelRef.current = model;
        model.visible = true;
        model.alpha = 1;
        model.eventMode = interactive ? "static" : "none";
        model.cursor = interactive ? "grab" : "default";

        const mw = Math.max(1, Number(model.width) || width);
        const mh = Math.max(1, Number(model.height) || height);
        const scale = Math.min(appWidth / mw, appHeight / mh) * 3.3;
        model.scale.set(scale);
        model.anchor.set(0.5, 0.22);
        model.position.set(appWidth / 2, appHeight * 0.48);
        app.stage.addChild(model);
        app.ticker.start();
        app.renderer.render(app.stage);

        const tick = () => {
          if (destroyedRef.current || !modelRef.current) return;
          const now = performance.now();
          targetRef.current.x += (targetRef.current.tx - targetRef.current.x) * 0.085;
          targetRef.current.y += (targetRef.current.ty - targetRef.current.y) * 0.085;
          const x = targetRef.current.x;
          const y = targetRef.current.y;

          safeSet("ParamAngleX", x * 28);
          safeSet("ParamAngleY", -y * 24);
          safeSet("ParamAngleZ", x * y * -15);
          safeSet("ParamEyeBallX", x * 0.95);
          safeSet("ParamEyeBallY", -y * 0.95);
          safeSet("ParamBodyAngleZ", x * 8);
          safeSet("ParamBreath", (Math.sin(now * 0.002) + 1) * 0.5);
          safeSet("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);

          if (!blinking && now - lastBlink >= nextBlink) {
            blinking = true;
            blinkStarted = now;
          }
          if (blinking) {
            const elapsed = now - blinkStarted;
            const duration = 170;
            if (elapsed < duration) {
              const p = elapsed / duration;
              const eye = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;
              safeSet("ParamEyeLOpen", eye);
              safeSet("ParamEyeROpen", eye);
            } else {
              blinking = false;
              lastBlink = now;
              nextBlink = 2800 + Math.random() * 4200;
              safeSet("ParamEyeLOpen", 1);
              safeSet("ParamEyeROpen", 1);
            }
          }
          frame = requestAnimationFrame(tick);
        };

        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        containerRef.current.addEventListener("click", onModelClick);
        frame = requestAnimationFrame(tick);
        setLoading(false);
        console.info("[Live2D] model created", { width: mw, height: mh, scale });
        onLoadedRef.current?.();
      } catch (err: any) {
        console.error("Live2D initialization error:", err);
        setError(err?.message || String(err) || "Failed to load Live2D model");
        setLoading(false);
      }
    };

    void start();
    return () => {
      destroyedRef.current = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      if (containerRef.current) containerRef.current.removeEventListener("click", onModelClick);
      if (clickTimeout) clearTimeout(clickTimeout);
      try { model?.destroy({ children: true }); } catch (_) {}
      try { app?.destroy(true, { children: true }); } catch (_) {}
      modelRef.current = null;
      appRef.current = null;
    };
  }, [width, height, interactive]);

  useEffect(() => {
    if (trackingMode !== "auto") return;
    const timer = window.setInterval(() => {
      if (trackingModeRef.current === "auto") {
        targetRef.current.tx = (Math.random() - 0.5) * 1.15;
        targetRef.current.ty = (Math.random() - 0.5) * 0.8;
      }
    }, 2200);
    return () => window.clearInterval(timer);
  }, [trackingMode]);

  const resetPose = useCallback(() => {
    targetRef.current.tx = 0;
    targetRef.current.ty = 0;
    setCurrentExpression(null);
    const core = modelRef.current?.internalModel?.coreModel;
    if (!core) return;
    try {
      for (let i = 1; i <= 7; i++) core.setParameterValueById(`ParamBiaoQ${i}`, 0);
      core.setParameterValueById("ParamCheek", 0);
      core.setParameterValueById("ParamMouthForm", 0);
    } catch (_) {}
  }, []);

  const applyExpression = useCallback((id: number) => {
    const core = modelRef.current?.internalModel?.coreModel;
    if (!core) return;
    try {
      for (let i = 1; i <= 7; i++) core.setParameterValueById(`ParamBiaoQ${i}`, 0);
      core.setParameterValueById("ParamCheek", 0);
      if (currentExpression === id) { setCurrentExpression(null); return; }
      const exp = EXPRESSIONS.find((item) => item.id === id);
      if (!exp) return;
      core.setParameterValueById(exp.param, 1);
      if (id === 3 || id === 8) core.setParameterValueById("ParamCheek", 0.9);
      if (id === 2 || id === 5) core.setParameterValueById("ParamMouthForm", 1);
      setCurrentExpression(id);
    } catch (_) {}
  }, [currentExpression]);

  return (
    <div ref={containerRef} id="live2d-avatar-container" className={`relative rounded-3xl overflow-hidden group select-none flex flex-col items-center justify-center ${className}`} style={{ minWidth: width, minHeight: height, touchAction: "none", isolation: "isolate" }}>
      <div aria-hidden="true" className="absolute inset-0 rounded-3xl overflow-hidden" style={{ background: "radial-gradient(circle at 50% 35%, rgba(59,130,246,.22), transparent 40%), linear-gradient(180deg, rgba(11,15,25,.68), rgba(7,9,19,.90))", backdropFilter: "blur(26px) saturate(135%)", WebkitBackdropFilter: "blur(26px) saturate(135%)", zIndex: 0 }} />
      <div aria-hidden="true" className="absolute inset-[-30px] rounded-[3rem] pointer-events-none" style={{ background: "radial-gradient(circle at 50% 42%, rgba(99,102,241,.22), rgba(7,9,19,0) 62%)", filter: "blur(32px)", zIndex: 1 }} />
      <div className="absolute inset-0 border border-blue-500/20 rounded-3xl shadow-2xl shadow-blue-500/10 pointer-events-none" style={{ zIndex: 2 }} />

      <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur-md z-20 text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" /></span>
          <span className="font-semibold text-cyan-400 tracking-wider">LIVE2D MODEL</span><span className="text-slate-500">•</span>
          <span className="text-slate-400 font-sans truncate">{trackingMode === "mouse" ? "👀 ตามเมาส์เรียลไทม์" : trackingMode === "auto" ? "🌀 สุ่มมองอัตโนมัติ" : "🔒 ล็อกทิศทาง"}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" title="สลับโหมดการมอง" onClick={(e) => { e.stopPropagation(); setTrackingMode((m) => m === "mouse" ? "auto" : m === "auto" ? "locked" : "mouse"); }} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300"><Eye className="w-3 h-3" /></button>
          <button type="button" title="Expressions" onClick={(e) => { e.stopPropagation(); setShowControls((v) => !v); }} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300"><Smile className="w-3.5 h-3.5" /></button>
          <button type="button" title="Reset" onClick={(e) => { e.stopPropagation(); resetPose(); }} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300"><RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>

      {loading && !error && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/85 backdrop-blur-md z-30 rounded-3xl"><div className="relative w-16 h-16 mb-4"><div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" /><div className="w-16 h-16 rounded-full border-2 border-t-blue-500 border-r-indigo-500 border-b-transparent border-l-purple-500 animate-spin" /><Sparkles className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" /></div><p className="text-xs font-mono text-blue-400 tracking-wider font-semibold">INITIALIZING LIVE2D AVATAR...</p></div>}

      {error && <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070913]/95 z-30 rounded-3xl p-6 text-center"><Info className="w-10 h-10 text-rose-400 mb-3" /><p className="text-sm font-semibold text-rose-400 mb-1">Live2D Initialization</p><p className="text-xs text-slate-400 max-w-xs mb-4 break-words">{error}</p><button type="button" onClick={() => window.location.reload()} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-medium">ลองใหม่อีกครั้ง</button></div>}

      <canvas ref={canvasRef} id="live2d-canvas" className="relative z-10 w-full h-full object-contain cursor-grab active:cursor-grabbing" style={{ minHeight: height, minWidth: width }} />

      {showControls && <div onClick={(e) => e.stopPropagation()} className="absolute bottom-14 inset-x-3 bg-slate-950/90 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-3 shadow-2xl z-30"><div className="flex items-center justify-between mb-2"><span className="text-[11px] font-mono text-purple-400 font-semibold flex items-center gap-1.5"><Smile className="w-3.5 h-3.5" /> แสดงอารมณ์</span><span className="text-[10px] text-slate-500">เลือกอารมณ์ของ Lily</span></div><div className="grid grid-cols-4 gap-1.5">{EXPRESSIONS.map((exp) => { const active = currentExpression === exp.id; return <button key={exp.id} type="button" onClick={(e) => { e.stopPropagation(); applyExpression(exp.id); }} className={`px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${active ? "bg-purple-600 text-white scale-105" : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"}`}><span>{exp.emoji}</span><span className="truncate">{exp.name}</span></button>; })}</div></div>}

      <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-400 z-20"><span className="bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">🖱️ เลื่อนเมาส์เพื่อให้โมเดลหันหน้า/สบตา</span><span className="hidden sm:inline bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">✨ คลิกบนตัวเพื่อโต้ตอบ ({clickCount})</span></div>
    </div>
  );
};
