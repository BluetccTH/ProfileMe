import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Globe, 
  Layers, 
  Zap, 
  Settings, 
  Gamepad2, 
  Bot,
  Sparkles,
  Info,
  Compass,
  LayoutGrid
} from "lucide-react";

interface SkillNode {
  id: string;
  name: string;
  percentage: number;
  icon: string;
  color: string;
  glowColor: string;
  x: number; // percentage coordinate on map (0-100)
  y: number; // percentage coordinate on map (0-100)
  type: "frontend" | "backend" | "systems" | "automation";
  description: string;
  connections: string[]; // IDs of connected skill stars
}

const SKILL_NODES: SkillNode[] = [
  {
    id: "html5",
    name: "HTML5",
    percentage: 96,
    icon: "globe",
    color: "from-orange-500 to-red-500",
    glowColor: "rgba(249, 115, 22, 0.4)",
    x: 22,
    y: 50,
    type: "frontend",
    description: "ทักษะพื้นฐานในการขึ้นโครงสร้างเว็บไซต์ระดับสูง เขียนโครงสร้างแบบ Semantic HTML มุ่งเน้นไปที่ความถูกต้องของ SEO และประสิทธิภาพในการโหลดหน้าเว็บ",
    connections: ["css3", "javascript"]
  },
  {
    id: "css3",
    name: "CSS3 & Tailwind",
    percentage: 46,
    icon: "palette",
    color: "from-cyan-400 to-blue-500",
    glowColor: "rgba(34, 211, 238, 0.4)",
    x: 35,
    y: 80,
    type: "frontend",
    description: "เชี่ยวชาญการออกแบบสไตล์โดยใช้ Tailwind CSS สร้าง UI ในสไตล์กลาสมอร์ฟิซึม (Glassmorphism) สไตล์ล้ำยุคไซเบอร์เนติกส์ และทรานซิชันที่สมูท",
    connections: ["html5", "javascript"]
  },
  {
    id: "javascript",
    name: "JavaScript & React",
    percentage: 50,
    icon: "zap",
    color: "from-yellow-400 to-amber-500",
    glowColor: "rgba(234, 179, 8, 0.4)",
    x: 45,
    y: 35,
    type: "frontend",
    description: "ใช้ในการจัดการ State, Logic ฝั่งไคลเอนต์ การตอบสนองของ UI แบบไดนามิก และการเขียนอนิเมชันร่วมกับเฟรมเวิร์กยอดนิยมเช่น React",
    connections: ["html5", "css3", "autohotkey"]
  },
  {
    id: "autohotkey",
    name: "AutoHotkey",
    percentage: 80,
    icon: "bot",
    color: "from-sky-400 to-blue-600",
    glowColor: "rgba(56, 189, 248, 0.4)",
    x: 68,
    y: 25,
    type: "automation",
    description: "สร้างสคริปต์สําหรับทํางานอัตโนมัติบนระบบ Windows ยกระดับความรวดเร็วในการจัดสรรทรัพยากร และสร้างเครื่องมือที่ตอบสนองความต้องการของผู้ใช้เฉพาะทาง",
    connections: ["javascript", "c_lang"]
  },
  {
    id: "c_lang",
    name: "C Language",
    percentage: 25,
    icon: "settings",
    color: "from-slate-400 to-slate-600",
    glowColor: "rgba(148, 163, 184, 0.4)",
    x: 62,
    y: 70,
    type: "systems",
    description: "เข้าใจโครงสร้างระดับต่ำและกลไกบริหารทรัพยากรเมมโมรี่ (Memory Management) การเพิ่มประสิทธิภาพของโปรเซสเซอร์ และการจูนระดับแกนกลางระบบ",
    connections: ["autohotkey", "cpp"]
  },
  {
    id: "cpp",
    name: "C++",
    percentage: 10,
    icon: "gamepad",
    color: "from-purple-500 to-indigo-600",
    glowColor: "rgba(168, 85, 247, 0.4)",
    x: 82,
    y: 52,
    type: "systems",
    description: "ใช้ในการสร้างโมดูลระบบประมวลผลความหน่วงต่ำ และการปรับแต่งเครื่องมือ Optimization ของระบบปฏิบัติการเพื่อการเชื่อมต่อที่รวดเร็วขึ้น",
    connections: ["c_lang"]
  }
];

