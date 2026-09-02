import React, { useState } from "react";
import { User, Cpu, Globe, Terminal, Bot, LucideIcon } from "lucide-react";

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackType?: "profile" | "project" | "boost" | "netboot" | "overlay" | "lilyai";
  projectName?: string;
}

const icons: Record<string, LucideIcon> = {
  profile: User,
  project: Globe,
  boost: Cpu,
  netboot: Terminal,
  overlay: Cpu,
  lilyai: Bot,
};

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = "",
  fallbackType = "project",
  projectName = "Product",
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    // Elegant minimalist cyber placeholder
    const IconComponent = icons[fallbackType] || Globe;
    
    // Choose gradient based on type
    let gradient = "from-[#6c63ff] to-[#22d3ee]";
    if (fallbackType === "boost") gradient = "from-[#ff512f] to-[#dd2476]";
    if (fallbackType === "netboot") gradient = "from-[#00c6ff] to-[#0072ff]";
    if (fallbackType === "overlay") gradient = "from-[#f472b6] to-[#6c63ff]";
    if (fallbackType === "lilyai") gradient = "from-[#ec4899] via-[#8b5cf6] to-[#3b82f6]";
    if (fallbackType === "profile") gradient = "from-[#6c63ff] via-[#a78bfa] to-[#22d3ee]";

    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br ${gradient} p-6 overflow-hidden select-none ${className}`}
        style={{ minHeight: fallbackType === "profile" ? "100%" : "200px" }}
      >
        {/* Subtle Cyber Grid Grid Background Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        
        <IconComponent className="w-12 h-12 text-white/90 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] mb-3 animate-pulse" />
        
        {fallbackType !== "profile" && (
          <span className="text-white text-xs font-mono tracking-widest uppercase font-bold text-center drop-shadow-md">
            {projectName}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-[#0a0a14] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#6c63ff] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
