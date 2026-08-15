import React, { useCallback, useEffect, useRef, useState } from "react";

const MODEL_RELATIVE_PATH = "live2d/MassageSeacubus_rei.model3.json";

const resolveAssetUrl = (assetPath: string): string => {
  const base = (import.meta as any).env?.BASE_URL || "/";
  const clean = assetPath.replace(/^\.\//, "").replace(/^\//, "");
  return new URL(clean, new URL(base, window.location.href)).href;
};

const isHtml = (bytes: Uint8Array, contentType: string) => {
  const prefix = new TextDecoder().decode(bytes.subarray(0, 128)).trimStart().toLowerCase();
  return contentType.includes("text/html") || prefix.startsWith("<!doctype html") || prefix.startsWith("<html");
};

async function verifyModel(modelUrl: string) {
  const response = await fetch(modelUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Live2D model HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (isHtml(bytes, response.headers.get("content-type") || "")) throw new Error("Live2D model URL returned HTML");
  const model = JSON.parse(new TextDecoder().decode(bytes));
  if (model?.FileReferences?.Moc !== "MassageSeacubus_rei.moc3") throw new Error("Live2D model references an unexpected MOC3");
  if (!Array.isArray(model?.FileReferences?.Textures) || !model.FileReferences.Textures.length) throw new Error("Live2D model has no textures");

  const refs = new Set<string>();
  const add = (v: unknown) => { if (typeof v === "string" && v) refs.add(v); };
  const f = model.FileReferences;
  add(f.Moc); add(f.Physics); add(f.Pose); add(f.DisplayInfo);
  for (const x of f.Textures || []) add(x);
  for (const x of f.Expressions || []) add(x?.File);
  for (const group of Object.values(f.Motions || {})) for (const x of Array.isArray(group) ? group : []) add((x as any)?.File);

  for (const rel of refs) {
    if (rel.startsWith("/") || rel.includes("..")) throw new Error(`Unsafe Live2D reference: ${rel}`);
    const url = new URL(rel, modelUrl).href;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`Live2D asset HTTP ${r.status}: ${rel}`);
    const b = new Uint8Array(await r.arrayBuffer());
    const type = (r.headers.get("content-type") || "").toLowerCase();
    if (isHtml(b, type)) throw new Error(`Live2D asset returned HTML: ${rel}`);
    if (/\.moc3$/i.test(rel)) {
      if (b.length < 64 || new TextDecoder().decode(b.subarray(0, 4)) !== "MOC3") throw new Error("MOC3 binary is invalid");
      console.info(`[Live2D] MOC3 loaded: ${b.byteLength} bytes`);
    }
    if (/\.png$/i.test(rel)) {
      const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      if (!type.includes("image/png") || sig.some((v, i) => b[i] !== v)) throw new Error(`PNG validation failed: ${rel}`);
    }
  }
  return model;
}

interface Live2DAvatarProps {
  className?: string;
  onLoaded?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;
}

export const Live2DAvatar: React.FC<Live2DAvatarProps> = ({ className = "", onLoaded, width = 380, height = 420, interactive = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<any>(null);
  const appRef = useRef<any>(null);
  const target = useRef({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const moveTarget = useCallback((x: number, y: number) => {
    if (!interactive || !containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    target.current.x = Math.max(-1, Math.min(1, (x - (r.left + r.width / 2)) / Math.max(r.width, 500)));
    target.current.y = Math.max(-1, Math.min(1, (y - (r.top + r.height * 0.4)) / Math.max(r.height, 500)));
  }, [interactive]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const init = async () => {
      try {
        setLoading(true); setError(null);
        const PIXI: any = await import("pixi.js");
        // The Live2D package uses PIXI's global ticker when one is not passed explicitly.
        // Expose the same Pixi module instance and disable worker-based image probing, which
        // otherwise tries to fetch a data: URL under GitHub Pages CSP.
        (window as any).PIXI = PIXI;
        if (PIXI.Assets?.setPreferences) {
          try { PIXI.Assets.setPreferences({ preferWorkers: false }); } catch {}
        }
        if (!(window as any).Live2DCubismCore) {
          let script = document.querySelector('script[src*="live2dcubismcore"]') as HTMLScriptElement | null;
          if (!script) {
            script = document.createElement("script");
            script.src = resolveAssetUrl("live2dcubismcore.min.js");
            script.async = false;
            document.head.appendChild(script);
          }
          for (let i = 0; i < 160 && !(window as any).Live2DCubismCore; i++) await new Promise(r => setTimeout(r, 50));
        }
        if (!(window as any).Live2DCubismCore) throw new Error("Cubism Core 5 failed to load");
        if (cancelled || !canvasRef.current || !containerRef.current) return;

        const { Live2DModel } = await import("@naari3/pixi-live2d-display");
        const modelUrl = resolveAssetUrl(MODEL_RELATIVE_PATH);
        await verifyModel(modelUrl);

        const rect = containerRef.current.getBoundingClientRect();
        const app = new PIXI.Application();
        await app.init({
          canvas: canvasRef.current,
          width: rect.width || width,
          height: rect.height || height,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          backgroundAlpha: 0,
          autoDensity: true,
        });
        appRef.current = app;

        const model = await Live2DModel.from(modelUrl, {
          autoHitTest: false,
          autoFocus: false,
          ticker: app.ticker,
        });
        if (cancelled) { model.destroy(); app.destroy(true); return; }
        modelRef.current = model;

        const w = rect.width || width;
        const h = rect.height || height;
        const scale = Math.min(w / model.width, h / model.height) * 3.3;
        model.scale.set(scale);
        model.anchor.set(0.5, 0.22);
        model.position.set(w / 2, h * 0.48);
        app.stage.addChild(model);

        const tick = () => {
          if (cancelled || !modelRef.current) return;
          const core = modelRef.current.internalModel?.coreModel;
          if (core) {
            const x = target.current.x;
            const y = target.current.y;
            core.setParameterValueById("ParamAngleX", x * 28);
            core.setParameterValueById("ParamAngleY", -y * 24);
            core.setParameterValueById("ParamAngleZ", x * y * -15);
            core.setParameterValueById("ParamEyeBallX", x);
            core.setParameterValueById("ParamEyeBallY", -y);
            core.setParameterValueById("ParamBodyAngleZ", x * 8);
            const now = performance.now();
            core.setParameterValueById("ParamBreath", (Math.sin(now * 0.002) + 1) * 0.5);
            core.setParameterValueById("ParamBreath2", (Math.cos(now * 0.0025) + 1) * 0.5);
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        setLoading(false);
        onLoaded?.();
      } catch (e: any) {
        console.error("Live2D initialization error:", e);
        setError(e?.message || "Failed to load Live2D model");
        setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try { modelRef.current?.destroy?.({ children: true }); } catch {}
      modelRef.current = null;
      try { appRef.current?.destroy?.(true); } catch {}
      appRef.current = null;
    };
  }, [width, height, onLoaded, interactive]);

  useEffect(() => {
    const move = (e: MouseEvent) => moveTarget(e.clientX, e.clientY);
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, [moveTarget]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {loading && !error && <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70">Loading Live2D…</div>}
      {error && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-sm opacity-80"><span>Live2D Initialization</span><span>{error}</span><button type="button" onClick={() => window.location.reload()} className="rounded px-3 py-1 border">ลองใหม่อีกครั้ง</button></div>}
    </div>
  );
};
