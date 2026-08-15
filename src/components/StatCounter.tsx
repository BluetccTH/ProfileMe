import React, { useState, useEffect, useRef } from "react";

interface StatCounterProps {
  value: number;
  duration?: number; // total duration of the count-up in ms
}

export const StatCounter: React.FC<StatCounterProps> = ({
  value,
  duration = 1500,
}) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          
          let startTimestamp: number | null = null;
          const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            setCount(Math.floor(progress * value));
            
            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              setCount(value);
            }
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );

    const currentEl = elementRef.current;
    if (currentEl) {
      observer.observe(currentEl);
    }

    return () => {
      if (currentEl) {
        observer.unobserve(currentEl);
      }
    };
  }, [value, duration]);

  return (
    <span ref={elementRef} className="font-sans font-bold text-2xl md:text-3xl bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] bg-clip-text text-transparent">
      {count}
    </span>
  );
};
