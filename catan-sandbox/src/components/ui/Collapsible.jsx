import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "../../lib/utils";

export function Collapsible({ 
  children, 
  title, 
  defaultOpen = true, 
  icon: Icon,
  iconWeight = "regular",
  badge,
  variant = "default",
  className 
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div 
      className={cn(
        "rounded-lg overflow-hidden",
        variant === "default" && "bg-black/20",
        variant === "ghost" && "",
        variant === "elevated" && "bg-slate-800/30",
        className
      )}
    >
      {/* Header button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2",
          "text-left transition-colors duration-150",
          "hover:bg-white/[0.02]",
          "focus:outline-none",
          "group"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Left accent bar */}
          <div 
            className={cn(
              "w-0.5 h-4 rounded-full transition-colors duration-150",
              isOpen ? "bg-indigo-500/70" : "bg-slate-700 group-hover:bg-slate-600"
            )}
          />
          
          {/* Icon */}
          {Icon && (
            <Icon 
              size={14}
              weight={iconWeight}
              className={cn(
                "flex-shrink-0 transition-colors duration-150",
                isOpen ? "text-slate-400" : "text-slate-600 group-hover:text-slate-500"
              )}
            />
          )}
          
          {/* Title */}
          <span 
            className={cn(
              "text-xs font-medium truncate transition-colors duration-150",
              isOpen ? "text-slate-300" : "text-slate-400 group-hover:text-slate-300"
            )}
          >
            {title}
          </span>
          
          {/* Badge */}
          {badge != null && (
            <span 
              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/15 text-indigo-400"
            >
              {badge}
            </span>
          )}
        </div>
        
        {/* Chevron */}
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="flex-shrink-0"
        >
          <CaretDown 
            size={14}
            weight="bold"
            className={cn(
              "transition-colors duration-150",
              isOpen ? "text-slate-500" : "text-slate-600 group-hover:text-slate-500"
            )}
          />
        </motion.div>
      </button>
      
      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.15, delay: 0.05 }
            }}
            className="overflow-hidden"
          >
            {/* Content wrapper */}
            <div className="px-3 pb-3 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

Collapsible.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  defaultOpen: PropTypes.bool,
  icon: PropTypes.elementType,
  iconWeight: PropTypes.oneOf(["thin", "light", "regular", "bold", "fill", "duotone"]),
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  variant: PropTypes.oneOf(["default", "ghost", "elevated"]),
  className: PropTypes.string,
};

export default Collapsible;
