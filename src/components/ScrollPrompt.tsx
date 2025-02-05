import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ScrollPromptProps {
  onOpenChat: () => void;
}

export const ScrollPrompt = ({ onOpenChat }: ScrollPromptProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const pageHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = (scrollPosition / (pageHeight - windowHeight)) * 100;

      if (scrollPercentage > 30 && !isVisible) {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 right-5 z-40 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-[250px]"
        >
          <p className="text-sm text-gray-600 mb-3">
            Hey! Need any help? I'm here to assist you!
          </p>
          <button
            onClick={() => {
              onOpenChat();
              setIsVisible(false);
            }}
            className="text-blue-500 text-sm font-medium hover:text-blue-600"
          >
            Start Chat →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};