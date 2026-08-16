import React, { useState, useEffect, useRef } from "react";

export const CustomCursor: React.FC = () => {
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  // Use refs for mouse positions to prevent useEffect re-runs and event listener thrashing
  const mouseRef = useRef({ x: 0, y: 0 });
  const trailRef = useRef({ x: 0, y: 0 });
  
  // DOM element references for direct, high-performance DOM updates (bypassing React state rendering delays)
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    // Enable only if device has a high-precision hover pointer (like a desktop mouse)
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsSupported(mediaQuery.matches);

    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      setIsSupported(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaQueryChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaQueryChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      if (!isVisible) setIsVisible(true);
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    const onMouseEnter = () => {
      setIsVisible(true);
    };

    // Add mouse event listeners to the window
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);
    document.addEventListener("mouseenter", onMouseEnter);

    // Track hovered elements
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "A" ||
         target.tagName === "BUTTON" ||
         target.closest("a") ||
         target.closest("button") ||
         target.closest(".skill-card") ||
         target.closest(".proj-card") ||
         target.classList.contains("clickable"))
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    document.addEventListener("mouseover", handleMouseOver, { passive: true });

    // Smooth render tick
    const render = () => {
      // Lerp for the outer ring trail
      const dx = mouseRef.current.x - trailRef.current.x;
      const dy = mouseRef.current.y - trailRef.current.y;
      
      trailRef.current.x += dx * 0.16; // Lerp factor for trail following
      trailRef.current.y += dy * 0.16;

      // Directly update DOM element positions for absolute precision and zero input-lag
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseRef.current.x}px, ${mouseRef.current.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${trailRef.current.x}px, ${trailRef.current.y}px, 0) translate(-50%, -50%)`;
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("mouseenter", onMouseEnter);
      document.removeEventListener("mouseover", handleMouseOver);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isSupported, isVisible]);

  if (!isSupported || !isVisible) return null;

  return (
    <>
      {/* Outer Ring Tracker with smooth trailing and 3D depth */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 border rounded-full pointer-events-none z-[99999] transition-all duration-300 ease-out mix-blend-difference"
        style={{
          width: isHovering ? "42px" : "28px",
          height: isHovering ? "42px" : "28px",
          border: "1px solid transparent",
          background: isHovering
            ? "linear-gradient(rgba(34, 211, 238, 0.12), rgba(34, 211, 238, 0.02)) padding-box, linear-gradient(145deg, rgba(233, 250, 255, 0.95) 0%, rgba(34, 211, 238, 0.9) 28%, rgba(34, 211, 238, 0.48) 60%, rgba(10, 80, 112, 0.9) 100%) border-box"
            : "linear-gradient(rgba(167, 139, 250, 0.025), rgba(167, 139, 250, 0.01)) padding-box, linear-gradient(145deg, rgba(235, 228, 255, 0.92) 0%, rgba(167, 139, 250, 0.86) 32%, rgba(118, 83, 195, 0.55) 65%, rgba(42, 27, 83, 0.95) 100%) border-box",
          boxShadow: isHovering
            ? "inset 2px 2px 3px rgba(255,255,255,0.42), inset -2px -2px 3px rgba(0,35,55,0.55), 0 0 12px rgba(34,211,238,0.42), 0 0 24px rgba(34,211,238,0.16)"
            : "inset 2px 2px 3px rgba(255,255,255,0.3), inset -2px -2px 3px rgba(25,10,60,0.6), 0 0 8px rgba(167,139,250,0.18)",
        }}
      />
      {/* Tight Inner Dot aligned perfectly with physical cursor */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-[#22d3ee] rounded-full pointer-events-none z-[99999] mix-blend-difference shadow-[0_0_8px_#22d3ee]"
      />
    </>
  );
};
