import React from "react";
import PropTypes from "prop-types";
import { getPlayerColor } from "../../lib/colors";
import { cn } from "../../lib/utils";

/**
 * Player color dot indicator
 */
export function PlayerDot({ playerId, size = "md", className }) {
  const color = getPlayerColor(playerId);
  
  const sizeClasses = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  };

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color.primary }}
    />
  );
}

PlayerDot.propTypes = {
  playerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  size: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl"]),
  className: PropTypes.string,
};

/**
 * Player label chip (e.g., "P1", "P2")
 */
export function PlayerLabel({ playerId, showDot = true, size = "md", className }) {
  const color = getPlayerColor(playerId);
  
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium",
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: color.bg,
        color: color.primary,
        border: `1px solid ${color.border}`,
      }}
    >
      {showDot && <PlayerDot playerId={playerId} size="sm" />}
      <span>{color.label}</span>
    </div>
  );
}

PlayerLabel.propTypes = {
  playerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  showDot: PropTypes.bool,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

/**
 * Player turn chip with name
 */
export function PlayerTurnChip({ player, isActive = false, size = "md", className }) {
  const color = getPlayerColor(player?.id || 0);
  
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-2.5 py-1.5",
    lg: "text-base px-3 py-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-200",
        isActive && "shadow-lg",
        sizeClasses[size],
        className
      )}
      style={{ 
        backgroundColor: isActive ? color.bg : "rgba(15, 23, 42, 0.5)",
        color: isActive ? color.primary : "#94a3b8",
        border: `1px solid ${isActive ? color.border : "transparent"}`,
        boxShadow: isActive ? `0 0 12px ${color.glow}` : "none",
      }}
    >
      <PlayerDot playerId={player?.id || 0} size={size === "lg" ? "lg" : "md"} />
      <span>{player?.name || "Unknown"}</span>
    </div>
  );
}

PlayerTurnChip.propTypes = {
  player: PropTypes.object,
  isActive: PropTypes.bool,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

/**
 * Player card with color accent
 */
export function PlayerCard({ player, isSelected = false, onClick, children, className }) {
  const color = getPlayerColor(player?.id || 0);

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:translate-x-0.5",
        isSelected && "shadow-lg",
        className
      )}
      style={{
        backgroundColor: isSelected ? `${color.primary}10` : "rgba(15, 23, 42, 0.6)",
        border: `1px solid ${isSelected ? color.border : "transparent"}`,
      }}
      onClick={onClick}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: color.primary }}
      />
      
      <div className="pl-3">
        {children}
      </div>
    </div>
  );
}

PlayerCard.propTypes = {
  player: PropTypes.object,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default { PlayerDot, PlayerLabel, PlayerTurnChip, PlayerCard };

