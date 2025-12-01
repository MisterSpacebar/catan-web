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
  className,
  headerClassName,
  onOpenChange,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onOpenChange?.(newState);
  };

  return (
    <div 
      className={cn(
        "rounded-2xl overflow-hidden",
        // Subtle gradient background with shadow instead of rings
        variant === "default" && "bg-gradient-to-br from-slate-900/50 to-slate-950/60 shadow-lg shadow-black/25",
        variant === "ghost" && "bg-transparent",
        variant === "elevated" && "bg-gradient-to-br from-slate-800/50 to-slate-900/70 shadow-xl shadow-black/30",
        className
      )}
    >
      {/* Header button */}
      <button
        onClick={handleToggle}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3.5 py-2.5",
          "text-left transition-all duration-150",
          "hover:bg-white/[0.03]",
          "focus:outline-none",
          "group rounded-xl",
          headerClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Left accent bar with glow */}
          <div 
            className={cn(
              "w-1 h-5 rounded-full transition-all duration-200",
              isOpen 
                ? "bg-gradient-to-b from-indigo-400 to-indigo-500 shadow-sm shadow-indigo-500/40" 
                : "bg-slate-700/80 group-hover:bg-slate-600"
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
              "text-[13px] font-semibold truncate transition-colors duration-150",
              isOpen ? "text-slate-300" : "text-slate-400 group-hover:text-slate-300"
            )}
          >
            {title}
          </span>
          
          {/* Badge - chip style */}
          {badge != null && (
            <span 
              className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-indigo-500/20 to-purple-500/15 text-indigo-300 shadow-sm shadow-indigo-500/10"
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
            {/* Content wrapper with padding to accommodate child shadows/glows */}
            <div className="px-3.5 pb-3.5 pt-1 space-y-2">
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
  headerClassName: PropTypes.string,
  onOpenChange: PropTypes.func,
};

export default Collapsible;
