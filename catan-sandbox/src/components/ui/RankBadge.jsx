import React from "react";
import PropTypes from "prop-types";
import { Crown, Medal, Trophy } from "@phosphor-icons/react";
import { getRankColor, getPlayerColor } from "../../lib/colors";
import { cn } from "../../lib/utils";
import {
  PROVIDER_ICONS,
  PROVIDER_COLORS,
  WHITE_LOGO_PROVIDERS,
} from "../../lib/providers";
import { Robot, User } from "@phosphor-icons/react";

/**
 * Rank badge for leaderboard positions - icon only with fill colors
 * Gold crown for #1, Silver trophy for #2, Bronze medal for #3
 */
export function RankBadge({ rank, size = "md", className }) {
  const rankColor = getRankColor(rank);
  
  const iconSizes = {
    sm: 14,
    md: 18,
    lg: 22,
  };

  const iconSize = iconSizes[size] || iconSizes.md;

  // Only show icons for ranks 1-3
  if (rank > 3) {
    return (
      <div
        className={cn(
          "flex items-center justify-center font-bold text-slate-500 flex-shrink-0",
          size === "sm" && "w-5 h-5 text-[11px]",
          size === "md" && "w-6 h-6 text-[12px]",
          size === "lg" && "w-8 h-8 text-[14px]",
          className
        )}
      >
        {rank}
      </div>
    );
  }

  const renderIcon = () => {
    const iconColor = rankColor?.icon || "#64748b";
    const dropShadow = rankColor?.glow ? `drop-shadow(0 2px 4px ${rankColor.glow})` : "none";
    
    if (rank === 1) {
      return (
        <Crown 
          size={iconSize} 
          weight="fill" 
          style={{ color: iconColor, filter: dropShadow }}
        />
      );
    }
    if (rank === 2) {
      return (
        <Trophy 
          size={iconSize} 
          weight="fill" 
          style={{ color: iconColor, filter: dropShadow }}
        />
      );
    }
    if (rank === 3) {
      return (
        <Medal 
          size={iconSize} 
          weight="fill" 
          style={{ color: iconColor, filter: dropShadow }}
        />
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        size === "sm" && "w-5 h-5",
        size === "md" && "w-6 h-6",
        size === "lg" && "w-8 h-8",
        className
      )}
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

function ProviderMeta({ player }) {
  const providerId = player?.provider;
  if (!providerId) return null;
  const IconComponent = PROVIDER_ICONS[providerId];
  const color = PROVIDER_COLORS[providerId] || "#94a3b8";
  const useWhite = WHITE_LOGO_PROVIDERS.includes(providerId);
  const isHuman = player?.model === "human" || player?.type === "human";

  const renderIcon = () => {
    if (isHuman) return <User size={12} className="text-slate-400" />;
    if (IconComponent?.Color && !useWhite) return <IconComponent.Color size={14} />;
    if (IconComponent) return <IconComponent size={14} style={{ color: useWhite ? "#ffffff" : color }} />;
    return <Robot size={12} className="text-indigo-300" />;
  };

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
      <div
        className="w-6 h-6 rounded-md bg-slate-900/70 flex items-center justify-center flex-shrink-0"
        style={{ border: `1px solid ${color}30` }}
      >
        {renderIcon()}
      </div>
      <div className="leading-tight min-w-0">
        <div className="text-[11px] text-slate-200 truncate">
          {player?.providerName || providerId || (isHuman ? "Human" : "AI")}
        </div>
        {player?.providerModel && (
          <div className="text-[10px] text-slate-500 truncate">{player.providerModel}</div>
        )}
      </div>
    </div>
  );
}

ProviderMeta.propTypes = {
  player: PropTypes.object,
};

/**
 * Calculate ranks with tie handling
 * Players with the same VP share the same rank
 * @param {Array} players - Array of player objects with victoryPoints
 * @returns {Map} - Map of playerId to rank
 */
export function calculateRanksWithTies(players) {
  if (!players?.length) return new Map();
  
  // Sort players by VP descending
  const sorted = [...players].sort((a, b) => 
    (b.victoryPoints || 0) - (a.victoryPoints || 0)
  );
  
  const rankMap = new Map();
  let currentRank = 1;
  let previousVP = null;
  
  sorted.forEach((player, index) => {
    const vp = player.victoryPoints || 0;
    
    if (previousVP !== null && vp < previousVP) {
      // VP is lower, so rank increases to position + 1
      currentRank = index + 1;
    }
    
    rankMap.set(player.id, currentRank);
    previousVP = vp;
  });
  
  return rankMap;
}

export function LeaderboardRow({ player, rank, showStats = false, compact = false, className }) {
  const playerColor = getPlayerColor(player?.id || 0);
  const rankColor = getRankColor(rank);
  const hasRankStyle = rank <= 3;
  const providerLabel = player?.providerName || player?.provider || "";
  const isDefaultName = /^player\s*\d+/i.test(player?.name || "");
  const displayName = providerLabel
    ? "" // hide duplicate text when provider chip is shown
    : player?.name || (isDefaultName ? "" : `Player ${Number.isFinite(player?.id) ? player.id + 1 : ""}`.trim());

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl transition-all duration-200",
        "hover:translate-x-0.5",
        compact ? "p-2" : "p-2.5 xl:p-3",
        className
      )}
      style={{
        background: hasRankStyle 
          ? `linear-gradient(135deg, ${rankColor?.bg || 'rgba(15,23,42,0.4)'}, rgba(15,23,42,0.5))` 
          : "linear-gradient(135deg, rgba(30,41,59,0.4), rgba(15,23,42,0.5))",
        borderLeft: hasRankStyle ? `3px solid ${rankColor?.icon || 'transparent'}` : "3px solid transparent",
        boxShadow: hasRankStyle 
          ? `0 4px 16px ${rankColor?.glow || 'rgba(0,0,0,0.15)'}, inset 0 1px 0 rgba(255,255,255,0.03)` 
          : "0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      {/* Rank - icon only for top 3 */}
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
            {displayName || " "}
          </span>
          <PlayerLabel playerId={player?.id || 0} size="sm" />
        </div>
        <ProviderMeta player={player} />
      </div>

      {/* VP */}
      <div className="text-right flex-shrink-0">
        <div 
          className={cn(
            "font-bold",
            compact ? "text-[13px]" : "text-[14px]"
          )}
          style={{
            color: hasRankStyle ? rankColor?.text || "#e2e8f0" : "#e2e8f0"
          }}
        >
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

export default { RankBadge, LeaderboardRow, calculateRanksWithTies };

