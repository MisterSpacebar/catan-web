import React from "react";
import PropTypes from "prop-types";
import { cn } from "../../lib/utils";

const Card = React.forwardRef(({ className, children, variant = "default", glow, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-2xl overflow-hidden",
      "transition-all duration-200",
      // Variants
      variant === "default" && [
        "bg-slate-900/80 backdrop-blur-lg",
        "shadow-2xl shadow-black/35",
      ],
      variant === "elevated" && [
        "bg-slate-800/60 backdrop-blur-lg",
        "shadow-2xl shadow-black/45",
      ],
      variant === "glass" && [
        "bg-white/[0.04] backdrop-blur-xl",
        "shadow-xl shadow-black/25",
      ],
      variant === "surface" && [
        "bg-slate-900/50",
        "shadow-lg shadow-black/25",
      ],
      // Interactive
      interactive && "cursor-pointer hover:-translate-y-0.5 hover:shadow-2xl",
      // Glow
      glow && "ring-1 ring-indigo-500/20",
      className
    )}
    {...props}
  >
    <div className="relative">
      {children}
    </div>
  </div>
));

Card.displayName = "Card";

Card.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
  variant: PropTypes.oneOf(["default", "elevated", "glass", "surface"]),
  glow: PropTypes.bool,
  interactive: PropTypes.bool,
};

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-4 pb-2", className)}
    {...props}
  />
));

CardHeader.displayName = "CardHeader";

CardHeader.propTypes = {
  className: PropTypes.string,
};

const CardTitle = React.forwardRef(({ className, size = "default", ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-semibold text-slate-200",
      size === "default" && "text-lg",
      size === "sm" && "text-base",
      size === "lg" && "text-xl",
      className
    )}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";

CardTitle.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(["default", "sm", "lg"]),
};

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-slate-500", className)}
    {...props}
  />
));

CardDescription.displayName = "CardDescription";

CardDescription.propTypes = {
  className: PropTypes.string,
};

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn("p-4 pt-0", className)} 
    {...props} 
  />
));

CardContent.displayName = "CardContent";

CardContent.propTypes = {
  className: PropTypes.string,
};

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0", className)}
    {...props}
  />
));

CardFooter.displayName = "CardFooter";

CardFooter.propTypes = {
  className: PropTypes.string,
};

const CardSection = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("", className)}
    {...props}
  />
));

CardSection.displayName = "CardSection";

CardSection.propTypes = {
  className: PropTypes.string,
};

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardSection };
