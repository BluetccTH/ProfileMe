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
      {/* Outer Ring Tracker with smooth trailing and hover styling */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-8 h-8 border rounded-full pointer-events-none z-[99999] transition-all duration-300 ease-out mix-blend-difference"
        style={{
          borderColor: isHovering ? "#22d3ee" : "#a78bfa",
          backgroundColor: isHovering ? "rgba(34, 211, 238, 0.15)" : "transparent",
          boxShadow: isHovering ? "0 0 15px rgba(34, 211, 238, 0.6)" : "none",
          width: isHovering ? "42px" : "28px",
          height: isHovering ? "42px" : "28px",
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