export function ConstellationMap() {
  const [activeNode, setActiveNode] = useState<SkillNode>(SKILL_NODES[2]); // Default to JS
  const [viewMode, setViewMode] = useState<"map" | "grid">("map");

  const getNodeIcon = (iconName: string) => {
    switch (iconName) {
      case "globe":
        return <Globe className="w-5 h-5 text-orange-400" />;
      case "palette":
        return <Layers className="w-5 h-5 text-cyan-400" />;
      case "zap":
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case "bot":
        return <Bot className="w-5 h-5 text-sky-400" />;
      case "settings":
        return <Settings className="w-5 h-5 text-slate-300" />;
      case "gamepad":
        return <Gamepad2 className="w-5 h-5 text-purple-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="w-full relative">
      
      {/* Subheader and view toggler */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-4">
        <p className="text-sm text-slate-400 text-center sm:text-left">
          จิ้มที่กลุ่มดาวเพื่อดูข้อมูลวิเคราะห์ความสามารถและรายละเอียดเชิงลึก
        </p>
        <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl">
          <button
            onClick={() => setViewMode("map")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "map"
                ? "bg-blue-500/10 border border-blue-500/20 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>กลุ่มดาว (Constellation)</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === "grid"
                ? "bg-blue-500/10 border border-blue-500/20 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>รายการทักษะ (Standard Grid)</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === "map" ? (
          <motion.div
            key="map-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Interactive Space Constellation Map */}
            <div className="lg:col-span-8 bg-[#070b13]/85 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] shadow-2xl transition-all duration-300">
              
              {/* Space visual details - glowing background nebula */}
              <div className="absolute top-1/4 left-1/3 w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-1/4 right-1/4 w-[35%] h-[35%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
              
              {/* Star dust effect in background */}
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 pointer-events-none" />

              {/* Grid Lines */}
              <div className="absolute inset-0 border border-white/[0.02] flex justify-between pointer-events-none">
                <div className="w-[1px] bg-white/[0.02] h-full ml-[25%]" />
                <div className="w-[1px] bg-white/[0.02] h-full ml-[25%]" />
                <div className="w-[1px] bg-white/[0.02] h-full ml-[25%]" />
              </div>
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="h-[1px] bg-white/[0.02] w-full mt-[25%]" />
                <div className="h-[1px] bg-white/[0.02] w-full mt-[25%]" />
                <div className="h-[1px] bg-white/[0.02] w-full mt-[25%]" />
              </div>

              {/* SVG connection lines overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                {SKILL_NODES.map((node) => 
                  node.connections.map((targetId) => {
                    const target = SKILL_NODES.find(n => n.id === targetId);
                    if (!target) return null;

                    // Ensure we only draw each line once
                    if (node.id > targetId) return null;

                    const isActiveLink = activeNode.id === node.id || activeNode.id === targetId;

                    return (
                      <g key={`${node.id}-${targetId}`}>
                        {/* Shadow path under the line for neon intensity */}
                        <motion.line
                          x1={`${node.x}%`}
                          y1={`${node.y}%`}
                          x2={`${target.x}%`}
                          y2={`${target.y}%`}
                          stroke={isActiveLink ? "#22d3ee" : "rgba(255, 255, 255, 0.05)"}
                          strokeWidth={isActiveLink ? "0.6" : "0.25"}
                          className="transition-all duration-500"
                        />
                        {/* Hover glow path */}
                        {isActiveLink && (
                          <line
                            x1={`${node.x}%`}
                            y1={`${node.y}%`}
                            x2={`${target.x}%`}
                            y2={`${target.y}%`}
                            stroke="#818cf8"
                            strokeWidth="1.2"
                            opacity="0.25"
                            className="blur-sm"
                          />
                        )}
                      </g>
                    );
                  })
                )}
              </svg>

              {/* Skill Stars (HTML Overlaid Elements) */}
              <div className="absolute inset-0 z-20">
                {SKILL_NODES.map((node) => {
                  const isSelected = activeNode.id === node.id;
                  
                  return (
                    <div
                      key={node.id}
                      style={{
                        position: "absolute",
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="cursor-pointer group/node"
                      onClick={() => setActiveNode(node)}
                    >
                      {/* Pulsing Outer rings */}
                      {isSelected && (
                        <>
                          <span className="absolute -inset-6 rounded-full bg-blue-500/5 animate-ping opacity-60" style={{ animationDuration: "3s" }} />
                          <span className="absolute -inset-4 border border-cyan-500/20 rounded-full animate-pulse" />
                        </>
                      )}

                      {/* Glowing star visual core */}
                      <div 
                        className={`relative w-11 h-11 md:w-13 md:h-13 bg-[#0a0f1d] border rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                          isSelected 
                            ? "border-cyan-400 scale-110 ring-4 ring-cyan-500/15" 
                            : "border-white/10 group-hover/node:border-white/30 group-hover/node:scale-105"
                        }`}
                        style={{
                          boxShadow: isSelected ? `0 0 15px ${node.glowColor}` : "none"
                        }}
                      >
                        {getNodeIcon(node.icon)}

                        {/* Floating Micro Label */}
                        <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold tracking-widest uppercase transition-all duration-300 ${
                          isSelected ? "text-cyan-400 opacity-100" : "text-slate-400 opacity-60 group-hover/node:opacity-100 group-hover/node:text-white"
                        }`}>
                          {node.name}
                        </span>

                        {/* Connection Node Dot indicator */}
                        <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[#0a0f1d] transition-all duration-300 ${
                          isSelected ? "bg-cyan-400 animate-pulse" : "bg-slate-500 group-hover/node:bg-white"
                        }`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Watermark map metadata */}
              <div className="absolute top-4 left-6 hidden sm:block font-mono text-[9px] text-slate-500 tracking-widest uppercase pointer-events-none">
                SYS_MAP // STAR_MAP_v2.0 // TCC_CONSTELLATION
              </div>
              <div className="absolute bottom-4 right-6 hidden sm:block font-mono text-[9px] text-slate-500 tracking-widest uppercase text-right pointer-events-none">
                CLICK_STAR_FOR_TELEMETRY
              </div>

            </div>

            {/* Holographic Metadata Details Card */}
            <div className="lg:col-span-4 h-full flex flex-col">
              <motion.div
                key={activeNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-[#0b1329]/65 backdrop-blur-2xl border border-white/10 hover:border-cyan-500/20 rounded-3xl p-6 shadow-2xl transition-all duration-300 flex-1 relative overflow-hidden flex flex-col justify-between"
              >
                {/* Glowing neon block line top */}
                <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${activeNode.color}`} />

                <div>
                  {/* Category Type Badge */}
                  <div className="flex justify-between items-center mb-6">
                    <span className="px-3.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 text-slate-400 font-mono">
                      {activeNode.type}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      NODE_{activeNode.id.toUpperCase()}
                    </span>
                  </div>

                  {/* Title and Icon header row */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {getNodeIcon(activeNode.icon)}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white tracking-wide">{activeNode.name}</h3>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-cyan-400 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span>ACTIVE_NODE</span>
                      </div>
                    </div>
                  </div>

                  {/* Description segment */}
                  <div className="mb-6">
                    <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-1.5">
                      Description • รายละเอียดทักษะ
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                      {activeNode.description}
                    </p>
                  </div>

                  {/* Connection telemetry paths */}
                  <div className="mb-6">
                    <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-2">
                      Linked Orbits • กลุ่มวิถีโคจรที่เชื่อมโยง
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeNode.connections.map((connId) => {
                        const connNode = SKILL_NODES.find(n => n.id === connId);
                        if (!connNode) return null;
                        return (
                          <span 
                            key={connId}
                            onClick={() => setActiveNode(connNode)}
                            className="py-1 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] text-slate-300 hover:text-white font-mono uppercase cursor-pointer transition-colors"
                          >
                            🔗 {connNode.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Massive Level Gauge */}
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex justify-between items-end mb-2.5">
                    <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                      Skill Mastery • ระดับความถนัด
                    </span>
                    <span className="font-mono text-xl font-extrabold text-white">
                      {activeNode.percentage}%
                    </span>
                  </div>

                  <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden relative border border-white/5">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r ${activeNode.color} transition-all duration-700 ease-out relative`}
                      style={{ width: `${activeNode.percentage}%` }}
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-white shadow-[0_0_12px_#fff]" />
                    </div>
                  </div>
                </div>

              </motion.div>
            </div>
          </motion.div>
        ) : (
          /* Standard fallback clean grid view with the exact previous styles */
          <motion.div
            key="grid-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {SKILL_NODES.map((skill, idx) => (
              <motion.div
                key={skill.name}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                whileHover={{ y: -5 }}
                className="p-6 bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-3xl relative overflow-hidden transition-all duration-300 shadow-xl group"
              >
                {/* Back Ambient radial card light */}
                <div className="absolute inset-0 bg-radial from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {getNodeIcon(skill.icon)}
                    </div>
                    <h3 className="font-bold text-base text-white">{skill.name}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-white transition-colors">
                    {skill.percentage}%
                  </span>
                </div>

                {/* Progress bar housing */}
                <div className="h-2 bg-white/[0.07] rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${skill.percentage}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    className={`h-full bg-gradient-to-r ${skill.color} rounded-full relative`}
                  >
                    {/* Glowing moving light on progress node */}
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white shadow-[0_0_10px_#fff]" />
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
