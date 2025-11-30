import React from "react";
import PropTypes from "prop-types";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  // Base styles - rounded rectangles with drop shadows for clickable feel
  [
    "relative inline-flex items-center justify-center gap-1.5",
    "whitespace-nowrap rounded-lg",
    "text-xs font-medium",
    "transition-all duration-150 ease-out",
    // Focus state - subtle glow
    "focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50",
    // Disabled state
    "disabled:pointer-events-none disabled:opacity-40",
    // Active press effect
    "active:scale-[0.97] active:shadow-sm",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-slate-800/80 text-slate-300",
          "shadow-md shadow-black/20",
          "hover:bg-slate-700/80 hover:text-white hover:shadow-lg",
        ],
        primary: [
          "bg-gradient-to-b from-indigo-500 to-indigo-600",
          "text-white",
          "shadow-lg shadow-indigo-500/30",
          "hover:from-indigo-400 hover:to-indigo-500 hover:shadow-xl hover:shadow-indigo-500/40",
        ],
        secondary: [
          "bg-slate-700/80 text-slate-300",
          "shadow-md shadow-black/20",
          "hover:bg-slate-600/80 hover:text-white hover:shadow-lg",
        ],
        success: [
          "bg-gradient-to-b from-emerald-500 to-emerald-600",
          "text-white",
          "shadow-lg shadow-emerald-500/30",
          "hover:from-emerald-400 hover:to-emerald-500 hover:shadow-xl hover:shadow-emerald-500/40",
        ],
        danger: [
          "bg-gradient-to-b from-red-500 to-red-600",
          "text-white",
          "shadow-lg shadow-red-500/30",
          "hover:from-red-400 hover:to-red-500 hover:shadow-xl hover:shadow-red-500/40",
        ],
        warning: [
          "bg-gradient-to-b from-amber-500 to-amber-600",
          "text-white",
          "shadow-lg shadow-amber-500/30",
          "hover:from-amber-400 hover:to-amber-500 hover:shadow-xl hover:shadow-amber-500/40",
        ],
        ghost: [
          "text-slate-400",
          "hover:text-white hover:bg-white/[0.06]",
        ],
        outline: [
          "bg-transparent text-slate-400",
          "ring-1 ring-inset ring-slate-700/50",
          "shadow-sm",
          "hover:bg-white/[0.03] hover:text-white hover:ring-slate-600/50",
        ],
        subtle: [
          "bg-slate-900/40 text-slate-500",
          "hover:bg-slate-800/50 hover:text-slate-300",
        ],
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-7 px-2.5 text-[11px] gap-1",
        sm: "h-8 px-3 text-[11px] gap-1",
        lg: "h-10 px-5 text-sm rounded-xl",
        xl: "h-11 px-6 text-sm rounded-xl",
        icon: "h-9 w-9 p-0",
        iconSm: "h-7 w-7 p-0",
        iconLg: "h-10 w-10 p-0 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

Button.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf([
    "default",
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "ghost",
    "outline",
    "subtle",
  ]),
  size: PropTypes.oneOf(["default", "xs", "sm", "lg", "xl", "icon", "iconSm", "iconLg"]),
  children: PropTypes.node,
};

export { Button, buttonVariants };
