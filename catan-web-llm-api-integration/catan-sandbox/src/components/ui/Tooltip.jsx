import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export function Tooltip({ 
  children, 
  content, 
  side = "top", 
  delay = 150, 
  sticky = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const timeoutRef = useRef(null);
  const tooltipRef = useRef(null);

  const handleMouseEnter = () => {
    if (!isSticky) {
      timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    }
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current);
    if (!isSticky) {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (sticky) {
      setIsSticky(!isSticky);
      setIsVisible(!isSticky);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsSticky(false);
        setIsVisible(false);
      }
    };

    if (isSticky) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSticky]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const motionVariants = {
    top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
    bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
    left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
    right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
  };

  return (
    <div 
      ref={tooltipRef}
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={motionVariants[side].initial}
            animate={motionVariants[side].animate}
            exit={motionVariants[side].initial}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className={cn(
              "absolute z-50 pointer-events-none",
              isSticky && "pointer-events-auto",
              positionClasses[side]
            )}
          >
            <div 
              className={cn(
                "relative rounded-lg overflow-hidden",
                "bg-slate-800/95 backdrop-blur-xl",
                "shadow-xl shadow-black/40",
                isSticky && "ring-1 ring-indigo-500/40"
              )}
            >
              <div className="relative px-2.5 py-1.5 text-xs text-slate-200 whitespace-nowrap">
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Tooltip.propTypes = {
  children: PropTypes.node.isRequired,
  content: PropTypes.node.isRequired,
  side: PropTypes.oneOf(["top", "bottom", "left", "right"]),
  delay: PropTypes.number,
  sticky: PropTypes.bool,
};

export default Tooltip;
