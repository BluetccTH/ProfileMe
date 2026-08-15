import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { 
  Sparkles, 
  RotateCcw, 
  Play, 
  Pause, 
  Globe, 
  Orbit, 
  HelpCircle, 
  Fingerprint, 
  Atom, 
  Settings2,
  Trash2,
  Zap
} from "lucide-react";

interface Celestial {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  type: "star" | "blackhole" | "planet";
  glow: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  history: { x: number; y: number }[];
}

type ClickMode = "planet" | "blackhole" | "stardust" | "push";
type PaletteType = "cyan" | "purple" | "orange" | "rainbow";

export function StellarSandbox() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [clickMode, setClickMode] = useState<ClickMode>("planet");
  const [palette, setPalette] = useState<PaletteType>("cyan");
  const [gravity, setGravity] = useState<number>(1.2);
  const [speed, setSpeed] = useState<number>(1.0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [particleCount, setParticleCount] = useState<number>(0);
  const [celestialCount, setCelestialCount] = useState<number>(0);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [hudMessage, setHudMessage] = useState<string>("SYSTEM_READY // INJECT STARS OR PLANETS");

  // Physics states via refs to avoid re-render stutter in requestAnimationFrame
  const celestialsRef = useRef<Celestial[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const isPlayingRef = useRef<boolean>(true);
  const gravityRef = useRef<number>(1.2);
  const speedRef = useRef<number>(1.0);
  const paletteRef = useRef<PaletteType>("cyan");
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update physics refs when state changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    paletteRef.current = palette;
  }, [palette]);

  // Palette color definitions
  const getPaletteColors = (type: PaletteType) => {
    switch (type) {
      case "cyan":
        return {
          particle: ["#22d3ee", "#06b6d4", "#0891b2", "#3b82f6"],
          star: "#06b6d4",
          blackhole: "#000000",
          glow: "rgba(34, 211, 238, 0.6)",
        };
      case "purple":
        return {
          particle: ["#c084fc", "#a855f7", "#8b5cf6", "#ec4899"],
          star: "#a855f7",
          blackhole: "#000000",
          glow: "rgba(168, 85, 247, 0.6)",
        };
      case "orange":
        return {
          particle: ["#fb923c", "#f97316", "#ea580c", "#facc15"],
          star: "#f97316",
          blackhole: "#000000",
          glow: "rgba(249, 115, 22, 0.6)",
        };
      case "rainbow":
        return {
          particle: ["#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb7185", "#fb923c", "#34d399", "#22d3ee"],
          star: "#38bdf8",
          blackhole: "#000000",
          glow: "rgba(255, 255, 255, 0.6)",
        };
    }
  };

  // Preset generators
  const loadPreset = (presetName: "spiral" | "binary" | "collision") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Reset current lists
    celestialsRef.current = [];
    particlesRef.current = [];

    if (presetName === "spiral") {
      setHudMessage("INITIALIZING PRESET: GALAXY_SPIRAL");
      // Add a central supermassive star
      celestialsRef.current.push({
        id: "core-star",
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        mass: 1800,
        radius: 20,
        color: paletteRef.current === "cyan" ? "#06b6d4" : paletteRef.current === "purple" ? "#a855f7" : "#f97316",
        type: "star",
        glow: getPaletteColors(paletteRef.current).glow,
      });

      // Spawn spiral particles orbiting center
      const numParticles = 240;
      const numArms = 3;
      const colors = getPaletteColors(paletteRef.current).particle;

      for (let i = 0; i < numParticles; i++) {
        const angleOffset = (i % numArms) * ((Math.PI * 2) / numArms);
        const ratio = i / numParticles;
        const r = 45 + ratio * (Math.min(cx, cy) - 60);
        const angle = ratio * Math.PI * 4.5 + angleOffset;

        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        // Circular orbit velocity: v = sqrt(G * M / r)
        const v = Math.sqrt((gravityRef.current * 1800) / r);
        const vx = -Math.sin(angle) * v + (Math.random() - 0.5) * 0.15;
        const vy = Math.cos(angle) * v + (Math.random() - 0.5) * 0.15;

        particlesRef.current.push({
          x,
          y,
          vx,
          vy,
          color: colors[i % colors.length],
          size: 1 + Math.random() * 2,
          alpha: 0.6 + Math.random() * 0.4,
          life: 0,
          maxLife: 200 + Math.random() * 300,
          history: [],
        });
      }
    } else if (presetName === "binary") {
      setHudMessage("INITIALIZING PRESET: BINARY_DANCE");
      // Binary star system orbiting their barycenter
      const separation = 95;
      const starMass = 1000;
      // Circular orbit speed for each star: v = sqrt(G * M / (4 * r))
      const orbSpeed = Math.sqrt((gravityRef.current * starMass) / (2 * separation));

      celestialsRef.current.push({
        id: "star-1",
        x: cx - separation,
        y: cy,
        vx: 0,
        vy: -orbSpeed,
        mass: starMass,
        radius: 14,
        color: paletteRef.current === "cyan" ? "#22d3ee" : "#c084fc",
        type: "star",
        glow: "rgba(56, 189, 248, 0.5)",
      });

      celestialsRef.current.push({
        id: "star-2",
        x: cx + separation,
        y: cy,
        vx: 0,
        vy: orbSpeed,
        mass: starMass,
        radius: 14,
        color: paletteRef.current === "cyan" ? "#3b82f6" : "#ec4899",
        type: "star",
        glow: "rgba(168, 85, 247, 0.5)",
      });

      // Spawn a cloud of dust around the system
      const colors = getPaletteColors(paletteRef.current).particle;
      for (let i = 0; i < 180; i++) {
        const r = 130 + Math.random() * 100;
        const angle = Math.random() * Math.PI * 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;

        // Approximate circular velocity around total system mass (2 * M)
        const v = Math.sqrt((gravityRef.current * starMass * 2) / r);
        const vx = -Math.sin(angle) * v + (Math.random() - 0.5) * 0.2;
        const vy = Math.cos(angle) * v + (Math.random() - 0.5) * 0.2;

        particlesRef.current.push({
          x,
          y,
          vx,
          vy,
          color: colors[i % colors.length],
          size: 1 + Math.random() * 1.5,
          alpha: 0.5 + Math.random() * 0.5,
          life: 0,
          maxLife: 200 + Math.random() * 300,
          history: [],
        });
      }
    } else if (presetName === "collision") {
      setHudMessage("INITIALIZING PRESET: SUPERNOVA_COLLISION");
      // Two massive black holes hurtling towards each other
      celestialsRef.current.push({
        id: "bh-1",
        x: cx - 180,
        y: cy - 30,
        vx: 1.8,
        vy: 0.2,
        mass: 1400,
        radius: 12,
        color: "#000000",
        type: "blackhole",
        glow: "rgba(139, 92, 246, 0.7)",
      });

      celestialsRef.current.push({
        id: "bh-2",
        x: cx + 180,
        y: cy + 30,
        vx: -1.8,
        vy: -0.2,
        mass: 1400,
        radius: 12,
        color: "#000000",
        type: "blackhole",
        glow: "rgba(236, 72, 153, 0.7)",
      });

      // Clusters of orbiting dust for each black hole
      const colors = getPaletteColors(paletteRef.current).particle;
      for (let i = 0; i < 200; i++) {
        const isLeftCluster = i % 2 === 0;
        const centerX = isLeftCluster ? cx - 180 : cx + 180;
        const centerY = isLeftCluster ? cy - 30 : cy + 30;
        const parentVx = isLeftCluster ? 1.8 : -1.8;
        const parentVy = isLeftCluster ? 0.2 : -0.2;

        const r = 25 + Math.random() * 50;
        const angle = Math.random() * Math.PI * 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        const v = Math.sqrt((gravityRef.current * 1400) / r);
        const vx = parentVx + (-Math.sin(angle) * v);
        const vy = parentVy + (Math.cos(angle) * v);

        particlesRef.current.push({
          x,
          y,
          vx,
          vy,
          color: colors[i % colors.length],
          size: 1 + Math.random() * 1.8,
          alpha: 0.5 + Math.random() * 0.5,
          life: 0,
          maxLife: 300,
          history: [],
        });
      }
    }
  };

  // Canvas Resize and Particle loop handling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fluid container size observer
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const width = containerRef.current.clientWidth;
        const height = 460; // Perfect standard responsive block height
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    handleResize();

    // Load dynamic initial setup
    loadPreset("spiral");

    let animationId: number;

    // Simulation & render Loop
    const tick = () => {
      // Clear with elegant trails
      ctx.fillStyle = "rgba(7, 11, 19, 0.28)"; // Soft persistent void fill
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const celestials = celestialsRef.current;
      const particles = particlesRef.current;
      const gConstant = gravityRef.current * 0.15; // Scaled gravity factor
      const simSpeed = speedRef.current;

      setParticleCount(particles.length);
      setCelestialCount(celestials.length);

      if (isPlayingRef.current) {
        // 1. Calculate celestial-to-celestial interactions (N-body orbit for main stars)
        for (let i = 0; i < celestials.length; i++) {
          const bodyA = celestials[i];
          for (let j = i + 1; j < celestials.length; j++) {
            const bodyB = celestials[j];

            const dx = bodyB.x - bodyA.x;
            const dy = bodyB.y - bodyA.y;
            const distSq = dx * dx + dy * dy + 400; // soft factor
            const dist = Math.sqrt(distSq);

            // Gravitational force: F = G * m1 * m2 / r^2
            const force = (gConstant * bodyA.mass * bodyB.mass) / distSq;
            const accA = force / bodyA.mass;
            const accB = force / bodyB.mass;

            // Direct acceleration vectors
            bodyA.vx += (dx / dist) * accA * simSpeed;
            bodyA.vy += (dy / dist) * accA * simSpeed;
            bodyB.vx -= (dx / dist) * accB * simSpeed;
            bodyB.vy -= (dy / dist) * accB * simSpeed;
          }
        }

        // 2. Update Celestial Positions
        celestials.forEach((body) => {
          body.x += body.vx * simSpeed;
          body.y += body.vy * simSpeed;

          // Bounce off canvas bounds nicely to keep interaction screen safe
          const padding = 10;
          if (body.x < padding || body.x > canvas.width - padding) {
            body.vx *= -0.7;
            body.x = body.x < padding ? padding : canvas.width - padding;
          }
          if (body.y < padding || body.y > canvas.height - padding) {
            body.vy *= -0.7;
            body.y = body.y < padding ? padding : canvas.height - padding;
          }
        });

        // 3. Update Dust Particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          // Accumulate gravity pull from all massive stars
          let ax = 0;
          let ay = 0;

          celestials.forEach((body) => {
            const dx = body.x - p.x;
            const dy = body.y - p.y;
            const distSq = dx * dx + dy * dy + 180; // Stable orbit spacing factor
            const dist = Math.sqrt(distSq);

            // Acceleration: a = G * M / r^2
            const accel = (gConstant * body.mass) / distSq;
            ax += (dx / dist) * accel;
            ay += (dy / dist) * accel;

            // Celestial collision eating check
            if (dist < body.radius + p.size) {
              if (body.type === "blackhole") {
                // Sucked in! Create minor particle flash or just swallow
                body.mass += 1.5; // Gain mass slightly
                particles.splice(i, 1);
                return;
              } else if (body.type === "star" && Math.random() < 0.15) {
                // Absorbed by star
                particles.splice(i, 1);
                return;
              }
            }
          });

          p.vx += ax * simSpeed;
          p.vy += ay * simSpeed;

          // Add friction to make orbit decays interesting
          p.vx *= 0.998;
          p.vy *= 0.998;

          p.x += p.vx * simSpeed;
          p.y += p.vy * simSpeed;

          p.life += simSpeed;

          // Build history for beautiful stellar trails
          p.history.push({ x: p.x, y: p.y });
          if (p.history.length > 5) p.history.shift();

          // Out of bounds or dead check
          const offscreen = p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100;
          if (offscreen || p.life > p.maxLife) {
            particles.splice(i, 1);
          }
        }
      }

      // Draw Trails
      particles.forEach((p) => {
        if (p.history.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.globalAlpha = p.alpha * 0.35;
        ctx.stroke();
      });

      // Draw Particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });

      ctx.globalAlpha = 1.0; // Reset transparency

      // Draw Celestials with beautiful radial glows
      celestials.forEach((body) => {
        // Draw fuzzy atmosphere aura
        const radGlow = ctx.createRadialGradient(
          body.x, body.y, body.radius * 0.3,
          body.x, body.y, body.radius * 2.8
        );
        
        if (body.type === "blackhole") {
          radGlow.addColorStop(0, "rgba(0,0,0,1)");
          radGlow.addColorStop(0.2, "rgba(15,23,42,0.9)");
          radGlow.addColorStop(0.5, body.glow);
          radGlow.addColorStop(1, "rgba(0,0,0,0)");
          
          // Draw accretion disk aura
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = radGlow;
          ctx.fill();

          // Draw singularity core
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#000000";
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fill();
        } else {
          // Regular star glow
          radGlow.addColorStop(0, body.color);
          radGlow.addColorStop(0.3, body.color + "bf"); // 75% alpha
          radGlow.addColorStop(0.6, body.glow);
          radGlow.addColorStop(1, "rgba(0,0,0,0)");

          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = radGlow;
          ctx.fill();

          // Core sun
          ctx.beginPath();
          ctx.arc(body.x, body.y, body.radius, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }

        // Draw gravity ring lines
        ctx.beginPath();
        ctx.arc(body.x, body.y, body.radius * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Handle continuous dragging for "stardust" emitter
      if (isDraggingRef.current && clickMode === "stardust") {
        const mouse = lastMousePosRef.current;
        const colors = getPaletteColors(paletteRef.current).particle;
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push({
            x: mouse.x + (Math.random() - 0.5) * 8,
            y: mouse.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 1 + Math.random() * 2,
            alpha: 0.8 + Math.random() * 0.2,
            life: 0,
            maxLife: 150 + Math.random() * 100,
            history: [],
          });
        }
      }

      animationId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [clickMode]);

  // Click / touch canvas interactions
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    lastMousePosRef.current = { x, y };

    const colors = getPaletteColors(palette);

    if (clickMode === "planet") {
      setHudMessage("SPAWNED PLANET SYSTEM ORBIT");
      // Find nearest massive celestial to orbit around
      let nearest: Celestial | null = null;
      let minDist = Infinity;
      celestialsRef.current.forEach((c) => {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < minDist) {
          minDist = d;
          nearest = c;
        }
      });

      // Spawn a planet with orbital tangential velocity
      let vx = 0;
      let vy = 0;
      if (nearest) {
        const n: Celestial = nearest;
        const dx = x - n.x;
        const dy = y - n.y;
        const r = Math.max(minDist, 40);

        // Orbit speed v = sqrt(G*M/r)
        const v = Math.sqrt((gravity * n.mass * 0.15) / r);
        // Tangential vector
        vx = (-dy / r) * v + n.vx;
        vy = (dx / r) * v + n.vy;
      } else {
        vx = (Math.random() - 0.5) * 2;
        vy = (Math.random() - 0.5) * 2;
      }

      // Add orbiting celestial (Planet)
      celestialsRef.current.push({
        id: `celestial-${Date.now()}`,
        x,
        y,
        vx,
        vy,
        mass: 140,
        radius: 7,
        color: colors.particle[0],
        type: "planet",
        glow: colors.glow,
      });
    } else if (clickMode === "blackhole") {
      setHudMessage("SINGULARITY TRIGGERED // GRAVITY INTENSIFYING");
      // Add heavy singularity
      celestialsRef.current.push({
        id: `singularity-${Date.now()}`,
        x,
        y,
        vx: 0,
        vy: 0,
        mass: 1600,
        radius: 11,
        color: "#000000",
        type: "blackhole",
        glow: "rgba(168, 85, 247, 0.7)",
      });
    } else if (clickMode === "push") {
      setHudMessage("EXPULSION DETONATED // DUST BLAST");
      // Detonate and push particles away
      const blastRadius = 140;
      particlesRef.current.forEach((p) => {
        const dx = p.x - x;
        const dy = p.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < blastRadius) {
          const force = (blastRadius - dist) * 0.08;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });

      // Spawn concentric burst rings
      for (let i = 0; i < 45; i++) {
        const angle = (i / 45) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        particlesRef.current.push({
          x: x + Math.cos(angle) * 10,
          y: y + Math.sin(angle) * 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors.particle[i % colors.particle.length],
          size: 1.5 + Math.random() * 1.5,
          alpha: 1.0,
          life: 0,
          maxLife: 80 + Math.random() * 60,
          history: [],
        });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    handleCanvasInteraction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    lastMousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    if (e.touches.length > 0) {
      handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    lastMousePosRef.current = {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  };

  const clearCanvas = () => {
    celestialsRef.current = [];
    particlesRef.current = [];
    setHudMessage("COSMIC CLEAR COMPLETED // THE VOID REMAINS");
  };

  return (
    <div className="w-full relative z-20 mb-16" ref={containerRef}>
      
      {/* Decorative Outer Border */}
      <div className="bg-[#0b1329]/65 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-300 relative group">
        
        {/* Subtle Top glow ridge */}
        <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        
        {/* Header HUD Bar */}
        <div className="border-b border-white/10 px-6 py-4 flex flex-col sm:flex-row justify-between items-center bg-[#070c1b]/80 gap-4">
          
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-widest text-white uppercase flex items-center gap-2">
                <Atom className="w-4 h-4 text-cyan-400 animate-spin" />
                Stellar Sandbox • ห้องจำลองดวงดาว
              </h3>
              <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mt-0.5">
                ACTIVE_TELEMETRY: {hudMessage}
              </p>
            </div>
          </div>

          {/* Quick Stats telemetry widgets */}
          <div className="flex items-center gap-4 font-mono text-[10px] tracking-wider text-slate-300">
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1.5">
              <span className="text-cyan-400">STARDUST:</span>
              <span>{particleCount}</span>
            </div>
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center gap-1.5">
              <span className="text-purple-400">GRAV_NODES:</span>
              <span>{celestialCount}</span>
            </div>
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="How to Play"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sandbox Instruction Modal */}
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-cyan-500/10 border-b border-white/10 text-xs text-cyan-200 leading-relaxed font-mono"
          >
            <p className="font-bold mb-2 text-white">🌌 วิธีเล่นจำลองดวงดาว (Stellar Sandbox Guide):</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>เลือกเครื่องมือด้านล่าง เช่น <strong className="text-white">Planet (สร้างดาวเคราะห์)</strong>, <strong className="text-white">Black Hole (หลุมดำ)</strong> หรือ <strong className="text-white">Stardust (ละอองดาว)</strong></li>
              <li>คลิกหรือสัมผัสบนแผนที่อวกาศเพื่อวางวัตถุดวงดาว ดาวจะเริ่มโคจรรอบศูนย์ถ่วงมวลที่ใหญ่ที่สุดโดยอัตโนมัติ</li>
              <li>ปรับแต่งความแรงของ <strong className="text-white">แรงโน้มถ่วง (Gravity)</strong> และ <strong className="text-white">ความเร็ว (Simulation Speed)</strong> เพื่อเร่งปฏิกิริยาฟิสิกส์</li>
              <li>คลิกปุ่ม <strong className="text-white">Clear</strong> เพื่อทำลายดวงดาวทั้งหมดและเริ่มต้นใหม่ในความมืดมิด</li>
            </ul>
          </motion.div>
        )}

        {/* The Interactive Canvas Board */}
        <div className="relative bg-[#070b13] cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            className="block w-full h-[460px] relative z-10 transition-opacity"
          />

          {/* Holographic Watermark Grid details */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-[180px] h-[180px] border border-cyan-500/10 rounded-full animate-ping opacity-25" style={{ animationDuration: "8s" }} />
            <div className="w-[360px] h-[360px] border border-blue-500/5 rounded-full animate-ping opacity-10" style={{ animationDuration: "14s" }} />
          </div>

          <div className="absolute bottom-4 right-4 pointer-events-none z-20 font-mono text-[9px] text-slate-500 flex items-center gap-1 uppercase tracking-widest">
            <Fingerprint className="w-3 h-3 text-cyan-500/40" />
            touch_enabled // physical_engine_v1.0
          </div>
        </div>

        {/* Bottom Interactive Controls */}
        <div className="bg-[#070c1b]/95 border-t border-white/10 p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-20">
          
          {/* Mode Selector Buttons */}
          <div className="lg:col-span-4 flex flex-col gap-2">
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase mb-1">
              🔧 CLICK_INTERACTION / โหมดจิ้มอวกาศ
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setClickMode("planet");
                  setHudMessage("INTERACTION_MODE // CREATE PLANETS");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clickMode === "planet"
                    ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Orbit className="w-3.5 h-3.5" />
                <span>🪐 Planet</span>
              </button>

              <button
                onClick={() => {
                  setClickMode("blackhole");
                  setHudMessage("INTERACTION_MODE // INJECT BLACK HOLE");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clickMode === "blackhole"
                    ? "bg-purple-500/10 border-purple-500 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Atom className="w-3.5 h-3.5" />
                <span>🕳️ Black Hole</span>
              </button>

              <button
                onClick={() => {
                  setClickMode("stardust");
                  setHudMessage("INTERACTION_MODE // PAINT STARDUST TRAILS");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clickMode === "stardust"
                    ? "bg-pink-500/10 border-pink-500 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.2)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>✨ Stardust</span>
              </button>

              <button
                onClick={() => {
                  setClickMode("push");
                  setHudMessage("INTERACTION_MODE // FORCE BLASTWAVE");
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clickMode === "push"
                    ? "bg-orange-500/10 border-orange-500 text-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.2)]"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>💥 Push Force</span>
              </button>
            </div>
          </div>

          {/* Sliders Panels */}
          <div className="lg:col-span-5 flex flex-col gap-3.5">
            <div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 tracking-wider mb-1.5">
                <span>🌌 G-FORCE (GRAVITY) : {gravity.toFixed(1)}G</span>
                <span className="text-cyan-400">COSMIC_CONST</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.5"
                step="0.1"
                value={gravity}
                onChange={(e) => setGravity(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 tracking-wider mb-1.5">
                <span>⏳ SIMULATION SPEED : {speed.toFixed(1)}x</span>
                <span className="text-purple-400">WARP_DRIVE</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-white/10 h-1 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Palette & Presets Utilities */}
          <div className="lg:col-span-3 flex flex-col justify-between gap-4">
            
            {/* Color spectrums */}
            <div>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase block mb-1.5">
                🎨 COLOR PALETTE / แสงดวงดาว
              </span>
              <div className="flex items-center gap-2">
                {(["cyan", "purple", "orange", "rainbow"] as PaletteType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPalette(p);
                      setHudMessage(`RECONFIGURED STARDUST SPECTRUM: ${p.toUpperCase()}`);
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 cursor-pointer ${
                      palette === p ? "border-white scale-105" : "border-transparent"
                    }`}
                    style={{
                      background: p === "cyan" 
                        ? "linear-gradient(135deg, #22d3ee, #0891b2)" 
                        : p === "purple"
                        ? "linear-gradient(135deg, #c084fc, #8b5cf6)"
                        : p === "orange"
                        ? "linear-gradient(135deg, #fb923c, #ea580c)"
                        : "linear-gradient(135deg, #38bdf8, #ec4899, #ea580c)"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Trigger System utilities */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-xs font-bold text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                title={isPlaying ? "Pause Simulation" : "Resume Simulation"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 text-slate-300" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{isPlaying ? "Pause" : "Resume"}</span>
              </button>

              <button
                onClick={clearCanvas}
                className="py-2 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset Cosmic Void"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

        </div>

        {/* Global Preset Load Fast-Bar */}
        <div className="bg-[#040812] px-6 py-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-3.5">
          <span className="font-mono text-[9px] tracking-widest text-slate-500 uppercase flex items-center gap-1">
            <Settings2 className="w-3 h-3 text-cyan-500" /> PRESET_CONFIGS:
          </span>
          <button
            onClick={() => loadPreset("spiral")}
            className="px-3.5 py-1 rounded-full bg-white/[0.03] hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-[10px] font-semibold text-slate-300 hover:text-cyan-400 transition-all font-mono uppercase"
          >
            🌀 Galaxy Spiral
          </button>
          <button
            onClick={() => loadPreset("binary")}
            className="px-3.5 py-1 rounded-full bg-white/[0.03] hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 text-[10px] font-semibold text-slate-300 hover:text-purple-400 transition-all font-mono uppercase"
          >
            ♊ Binary Dance
          </button>
          <button
            onClick={() => loadPreset("collision")}
            className="px-3.5 py-1 rounded-full bg-white/[0.03] hover:bg-orange-500/10 border border-white/10 hover:border-orange-500/30 text-[10px] font-semibold text-slate-300 hover:text-orange-400 transition-all font-mono uppercase"
          >
            💥 Supernova Collide
          </button>
        </div>

      </div>

    </div>
  );
}
