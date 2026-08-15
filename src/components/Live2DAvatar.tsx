import React, { useCallback, useEffect, useRef, useState } from "react";
import { Eye, RefreshCw, Smile, Sparkles, Info } from "lucide-react";

const resolveAssetUrl = (assetPath: string): string => {
  if (!assetPath) return "";
  if (/^(https?:|data:|blob:)/.test(assetPath)) return assetPath;
  const base = ((import.meta as any).env?.BASE_URL || "/").replace(/\/?$/, "/");
  const clean = assetPath.replace(/^\.\//, "").replace(/^\//, "");
  return new URL(clean, new URL(base, window.location.origin + "/")).href;
};

interface Live2DAvatarProps { className?: string; onLoaded?: () => void; width?: number; height?: number; interactive?: boolean; }

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({ className = "", onLoaded, width = 380, height = 420, interactive = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<any>(null);
  const targetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const destroyedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<"mouse" | "auto" | "locked">("mouse");
  const [showControls, setShowControls] = useState(false);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    destroyedRef.current = false;
    let app: any = null;
    let raf = 0;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        const PIXI = await import("pixi.js");

        if (!(window as any).Live2DCubismCore) {
          let script = document.querySelector('script[data-live2d-core="true"]') as HTMLScriptElement | null;
          if (!script) {
            script = document.createElement("script");
            script.dataset.live2dCore = "true";
            script.src = resolveAssetUrl("live2dcubismcore.min.js");
            script.async = false;
            document.head.appendChild(script);
          }
          for (let i = 0; i < 100 && !(window as any).Live2DCubismCore; i++) await new Promise(r => setTimeout(r, 100));
        }
        if (!(window as any).Live2DCubismCore) throw new Error("Live2DCubismCore not found.");

        (window as any).PIXI = PIXI;
        const { Live2DModel } = await import("pixi-live2d-display/cubism4");
        Live2DModel.registerTicker(PIXI.Ticker);
        try { (PIXI.Ticker.shared as any).maxFPS = 0; (PIXI.Ticker.shared as any).minFPS = 0; } catch {}

        if (!canvasRef.current || !containerRef.current || destroyedRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width || width;
        const h = rect.height || height;
        app = new PIXI.Application({ view: canvasRef.current, width: w, height: h, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1 });

        // GitHub Pages project URL: /ProfileMe/. Resolve the model against the
        // actual deployed page base, never against the site root.
        const modelUrl = new URL("live2d/MassageSeacubus_rei.model3.json", window.location.href).href;
        console.log("[Live2D] model URL:", modelUrl);
        const model = await Live2DModel.from(modelUrl, { autoInteract: false, autoUpdate: true });

        if (destroyedRef.current) { model.destroy(); app.destroy(true); return; }
        modelRef.current = model;
        const scale = Math.min(w / model.width, h / model.height) * 3.3;
        model.scale.set(scale);
        model.anchor.set(0.5, 0.22);
        model.position.set(w / 2, h * 0.48);
        app.stage.addChild(model);

        const tick = () => {
          if (destroyedRef.current || !modelRef.current) return;
          const core = modelRef.current.internalModel?.coreModel;
          if (core) {
            const t = targetRef.current;
            t.x += (t.tx - t.x) * 0.12;
            t.y += (t.ty - t.y) * 0.12;
            core.setParameterValueById("ParamAngleX", t.x * 30);
            core.setParameterValueById("ParamAngleY", -t.y * 25);
            core.setParameterValueById("ParamAngleZ", t.x * t.y * -15);
            core.setParameterValueById("ParamEyeBallX", t.x);
            core.setParameterValueById("ParamEyeBallY", -t.y);
            core.setParameterValueById("ParamBodyAngleZ", t.x * 8);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        setLoading(false);
        onLoaded?.();
      } catch (e: any) {
        console.error("[Live2D] load failed:", e);
        setError(e?.message || "Failed to load Live2D model");
        setLoading(false);
      }
    };
    init();
    return () => {
      destroyedRef.current = true;
      cancelAnimationFrame(raf);
      try { modelRef.current?.destroy({ children: true }); } catch {}
      try { app?.destroy(true, { children: true, texture: true }); } catch {}
      modelRef.current = null;
    };
  }, [width, height, onLoaded]);

  const handleMouse = useCallback((x: number, y: number) => {
    if (tracking !== "mouse" || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    targetRef.current.tx = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / Math.max(window.innerWidth * .45, r.width * 1.5)));
    targetRef.current.ty = Math.max(-1, Math.min(1, (y - (r.top + r.height * .4)) / Math.max(window.innerHeight * .45, r.height * 1.5)));
  }, [tracking]);

  useEffect(() => {
    const fn = (e: MouseEvent) => handleMouse(e.clientX, e.clientY);
    window.addEventListener("mousemove", fn, { passive: true });
    return () => window.removeEventListener("mousemove", fn);
  }, [handleMouse]);

  useEffect(() => {
    if (tracking !== "auto") return;
    const id = window.setInterval(() => { targetRef.current.tx = (Math.random() - .5) * 1.2; targetRef.current.ty = (Math.random() - .5) * .8; }, 2400);
    return () => window.clearInterval(id);
  }, [tracking]);

  return <div ref={containerRef} className={`relative overflow-hidden rounded-3xl flex flex-col items-center justify-center ${className}`} onClick={() => setClicks(v => v + 1)}>
    <div className="absolute inset-0 bg-gradient-to-b from-[#0b0f19]/80 via-[#0d1224]/70 to-[#070913]/90 border border-blue-500/20 rounded-3xl" />
    <div className="absolute top-3 inset-x-3 flex items-center justify-between px-3 py-1.5 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur-md z-20 text-[11px] text-slate-300"><span className="font-semibold text-cyan-400">LIVE2D • 海魔完整版</span><div className="flex gap-1.5"><button type="button" onClick={e => { e.stopPropagation(); setTracking(v => v === "mouse" ? "auto" : v === "auto" ? "locked" : "mouse"); }} className="p-1.5 rounded-md bg-white/5"><Eye className="w-3 h-3" /></button><button type="button" onClick={e => { e.stopPropagation(); setShowControls(v => !v); }} className="p-1.5 rounded-md bg-white/5"><Smile className="w-3 h-3" /></button><button type="button" onClick={e => { e.stopPropagation(); targetRef.current.tx = 0; targetRef.current.ty = 0; }} className="p-1.5 rounded-md bg-white/5"><RefreshCw className="w-3 h-3" /></button></div></div>
    {loading && <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070913]/90 rounded-3xl"><Sparkles className="w-8 h-8 text-blue-400 animate-pulse mb-3" /><span className="text-xs text-blue-300">กำลังโหลด Live2D...</span></div>}
    {error && <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#070913]/95 rounded-3xl p-6 text-center"><Info className="w-8 h-8 text-rose-400 mb-2" /><span className="text-xs text-rose-300">{error}</span></div>}
    <canvas ref={canvasRef} id="live2d-canvas" className="w-full h-full object-contain z-10" style={{ minHeight: height, minWidth: width }} />
    {showControls && <div onClick={e => e.stopPropagation()} className="absolute bottom-12 inset-x-3 z-30 rounded-2xl bg-slate-950/90 border border-purple-500/30 p-3 text-xs text-slate-300">🖱️ {tracking === "mouse" ? "ตามเมาส์" : tracking === "auto" ? "มองอัตโนมัติ" : "ล็อกทิศทาง"}<div className="mt-1 text-slate-500">Texture native • FPS ไม่ล็อก • โมเดลเดิม</div></div>}
    <div className="absolute bottom-3 inset-x-4 z-20 flex justify-between text-[10px] text-slate-400 pointer-events-none"><span>🖱️ เลื่อนเมาส์เพื่อให้โมเดลหันหน้า/สบตา</span><span>{interactive ? `✨ คลิก (${clicks})` : ""}</span></div>
  </div>;
};
