import React, { useState, useEffect } from "react";

interface TypewriterProps {
  phrases: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  delayBeforeDelete?: number;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  phrases,
  typingSpeed = 80,
  deletingSpeed = 40,
  delayBeforeDelete = 1800,
}) => {
  const [currentText, setCurrentText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const phrase = phrases[phraseIndex];

    if (!isDeleting) {
      if (currentText === phrase) {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, delayBeforeDelete);
      } else {
        timer = setTimeout(() => {
          setCurrentText(phrase.slice(0, currentText.length + 1));
        }, typingSpeed);
      }
    } else {
      if (currentText === "") {
        setIsDeleting(false);
        setPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
      } else {
        timer = setTimeout(() => {
          setCurrentText(phrase.slice(0, currentText.length - 1));
        }, deletingSpeed);
      }
    }

    return () => clearTimeout(timer);
  }, [currentText, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, delayBeforeDelete]);

  return (
    <span className="inline-block min-h-[1.5em] font-mono text-[#00ffff] font-semibold">
      {currentText}
      <span className="ml-1 border-r-2 border-[#22d3ee] animate-pulse">|</span>
    </span>
  );
};
