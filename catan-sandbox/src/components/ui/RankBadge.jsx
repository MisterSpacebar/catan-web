import React from "react";
import PropTypes from "prop-types";
import { Crown, Medal, Trophy } from "@phosphor-icons/react";
import { getRankColor, getPlayerColor } from "../../lib/colors";
import { cn } from "../../lib/utils";

/**
 * Rank badge for leaderboard positions
 */
export function RankBadge({ rank, size = "md", className }) {
  const rankColor = getRankColor(rank);
  
  const sizeClasses = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-[11px]",
    lg: "w-8 h-8 text-[13px]",
  };

  const iconSize = size === "sm" ? 10 : size === "md" ? 12 : 16;

  const renderIcon = () => {
    if (rank === 1) return <Crown size={iconSize} weight="fill" />;
    if (rank === 2) return <Medal size={iconSize} weight="fill" />;
    if (rank === 3) return <Trophy size={iconSize} weight="fill" />;
    return rank;
  };

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center font-bold flex-shrink-0 shadow-lg",
        sizeClasses[size],
        className
      )}
      style={{
        background: rankColor?.gradient || "linear-gradient(135deg, #334155, #1e293b)",
        color: rank <= 3 ? "white" : "#64748b",
        boxShadow: rank <= 3 
          ? `0 4px 12px ${rankColor?.glow || 'rgba(0,0,0,0.2)'}` 
          : "0 4px 12px rgba(0,0,0,0.2)",
      }}
    >
      {renderIcon()}
    </div>
  );
}

RankBadge.propTypes = {
  rank: PropTypes.number.isRequired,
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

/**
 * Leaderboard row component
 */
import { PlayerLabel } from "./PlayerChip";

export function LeaderboardRow({ player, rank, showStats = false, compact = false, className }) {
  const playerColor = getPlayerColor(player?.id || 0);
  const rankColor = getRankColor(rank);
  const hasRankStyle = rank <= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl transition-all duration-200",
        "hover:translate-x-0.5",
        compact ? "p-2" : "p-2.5",
        className
      )}
      style={{
        background: hasRankStyle 
          ? `linear-gradient(135deg, ${rankColor?.bg || 'rgba(15,23,42,0.4)'}, rgba(15,23,42,0.5))` 
          : "linear-gradient(135deg, rgba(30,41,59,0.4), rgba(15,23,42,0.5))",
        boxShadow: hasRankStyle 
          ? `0 4px 16px ${rankColor?.glow || 'rgba(0,0,0,0.15)'}, inset 0 1px 0 rgba(255,255,255,0.03)` 
          : "0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Rank */}
      <RankBadge rank={rank} size={compact ? "sm" : "md"} />

      {/* Player info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
          style={{ 
            backgroundColor: playerColor.primary,
            boxShadow: `0 0 6px ${playerColor.primary}50`,
          }}
        />
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "font-medium text-slate-200 truncate",
            compact ? "text-[11px]" : "text-[13px]"
          )}>
            {player?.name || "Unknown"}
          </span>
          <PlayerLabel playerId={player?.id || 0} size="sm" />
        </div>
      </div>

      {/* VP */}
      <div className="text-right flex-shrink-0">
        <div className={cn(
          "font-bold text-slate-200",
          compact ? "text-[13px]" : "text-[14px]"
        )}>
          {player?.victoryPoints || 0}
        </div>
        <div className="text-[9px] text-slate-500">VP</div>
      </div>
    </div>
  );
}

LeaderboardRow.propTypes = {
  player: PropTypes.object.isRequired,
  rank: PropTypes.number.isRequired,
  showStats: PropTypes.bool,
  compact: PropTypes.bool,
  className: PropTypes.string,
};

export default { RankBadge, LeaderboardRow };

