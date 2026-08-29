import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Info, RefreshCw, Smile, Sparkles } from "lucide-react";

const asset = (p: string) => new URL(p.replace(/^\//, ""), new URL((import.meta as any).env?.BASE_URL || "/", window.location.href)).href;

type Mode = "mouse" | "auto" | "locked";

const EXPRESSIONS = [
  [1, "Default", "ParamBiaoQ1", "✨"],
  [2, "Smile", "ParamBiaoQ2", "😊"],
  [3, "Blush", "ParamBiaoQ3", "😳"],
  [4, "Sparkle", "ParamBiaoQ4", "🤩"],
  [5, "Confident", "ParamBiaoQ5", "😎"],
  [6, "Wink", "ParamBiaoQ6", "😉"],
  [7, "Surprise", "ParamBiaoQ7", "😮"],
  [8, "Soft Glow", "ParamBiaoQ6", "🌸"],
] as const;

interface Props { className?: string; onLoaded?: () => void; width?: number; height?: number; interactive?: boolean; }

export const Live2DAvatar: React.FC<Props> = ({ className = "", onLoaded, width = 380, height = 420, interactive = true }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const appRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const destroyedRef = useRef(false);
  const modeRef = useRef<Mode>("mouse");
  const targetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const loadedCbRef = useRef(onLoaded);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("mouse");
  const [showControls, setShowControls] = useState(false);
  const [expression, setExpression] = useState<number | null>(null);
  const [clicks, setClicks] = useState(0);

  useEffect(() => { loadedCbRef.current = onLoaded; }, [onLoaded]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const safeSet = useCallback((id: string, value: number) => {
    const core = modelRef.current?.internalModel?.coreModel;
    if (!core) return;
    try { core.setParameterValueById(id, value); } catch { /* parameter may not exist */ }
  }, []);

  const applyExpression = useCallback((id: number) => {
    for (let i = 1; i <= 7; i++) safeSet(`ParamBiaoQ${i}`, 0);
    safeSet("ParamCheek", 0);
    safeSet("ParamMouthForm", 0);
    if (expression === id) { setExpression(null); return; }
    const item = EXPRESSIONS.find(x => x[0] === id);
    if (!item) return;
    safeSet(item[2], 1);
    if (id === 3 || id === 8) safeSet("ParamCheek", 0.9);
    if (id === 2 || id === 5) safeSet("ParamMouthForm", 1);
    setExpression(id);
  }, [expression, safeSet]);

  const resetPose = useCallback(() => {
    targetRef.current.tx = 0;
    targetRef.current.ty = 0;
    setExpression(null);
    for (let i = 1; i <= 7; i++) safeSet(`ParamBiaoQ${i}`, 0);
    safeSet("ParamCheek", 0);
    safeSet("ParamMouthForm", 0);
  }, [safeSet]);

  useEffect(() => {
    destroyedRef.current = false;
    let app: any = null;
    let model: any = null;
    let blinkAt = performance.now() + 2500;
    let blinking = false;
    let blinkStart = 0;
    let nextBlink = 3500;
    let clickTimer: ReturnType<typeof setTimeout> | null = null;

    const updateTarget = (cx: number, cy: number) => {
      if (!interactive || modeRef.current === "locked" || !hostRef.current) return;
      const r = hostRef.current.getBoundingClientRect();
      targetRef.current.tx = Math.max(-1, Math.min(1, (cx - (r.left + r.width * 0.5)) / Math.max(r.width * 0.72, 1)));
      targetRef.current.ty = Math.max(-1, Math.min(1, (cy - (r.top + r.height * 0.38)) / Math.max(r.height * 0.72, 1)));
    };
    const onPointer = (e: PointerEvent) => updateTarget(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) updateTarget(t.clientX, t.clientY); };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest("button")) return;
      setClicks(n => n + 1);
      safeSet("ParamCheek", 1);
      safeSet("ParamMouthForm", 1);
      safeSet("ParamEyeLSmile", 1);
      safeSet("ParamEyeRSmile", 1);
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { safeSet("ParamCheek", 0); safeSet("ParamMouthForm", 0); }, 1400);
    };

    const init = async () => {
      try {
        setLoading(true); setError(null);
        if (!canvasRef.current || !hostRef.current) return;
        const PIXI = await import("pixi.js");
        const { Live2DModel } = await import("@naari3/pixi-live2d-display");
        (window as any).PIXI = PIXI;
        Live2DModel.registerTicker(PIXI.Ticker);

        if (!(window as any).Live2DCubismCore) {
          await new Promise<void>((resolve, reject) => {
            const old = document.querySelector("script[src*='live2dcubismcore']") as HTMLScriptElement | null;
            if (old) { if ((window as any).Live2DCubismCore) resolve(); else { old.addEventListener("load", () => resolve(), { once: true }); old.addEventListener("error", () => reject(new Error("Cubism Core failed to load")), { once: true }); } return; }
            const s = document.createElement("script");
            s.src = asset("live2dcubismcore.min.js");
            s.onload = () => resolve(); s.onerror = () => reject(new Error("Cubism Core failed to load"));
            document.head.appendChild(s);
          });
        }
        if (!(window as any).Live2DCubismCore) throw new Error("Cubism 5 Core unavailable");

        const r = hostRef.current.getBoundingClientRect();
        app = new PIXI.Application();
        await app.init({ canvas: canvasRef.current, width: Math.max(1, r.width || width), height: Math.max(1, r.height || height), backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2), preference: "webgl", preferWebGLVersion: 2, powerPreference: "high-performance" } as any);
        if (destroyedRef.current) return;
        appRef.current = app;
        app.ticker.start();

        const url = `${asset("live2d/MassageSeacubus_rei.model3.json")}?v=20260829-full11`;
        console.info("[Live2D] Cubism 5 model URL:", url);
        model = await Live2DModel.from(url, { ticker: PIXI.Ticker.shared, autoHitTest: false, autoFocus: false, autoUpdate: true } as any);
        if (destroyedRef.current) return;
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

        const tick = () => {
          if (destroyedRef.current || !modelRef.current) return;
          const now = performance.now();
          targetRef.current.x += (targetRef.current.tx - targetRef.current.x) * 0.085;
          targetRef.current.y += (targetRef.current.ty - targetRef.current.y) * 0.085;
          const x = targetRef.current.x, y = targetRef.current.y;
          safeSet("ParamAngleX", x * 28);
          safeSet("ParamAngleY", -y * 24);
          safeSet("ParamAngleZ", x * y * -15);
          safeSet("ParamEyeBallX", x * 0.95);
          safeSet("ParamEyeBallY", -y * 0.95);
          safeSet("ParamBodyAngleZ", x * 8);
          safeSet("ParamBreath", (Math.sin(now * 0.002) + 1) * 0.5);
          safeSet("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);
          if (!blinking && now >= blinkAt) { blinking = true; blinkStart = now; }
          if (blinking) {
            const p = (now - blinkStart) / 170;
            if (p < 1) {
              const eye = p < 0.5 ? 1 - p * 2 : (p - 0.5) * 2;
              safeSet("ParamEyeLOpen", eye); safeSet("ParamEyeROpen", eye);
            } else {
              blinking = false; blinkAt = now + nextBlink; nextBlink = 2800 + Math.random() * 4000;
              safeSet("ParamEyeLOpen", 1); safeSet("ParamEyeROpen", 1);
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("touchmove", onTouch, { passive: true });
        hostRef.current.addEventListener("click", onClick);
        rafRef.current = requestAnimationFrame(tick);
        setLoading(false);
        console.info("[Live2D] model created", { width: mw, height: mh, scale });
        loadedCbRef.current?.();
      } catch (e: any) {
        console.error("Live2D initialization error:", e);
        setError(e?.message || String(e)); setLoading(false);
      }
    };
    void init();
    return () => {
      destroyedRef.current = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      hostRef.current?.removeEventListener("click", onClick);
      if (clickTimer) clearTimeout(clickTimer);
      try { model?.destroy({ children: true }); } catch {}
      try { app?.destroy(true, { children: true }); } catch {}
      modelRef.current = null; appRef.current = null;
    };
  }, [width, height, interactive, safeSet]);

  useEffect(() => {
    if (mode !== "auto") return;
    const id = window.setInterval(() => {
      targetRef.current.tx = (Math.random() - 0.5) * 1.1;
      targetRef.current.ty = (Math.random() - 0.5) * 0.75;
    }, 2200);
    return () => window.clearInterval(id);
  }, [mode]);

  return (
    <div ref={hostRef} id="live2d-avatar-container" className={`relative rounded-3xl overflow-hidden group select-none ${className}`} style={{ minWidth: width, minHeight: height, touchAction: "none", isolation: "isolate" }}>
      <div className="absolute inset-0 rounded-3xl" style={{ zIndex: 0, background: "radial-gradient(circle at 50% 35%, rgba(59,130,246,.24), transparent 42%), linear-gradient(180deg, rgba(11,15,25,.68), rgba(7,9,19,.92))", backdropFilter: "blur(26px) saturate(135%)", WebkitBackdropFilter: "blur(26px) saturate(135%)" }} />
      <div className="absolute inset-[-25px] pointer-events-none rounded-[3rem]" style={{ zIndex: 1, background: "radial-gradient(circle at 50% 45%, rgba(139,92,246,.2), transparent 62%)", filter: "blur(30px)" }} />
      <div className="absolute inset-0 border border-blue-500/20 rounded-3xl pointer-events-none" style={{ zIndex: 20, boxShadow: "0 20px 60px rgba(59,130,246,.10)" }} />

      <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur-md z-30 text-[11px] font-mono text-slate-300">
        <div className="flex items-center gap-2 min-w-0"><span className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" /></span><span className="font-semibold text-cyan-400 tracking-wider">LIVE2D MODEL</span><span className="text-slate-500">•</span><span className="text-slate-400 truncate">{mode === "mouse" ? "👀 ตามเมาส์เรียลไทม์" : mode === "auto" ? "🌀 สุ่มมองอัตโนมัติ" : "🔒 ล็อกทิศทาง"}</span></div>
        <div className="flex gap-1.5 shrink-0">
          <button type="button" onClick={() => setMode(m => m === "mouse" ? "auto" : m === "auto" ? "locked" : "mouse")} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300" title="เปลี่ยนโหมด"><Eye className="w-3 h-3" /></button>
          <button type="button" onClick={() => setShowControls(v => !v)} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300" title="Expressions"><Smile className="w-3.5 h-3.5" /></button>
          <button type="button" onClick={resetPose} className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-slate-300" title="Reset"><RefreshCw className="w-3 h-3" /></button>
        </div>
      </div>

      <canvas ref={canvasRef} id="live2d-canvas" className="relative z-10 w-full h-full block" style={{ minHeight: height, minWidth: width }} />

      {loading && !error && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#070913]/85 backdrop-blur-md rounded-3xl"><div className="relative w-16 h-16 mb-4"><div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" /><div className="w-16 h-16 rounded-full border-2 border-t-blue-500 border-r-indigo-500 border-b-transparent border-l-purple-500 animate-spin" /><Sparkles className="w-6 h-6 text-blue-400 absolute inset-0 m-auto" /></div><span className="text-xs font-mono text-blue-300">INITIALIZING LIVE2D AVATAR...</span></div>}
      {error && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#070913]/95 rounded-3xl p-6 text-center"><Info className="w-10 h-10 text-rose-400 mb-3" /><span className="text-sm text-rose-400 font-semibold">Live2D Initialization</span><span className="text-xs text-slate-400 mt-2">{error}</span></div>}

      {showControls && <div onClick={e => e.stopPropagation()} className="absolute bottom-14 inset-x-3 z-40 bg-slate-950/90 border border-purple-500/30 backdrop-blur-xl rounded-2xl p-3 shadow-2xl"><div className="flex items-center justify-between mb-2"><span className="text-[11px] font-mono text-purple-400 font-semibold">😊 Expressions</span><span className="text-[10px] text-slate-500">เลือกอารมณ์ของ Lily</span></div><div className="grid grid-cols-4 gap-1.5">{EXPRESSIONS.map(([id, name, , emoji]) => <button key={id} type="button" onClick={() => applyExpression(id)} className={`px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 ${expression === id ? "bg-purple-600 text-white scale-105" : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"}`}><span>{emoji}</span><span className="truncate">{name}</span></button>)}</div></div>}

      <div className="absolute bottom-3 inset-x-4 z-30 flex items-center justify-between pointer-events-none text-[10px] font-mono text-slate-400"><span className="bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">🖱️ เลื่อนเมาส์เพื่อให้โมเดลหันหน้า/สบตา</span><span className="hidden sm:inline bg-black/50 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-md">✨ คลิกบนตัวเพื่อโต้ตอบ ({clicks})</span></div>
    </div>
  );
};