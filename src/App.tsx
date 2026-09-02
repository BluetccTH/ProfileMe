import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Cpu,
  Globe,
  Terminal,
  Layers,
  Sparkles,
  Zap,
  Bot,
  Settings,
  Gamepad2,
  Heart,
  Github,
  Instagram,
  Facebook,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
  Plus,
  Play,
  Code,
} from "lucide-react";

import { Project, Skill } from "./types";
import { ParticleBackground } from "./components/ParticleBackground";
import { Typewriter } from "./components/Typewriter";
import { StatCounter } from "./components/StatCounter";
import { SafeImage } from "./components/SafeImage";
import { CustomCursor } from "./components/CustomCursor";
import { StellarSandbox } from "./components/StellarSandbox";
import { ConstellationMap } from "./components/ConstellationMap";
import { Live2DAvatar } from "./components/Live2DAvatar";

// Dynamic age calculation based on birth date (03/04/2009 - 3 เมษายน 2009)
const BIRTH_DATE = new Date("2009-04-03");

const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
};

export default function App() {
  const currentAge = calculateAge(BIRTH_DATE);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState("CONNECTING SECURE PROTOCOLS...");
  const [activeSection, setActiveSection] = useState("home");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [avatarViewMode, setAvatarViewMode] = useState<"live2d" | "photo">("live2d");

  // Load handler with high-fidelity realistic percentage counter
  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    const startTime = Date.now();
    const duration = 2200; // Super smooth 2.2 second load time for luxury feel

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      const roundedProgress = Math.floor(progress);
      setLoadingProgress(roundedProgress);

      if (roundedProgress < 25) {
        setLoadingText("CONNECTING SECURE PROTOCOLS...");
      } else if (roundedProgress < 55) {
        setLoadingText("LOADING PORTFOLIO ASSETS...");
      } else if (roundedProgress < 85) {
        setLoadingText("TUNING CYBERNETIC INTERFACES...");
      } else {
        setLoadingText("WELCOME TO BLUE.TCC...");
      }

      if (progress >= 100) {
        clearInterval(progressInterval);
        setTimeout(() => {
          setIsLoading(false);
        }, 300); // Slight pause at 100% for smooth transition
      }
    };

    progressInterval = setInterval(updateProgress, 16);
    return () => clearInterval(progressInterval);
  }, []);

  // Scroll Progress and Active Section Tracker
  useEffect(() => {
    const handleScroll = () => {
      // Scroll progress
      const totalHeight = document.body.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress((window.scrollY / totalHeight) * 100);
      }

      // Active section
      const sections = ["home", "about", "skills", "portfolio", "contact"];
      const scrollPosition = window.scrollY + window.innerHeight / 3;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Handle smooth scroll navigation
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMobileMenuOpen(false);
  };

  const projects: Project[] = [
    {
      id: "lilyai",
      name: "Lily - AI",
      description: "An interactive celestial Live2D AI Anime companion featuring real-time eye and cursor tracking, high-fidelity voice synthesis, conversational intelligence powered by Google Gemini, emotional facial expressions, and responsive physics.",
      imageUrl: "Lily - AI.jpg",
      githubUrl: "https://bluetccth.github.io/Lily---AI-Anime-Companion/",
      tags: ["AI", "CHAT BOT", "API", "LIVE2D SYNC"],
    },
    {
      id: "boost",
      name: "Boost PC",
      description: "ซอฟต์แวร์เพิ่มประสิทธิภาพระบบปฏิบัติการ Windows ให้ตอบสนองรวดเร็วยิ่งขึ้น ลดภาระ CPU/RAM ส่วนเกิน เพื่อเฟรมเรตและเสถียรภาพสูงสุดในการใช้งานทั่วไปและเล่นเกม",
      imageUrl: "BoostPC.jpg",
      githubUrl: "https://github.com/BluetccTH/BoostPC",
      tags: ["Windows", "Optimization", "Tuning", "Performance"],
    },
    {
      id: "netboot",
      name: "NetBoot X",
      description: "เครื่องมือยกระดับการทำงานของระบบเครือข่ายและการเชื่อมต่ออินเทอร์เน็ต รวมถึงช่วยจัดการระบบฟื้นฟูข้อมูล และลดความหน่วง (Ping) สำหรับการเล่นเกมออนไลน์ระดับสูง",
      imageUrl: "NetBoot-X.jpg",
      githubUrl: "https://github.com/BluetccTH/NetBoot-X",
      tags: ["Gaming", "Network", "Tuning", "Utility"],
    },
    {
      id: "overlay",
      name: "Overlay PC",
      description: "ระบบแสดงผลข้อมูลสมรรถนะของ Windows แบบเรียลไทม์ (Real-time Overlay) แสดงค่า FPS, อัตราการใช้งาน CPU, GPU, RAM รวมถึงระดับปิงที่แม่นยำบนหน้าจอขณะเล่นเกม",
      imageUrl: "Overlay-PC.jpg",
      githubUrl: "https://github.com/BluetccTH/Overlay-PC",
      tags: ["Overlay", "Real-time", "Hardware", "Performance"],
    },
  ];

  const skills: Skill[] = [
    { name: "HTML5", percentage: 96, icon: "globe", color: "from-[#ff512f] to-[#dd2476]" },
    { name: "CSS3", percentage: 46, icon: "palette", color: "from-[#2193b0] to-[#6dd5ed]" },
    { name: "JavaScript", percentage: 50, icon: "zap", color: "from-[#f7df1e] to-[#f0a00e]" },
    { name: "C Language", percentage: 25, icon: "settings", color: "from-[#4b5563] to-[#9ca3af]" },
    { name: "Python", percentage: 45, icon: "terminal", color: "from-[#6c63ff] to-[#a78bfa]" },
    { name: "AutoHotkey", percentage: 80, icon: "bot", color: "from-[#00c6ff] to-[#0072ff]" },
  ];

  const getSkillIcon = (icon: string) => {
    switch (icon) {
      case "globe":
        return <Globe className="w-5 h-5 text-[#ff512f]" />;
      case "palette":
        return <Layers className="w-5 h-5 text-[#2193b0]" />;
      case "zap":
        return <Zap className="w-5 h-5 text-[#f7df1e]" />;
      case "settings":
        return <Settings className="w-5 h-5 text-[#9ca3af]" />;
      case "terminal":
        return <Terminal className="w-5 h-5 text-[#a78bfa]" />;
      case "gamepad":
        return <Gamepad2 className="w-5 h-5 text-[#a78bfa]" />;
      case "bot":
        return <Bot className="w-5 h-5 text-[#00c6ff]" />;
      default:
        return <Code className="w-5 h-5 text-white" />;
    }
  };

  return (
    <div className="relative text-slate-100 font-sans overflow-x-hidden min-h-screen selection:bg-blue-500/30 selection:text-white bg-[#0f172a]">
      
      {/* Scroll Progress Bar */}
      <div
        className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-[9999] transition-all duration-100 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Preloader Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="preloader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 bg-[#070b13] flex flex-col items-center justify-center z-[99999] overflow-hidden"
          >
            {/* Ambient Nebula glow in background */}
            <div className="absolute w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[100px] -top-10 -left-10" />
            <div className="absolute w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[100px] -bottom-10 -right-10" />

            {/* Corner Bracket details */}
            <div className="absolute top-8 left-8 w-6 h-6 border-t border-l border-blue-500/30" />
            <div className="absolute top-8 right-8 w-6 h-6 border-t border-r border-purple-500/30" />
            <div className="absolute bottom-8 left-8 w-6 h-6 border-b border-l border-cyan-500/30" />
            <div className="absolute bottom-8 right-8 w-6 h-6 border-b border-r border-blue-500/30" />

            {/* Corner Text Metadata */}
            <div className="absolute top-8 left-16 hidden sm:flex items-center gap-2 font-mono text-[10px] tracking-widest text-slate-500 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              SYS_BOOT // SEC_PROT_v4.2.1
            </div>
            <div className="absolute top-8 right-16 hidden sm:block font-mono text-[10px] tracking-widest text-slate-500 uppercase text-right">
              CHISANUPONG_RENUHOM // PORTFOLIO
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center px-6 relative z-10"
            >
              {/* Spinning Holographic Cyber Ring & Favicon Container */}
              <div className="relative w-28 h-28 flex items-center justify-center mb-8">
                {/* Outer spinning dash ring */}
                <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40 animate-[spin_10s_linear_infinite]" />
                
                {/* Inner opposite spinning gradient ring */}
                <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-blue-500 border-b-purple-500 animate-[spin_3s_linear_infinite]" />
                
                {/* Pulsing neon circle overlay */}
                <div className="absolute inset-4 rounded-full bg-blue-500/5 blur-md animate-pulse" />

                {/* Main Logo */}
                <div className="relative w-14 h-14 bg-[#0a101f] border border-white/10 rounded-2xl flex items-center justify-center p-2.5 shadow-2xl overflow-hidden hover:scale-105 transition-transform">
                  <img src="favicon.png" alt="BLUE.TCC Logo" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Title with tracking */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl md:text-3xl font-extrabold tracking-[0.3em] bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent select-none"
              >
                BLUE.TCC
              </motion.h1>

              {/* Status dynamic message */}
              <div className="h-5 flex items-center justify-center mb-6 mt-1">
                <motion.p
                  key={loadingText}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  className="font-mono text-[10px] md:text-xs text-cyan-400 tracking-[0.2em] uppercase font-medium"
                >
                  {loadingText}
                </motion.p>
              </div>

              {/* Modern progress track */}
              <div className="w-64 md:w-80 h-[5px] bg-white/5 border border-white/10 rounded-full overflow-hidden relative shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 shadow-[0_0_12px_rgba(34,211,238,0.8)] transition-all duration-75 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              {/* Monospace numeric tracker */}
              <div className="font-mono text-sm tracking-wider text-slate-300 font-semibold select-none flex items-center gap-1.5">
                <span className="text-cyan-400 font-medium">SYS.LOAD:</span>
                <span>{loadingProgress}%</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Canvas Particles */}
      <ParticleBackground />

      {/* Interactive Custom Cursor */}
      <CustomCursor />

      {/* Futuristic Fixed Cyber Glows and Scanline overlays */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-[0.38]"
          style={{ transform: "scale(1.05)", willChange: "transform" }}
        >
          <source src="background.mp4" type="video/mp4" />
        </video>

        {/* Animated Mesh Gradient Background from Frosted Glass HTML */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/35 rounded-full blur-[120px] nebula-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/35 rounded-full blur-[120px] nebula-glow" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/25 rounded-full blur-[100px] nebula-glow" />
        
        {/* Subtle Horizontal scanlines */}
        <div className="scanlines" />
        
        {/* Subtle Dark Grid Layout */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      {/* STICKY GLASS NAVIGATION BAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 border-b backdrop-blur-md ${
          window.scrollY > 50 || activeSection !== "home"
            ? "bg-white/5 py-4 border-white/10 shadow-lg"
            : "bg-transparent py-5 border-transparent"
        }`}
      >
        <div className="w-full px-5 md:px-12 lg:px-16 flex justify-between items-center relative">
          {/* Brand Logo (Left) */}
          <motion.button
            onClick={() => scrollToSection("home")}
            className="text-lg md:text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent hover:scale-105 transition-transform cursor-pointer uppercase flex items-center gap-2.5 shrink-0 z-10"
          >
            <img src="favicon.png" alt="Logo" className="w-8 h-8 object-contain rounded-lg shadow-sm" />
            <span>BLUE.TCC</span>
          </motion.button>

          {/* Desktop Navigation Links (Center) */}
          <ul className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 z-0">
            {["home", "about", "skills", "portfolio", "contact"].map((section) => (
              <li key={section}>
                <button
                  onClick={() => scrollToSection(section)}
                  className={`text-sm tracking-wide capitalize transition-colors duration-300 relative py-1 cursor-pointer font-medium ${
                    activeSection === section ? "text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {section === "home" && "หน้าแรก"}
                  {section === "about" && "เกี่ยวกับ"}
                  {section === "skills" && "ทักษะ"}
                  {section === "portfolio" && "ผลงาน"}
                  {section === "contact" && "ติดต่อ"}
                  {activeSection === section && (
                    <motion.div
                      layoutId="navIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* Support CTA Button (Right) */}
          <div className="hidden md:flex items-center z-10">
            <a
              href="https://ezdn.app/blue_tcc"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/40 hover:to-purple-600/40 border border-white/20 hover:border-cyan-400/50 rounded-full text-xs font-semibold uppercase tracking-widest text-slate-100 backdrop-blur-sm transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>💸</span>
              <span>Support</span>
            </a>
          </div>

          {/* Hamburger Menu Icon (Mobile) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10 transition-colors z-10"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* FULL SCREEN MOBILE OVERLAY DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-[#030308]/95 backdrop-blur-2xl z-[999] flex flex-col items-center justify-center"
          >
            <div className="absolute top-5 right-5">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={{
                open: { transition: { staggerChildren: 0.1 } },
                closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
              }}
              className="flex flex-col items-center gap-6 w-full max-w-xs"
            >
              {[
                { id: "home", label: "หน้าแรก" },
                { id: "about", label: "เกี่ยวกับฉัน" },
                { id: "skills", label: "ทักษะและความสามารถ" },
                { id: "portfolio", label: "ผลงานพัฒนาซอฟต์แวร์" },
                { id: "contact", label: "ติดต่อและช่องทาง" },
              ].map((item) => (
                <motion.button
                  key={item.id}
                  variants={{
                    open: { opacity: 1, y: 0, scale: 1 },
                    closed: { opacity: 0, y: 30, scale: 0.9 },
                  }}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full py-4 px-6 text-center text-lg font-bold border border-white/5 rounded-2xl transition-all ${
                    activeSection === item.id
                      ? "bg-gradient-to-r from-[#6c63ff]/20 to-[#22d3ee]/20 border-[#6c63ff]/30 text-white shadow-[0_0_20px_rgba(108,99,255,0.1)]"
                      : "bg-white/[0.02] text-[#8a87b0] hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {item.label}
                </motion.button>
              ))}

              <motion.a
                variants={{
                  open: { opacity: 1, y: 0 },
                  closed: { opacity: 0, y: 20 },
                }}
                href="https://ezdn.app/blue_tcc"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-4 py-4 px-6 text-center text-lg font-bold text-white bg-gradient-to-r from-[#6c63ff] to-[#22d3ee] rounded-2xl shadow-[0_0_25px_rgba(108,99,255,0.3)]"
              >
                💸 Support Dev
              </motion.a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════
          SECTION 1: HERO (HOME)
      ════════════════════════════════════ */}
      <section id="home" className="relative min-h-screen flex items-center pt-28 pb-12 z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8 w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8 items-center">
            
            {/* Left Column: Introductions */}
            <div className="md:col-span-7 flex flex-col text-center md:text-left order-2 md:order-1">
              {/* Badges Container */}
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  ⚡ Developer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest bg-purple-500/10 border border-purple-500/20 text-[#a78bfa]">
                  🚀 Performance Engineer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  🎨 UI/UX Designer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  🤖 AI Specialist
                </span>
              </div>

              {/* Title & Glitch */}
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter leading-none mb-6">
                Mr. Chisanupong <br />
                <span className="glitch-hover inline-block bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent" data-text="Renuhom">
                  Renuhom
                </span>
              </h1>

              {/* Animated Typewriter */}
              <div className="text-lg md:text-xl font-medium mb-6 text-slate-400">
                นักพัฒนาซอฟต์แวร์ อายุ {currentAge} ปี — เรียนรู้ด้วยตนเอง <br className="hidden sm:block" />
                <div className="mt-1">
                  <Typewriter
                    phrases={[
                      "⚡ Windows Optimization Developer",
                      "🚀 System Performance Architect",
                      "🎨 Futuristic UI/UX Creator",
                      "🤖 Automation & AI Integrator",
                    ]}
                    typingSpeed={120}
                    deletingSpeed={60}
                    delayBeforeDelete={3500}
                  />
                </div>
              </div>

              {/* Description Statement */}
              <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl mx-auto md:mx-0 pl-0 md:pl-4 border-l-0 md:border-l-2 border-blue-500/30 italic mb-8">
                Crafting modern high-performance tools, Windows system tuning engines,
                and custom workspace automations — engineered with pristine focus on extreme system efficiency,
                minimalist interface layouts, and real-world practical utility.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <a
                  href="https://bluetccth.github.io/Lily---AI-Anime-Companion/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                >
                  <span>🚀 Lily AI</span>
                </a>
                <a
                  href="https://discord.gg/WTYgx6CPeh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 rounded-full font-semibold text-white flex items-center gap-2 hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                  </svg>
                  <span>Join Discord</span>
                </a>
              </div>

              {/* Interactive Counter row */}
              <div className="flex gap-10 mt-10 justify-center md:justify-start">
                <div className="flex flex-col">
                  <span className="flex items-center gap-0.5">
                    <StatCounter value={3} />
                    <span className="text-blue-400 font-bold text-lg">+</span>
                  </span>
                  <span className="text-[10px] text-slate-400 tracking-[0.1em] uppercase mt-1 font-mono">
                    Projects
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="flex items-center gap-0.5">
                    <StatCounter value={6} />
                    <span className="text-blue-400 font-bold text-lg">+</span>
                  </span>
                  <span className="text-[10px] text-slate-400 tracking-[0.1em] uppercase mt-1 font-mono">
                    Languages
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="flex items-center gap-0.5">
                    <StatCounter value={currentAge} />
                  </span>
                  <span className="text-[10px] text-slate-400 tracking-[0.1em] uppercase mt-1 font-mono">
                    Age
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Floating Live2D / Profile card */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative order-1 md:order-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
                className="relative flex flex-col items-center w-full max-w-sm sm:max-w-md"
              >
                {/* Mode Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-white/10 backdrop-blur-md rounded-full mb-4 z-20">
                  <button
                    onClick={() => setAvatarViewMode("live2d")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      avatarViewMode === "live2d"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>✨ Live2D Interactive</span>
                  </button>
                  <button
                    onClick={() => setAvatarViewMode("photo")}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      avatarViewMode === "photo"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>📷 Profile Photo</span>
                  </button>
                </div>

                {avatarViewMode === "live2d" ? (
                  /* Interactive Live2D Model Canvas with full mouse tracking & physics */
                  <div className="relative w-full aspect-[4/4.8] max-h-[460px] flex items-center justify-center">
                    <Live2DAvatar className="w-full h-full" height={450} width={380} />
                  </div>
                ) : (
                  /* Classic Photo Mode */
                  <div className="relative flex flex-col items-center my-4">
                    {/* Back Soft Glow */}
                    <div className="absolute inset-0 top-[20%] w-[250px] h-[250px] bg-blue-500/20 rounded-full blur-[45px] pointer-events-none -z-10 animate-pulse" />

                    {/* Rotating Outer RGB Border */}
                    <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-xl shadow-blue-500/10 flex items-center justify-center">
                      {/* Outer Orbit Halo */}
                      <div className="absolute -inset-2 border border-blue-500/20 rounded-full animate-[spin_20s_linear_infinite] pointer-events-none" />
                      
                      {/* Internal Image Frame Mask */}
                      <div className="w-full h-full rounded-full bg-[#0f172a] overflow-hidden flex items-center justify-center">
                        <SafeImage
                          src="Profile.jpg"
                          alt="Blue.tcc Profile"
                          className="w-full h-full object-cover rounded-full hover:scale-105 transition-transform duration-500"
                          fallbackType="profile"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Overlay card */}
                <div className="mt-4 flex flex-col items-center gap-1 text-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                      Blue.tcc
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 border border-blue-500/30 text-blue-300">
                      LIVE2D SYNC
                    </span>
                  </div>
                  
                  {/* Status indicator badge */}
                  <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 backdrop-blur-md">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 shadow-[0_0_8px_#10b981]"></span>
                    </span>
                    Neural Motion Tracking Active
                  </span>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION: STELLAR SANDBOX
      ════════════════════════════════════ */}
      <section id="sandbox" className="pt-24 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <span className="inline-block mb-3 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              Interactive Space Playground
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Stellar Sandbox
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto mt-3 leading-relaxed">
              ทดลองควบคุมแรงดึงดูดของดวงดาวและหลุมดำด้วยปลายนิ้วของคุณ สัมผัสพลังแห่งระบบกลศาสตร์วงโคจรจำลองแบบเรียลไทม์บนผืนอวกาศอันกว้างใหญ่
            </p>
          </div>

          <StellarSandbox />
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 2: ABOUT
      ════════════════════════════════════ */}
      <section id="about" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <span className="inline-block mb-3 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400">
              About me
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              เกี่ยวกับฉัน
            </h2>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Overview - Full Width Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="md:col-span-2 p-6 md:p-8 bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-3xl relative overflow-hidden transition-all duration-300 group shadow-xl"
            >
              {/* Card visual accent border */}
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
              
              <div className="flex items-center gap-2.5 mb-4 text-blue-400 font-bold text-sm uppercase tracking-widest">
                <User className="w-5 h-5 text-blue-400" />
                <span>Overview • ข้อมูลทั่วไป</span>
              </div>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                ผมเป็นนักพัฒนาซอฟต์แวร์ที่มุ่งเน้นด้าน <strong className="text-white font-semibold">Windows Optimization, Automation, AI</strong> และ <strong className="text-white font-semibold">Performance Engineering</strong> มีประสบการณ์ในการพัฒนาเครื่องมือสำหรับเพิ่มประสิทธิภาพของระบบปฏิบัติการ ปรับแต่ง Windows ให้ตอบสนองรวดเร็วขึ้น ลดภาระของระบบ และช่วยยกระดับประสบการณ์การเล่นเกมให้ลื่นไหลมากขึ้น รวมถึงการพัฒนา <strong className="text-white font-semibold">Automation Tools</strong> และ <strong className="text-white font-semibold">Utility Software</strong> โดยให้ความสำคัญกับ <strong className="text-white font-semibold">Performance, Clean Design</strong> และ <strong className="text-white font-semibold">Real-world Usability</strong>
              </p>
            </motion.div>

            {/* Expertise Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="p-6 md:p-8 bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-3xl relative overflow-hidden transition-all duration-300 group shadow-xl"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
              
              <div className="flex items-center gap-2.5 mb-4 text-indigo-400 font-bold text-sm uppercase tracking-widest">
                <Terminal className="w-5 h-5" />
                <span>Expertise • ความเชี่ยวชาญ</span>
              </div>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                Windows Optimization &bull; System Performance Tuning &bull; Gaming Latency Optimization &bull; Automation Scripting &bull; Modern UI/UX Design &bull; GitHub Source Management &bull; AI Automation Pipelines
              </p>
            </motion.div>

            {/* Goal Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="p-6 md:p-8 bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-3xl relative overflow-hidden transition-all duration-300 group shadow-xl"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
              
              <div className="flex items-center gap-2.5 mb-4 text-purple-400 font-bold text-sm uppercase tracking-widest">
                <Sparkles className="w-5 h-5" />
                <span>Goal • เป้าหมาย</span>
              </div>
              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                มุ่งมั่นพัฒนาซอฟต์แวร์และระบบ Automation อัจฉริยะที่ช่วยเพิ่มประสิทธิภาพสูงสุด ปลดล็อกขีดจำกัดของเครื่องพีซี พร้อมทั้งส่งมอบผลิตภัณฑ์ที่มีเสถียรภาพและดีไซน์ที่ทันสมัย เรียบง่าย น่าใช้งานจริง
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 3: SKILLS
      ════════════════════════════════════ */}
      <section id="skills" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <span className="inline-block mb-3 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400">
              Expertise
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ทักษะและความสามารถ
            </h2>
          </div>

          <ConstellationMap />

        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 4: PORTFOLIO (PRODUCTS)
      ════════════════════════════════════ */}
      <section id="portfolio" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          
          {/* Header Section */}
          <div className="text-center mb-16">
            <span className="inline-block mb-3 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400">
              My Products
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              ผลงานการพัฒนา
            </h2>
          </div>

          {/* Cards Portfolio Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((proj, idx) => (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-white/20 rounded-3xl overflow-hidden transition-all duration-300 relative group shadow-xl"
              >
                {/* Project Image Panel */}
                <div className="relative aspect-video overflow-hidden bg-white/5 p-3">
                  <div className="w-full h-full rounded-lg overflow-hidden relative">
                    <SafeImage
                      src={proj.imageUrl}
                      alt={proj.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      fallbackType={proj.id as any}
                      projectName={proj.name}
                    />
                    
                    {/* Dark Hover overlay screen */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <a
                        href={proj.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-full flex items-center gap-1.5 shadow-lg transform translate-y-3 group-hover:translate-y-0 transition-all duration-300"
                      >
                        <Github className="w-4 h-4" />
                        <span>View on GitHub</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Project Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-wide mb-2 group-hover:text-blue-400 transition-colors">
                      {proj.name}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4">
                      {proj.description}
                    </p>
                  </div>

                  {/* Badges and Redirect footer links */}
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {proj.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/5 border border-white/10 text-blue-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 hover:translate-x-1 transition-all duration-300"
                    >
                      <span>Explore Repository</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════
          SECTION 5: CONTACT (COMING SOON)
      ════════════════════════════════════ */}
      <section id="contact" className="py-24 relative z-10">
        <div className="max-w-4xl mx-auto px-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Glowing Space Star Icon */}
            <div className="flex justify-center mb-8">
              <svg className="w-20 h-20 text-blue-400 drop-shadow-[0_0_25px_rgba(34,211,238,0.7)] animate-pulse" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 0 Q50 50 100 50 Q50 50 50 100 Q50 50 0 50 Q50 50 50 0 Z" fill="currentColor" />
              </svg>
            </div>

            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent mb-3">
              Coming Soon...
            </h2>
            <p className="text-sm md:text-base text-slate-300 max-w-md mx-auto mb-8">
              ระบบติดต่อและฟังก์ชันส่งข้อมูล กำลังอยู่ระหว่างกระบวนการพัฒนาและปรับแต่ง เพื่อรองรับฟีเจอร์ระดับสูงในอนาคตอันใกล้
            </p>

            <h3 className="text-lg md:text-xl font-bold tracking-[0.2em] bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent uppercase">
              BLUE.TCC
            </h3>
          </motion.div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FOOTER
      ════════════════════════════════════ */}
      <footer className="relative border-t border-white/10 overflow-hidden">
        {/* Animated flow neon line */}
        <div className="h-[1.5px] bg-gradient-to-r from-transparent via-blue-500 to-transparent w-full" />

        <div className="bg-gradient-to-b from-transparent via-black/80 to-black pt-16 pb-8 px-5 md:px-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            
            {/* Top Footer rows */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
              
              {/* Brand Column */}
              <div className="flex flex-col gap-4 text-center md:text-left">
                <h3 className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  BLUE.TCC
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto md:mx-0">
                  นักพัฒนาซอฟต์แวร์ผู้หลงใหลใน Windows Optimization, Task Automation และการออกแบบ UI/UX สไตล์ล้ำสมัย
                </p>

                {/* Social Badges Links */}
                <div className="flex gap-3 mt-2 justify-center md:justify-start">
                  <a
                    href="https://github.com/BluetccTH"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-blue-500 flex items-center justify-center transition-all duration-300"
                    title="GitHub"
                  >
                    <Github className="w-4.5 h-4.5" />
                  </a>
                  <a
                    href="https://discord.gg/WTYgx6CPeh"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-[#5865F2] hover:border-[#5865F2] flex items-center justify-center transition-all duration-300"
                    title="Discord"
                  >
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.instagram.com/bluesjii/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-[#E1306C] hover:border-[#E1306C] flex items-center justify-center transition-all duration-300"
                    title="Instagram"
                  >
                    <Instagram className="w-4.5 h-4.5" />
                  </a>
                  <a
                    href="https://www.facebook.com/kaxxch/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-[#1877F2] hover:border-[#1877F2] flex items-center justify-center transition-all duration-300"
                    title="Facebook"
                  >
                    <Facebook className="w-4.5 h-4.5" />
                  </a>
                </div>
              </div>

              {/* Navigation Links Column */}
              <div className="flex flex-col text-center md:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4 relative pb-1 after:absolute after:bottom-0 after:left-1/2 after:md:left-0 after:-translate-x-1/2 after:md:translate-x-0 after:w-8 after:h-[1px] after:bg-blue-500/30">
                  Navigation
                </span>
                <ul className="flex flex-col gap-2.5">
                  {[
                    { id: "home", name: "หน้าแรก" },
                    { id: "about", name: "เกี่ยวกับฉัน" },
                    { id: "skills", name: "ทักษะและความสามารถ" },
                    { id: "portfolio", name: "ผลงานพัฒนา" },
                    { id: "contact", name: "ติดต่อพัฒนา" },
                  ].map((link) => (
                    <li key={link.id}>
                      <button
                        onClick={() => scrollToSection(link.id)}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {link.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Status Indicator Column */}
              <div className="flex flex-col text-center md:text-left gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-4 relative pb-1 after:absolute after:bottom-0 after:left-1/2 after:md:left-0 after:-translate-x-1/2 after:md:translate-x-0 after:w-8 after:h-[1px] after:bg-blue-500/30 block">
                    Status Indicators
                  </span>
                  <div className="flex flex-col gap-2 items-center md:items-start">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                      </span>
                      <span>Portfolio - Online</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span>
                      </span>
                      <span>Contact System - Coming Soon</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400 block mb-2">
                    Direct Mail
                  </span>
                  <a
                    href="mailto:kaxranuhom@gmail.com"
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    kaxranuhom@gmail.com
                  </a>
                </div>
              </div>

            </div>

            {/* Separator */}
            <div className="h-[1px] bg-white/10 w-full mb-8" />

            {/* Bottom Copyright line and tags */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <span>&copy; {new Date().getFullYear()} Blue.tcc &bull; Built with pride and passion</span>
                <Heart className="w-3.5 h-3.5 text-pink-500 animate-pulse inline" />
                <span>in Thailand</span>
              </p>

              <div className="px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400 backdrop-blur-sm">
                Powered by <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent font-bold">React • Tailwind • Motion</span>
              </div>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
}
