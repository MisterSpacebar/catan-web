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
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm",
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
        "rounded-md flex items-center justify-center font-bold flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{
        background: rankColor?.gradient || "linear-gradient(135deg, #334155, #1e293b)",
        color: rank <= 3 ? "white" : "#64748b",
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
export function LeaderboardRow({ player, rank, showStats = false, compact = false, className }) {
  const playerColor = getPlayerColor(player?.id || 0);
  const rankColor = getRankColor(rank);
  const hasRankStyle = rank <= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg transition-all duration-200",
        "hover:translate-x-0.5",
        compact ? "p-2" : "p-2.5",
        className
      )}
      style={{
        background: hasRankStyle ? rankColor?.bg : "rgba(15, 23, 42, 0.4)",
        border: hasRankStyle ? `1px solid ${rankColor?.border}` : "1px solid transparent",
      }}
    >
      {/* Rank */}
      <RankBadge rank={rank} size={compact ? "sm" : "md"} />

      {/* Player info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: playerColor.primary }}
        />
        <span className={cn(
          "font-medium text-slate-200 truncate",
          compact ? "text-xs" : "text-sm"
        )}>
          {player?.name || "Unknown"}
        </span>
      </div>

      {/* VP */}
      <div className="text-right flex-shrink-0">
        <div className={cn(
          "font-bold text-slate-200",
          compact ? "text-sm" : "text-base"
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

