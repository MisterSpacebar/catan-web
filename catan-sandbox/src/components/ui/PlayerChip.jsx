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
    md: "text-[11px] px-2 py-0.5",
    lg: "text-[13px] px-2.5 py-1",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold shadow-sm",
        sizeClasses[size],
        className
      )}
      style={{ 
        background: `linear-gradient(135deg, ${color.primary}25, ${color.primary}15)`,
        color: color.primary,
        boxShadow: `0 2px 6px ${color.primary}15`,
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
    sm: "text-[11px] px-2 py-1",
    md: "text-[13px] px-2.5 py-1.5",
    lg: "text-[14px] px-3 py-2",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl font-medium transition-all duration-200",
        sizeClasses[size],
        className
      )}
      style={{ 
        background: isActive 
          ? `linear-gradient(135deg, ${color.primary}20, ${color.primary}10)` 
          : "linear-gradient(135deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.4))",
        color: isActive ? color.primary : "#94a3b8",
        boxShadow: isActive 
          ? `0 4px 16px ${color.glow}, inset 0 1px 0 rgba(255,255,255,0.05)` 
          : "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.02)",
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
        "relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:-translate-y-0.5",
        className
      )}
      style={{
        background: isSelected 
          ? `linear-gradient(135deg, ${color.primary}12, ${color.primary}06)` 
          : "linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(15, 23, 42, 0.6))",
        boxShadow: isSelected 
          ? `0 8px 24px ${color.glow}, 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)` 
          : "0 8px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
      onClick={onClick}
    >
      {/* Left accent bar with gradient */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
        style={{ 
          background: `linear-gradient(180deg, ${color.primary}, ${color.primary}80)`,
          boxShadow: isSelected ? `0 0 8px ${color.glow}` : "none",
        }}
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