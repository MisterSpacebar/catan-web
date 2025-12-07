import React from "react";
import PropTypes from "prop-types";
import { Crown, Medal, Trophy, Robot, User, Cpu } from "@phosphor-icons/react";
import { getRankColor, getPlayerColor } from "../../lib/colors";
import { cn } from "../../lib/utils";
import {
  PROVIDER_ICONS,
  PROVIDER_COLORS,
  WHITE_LOGO_PROVIDERS,
} from "../../lib/providers";

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
        background:
          rankColor?.gradient || "linear-gradient(135deg, #334155, #1e293b)",
        color: rank <= 3 ? "white" : "#64748b",
        boxShadow:
          rank <= 3
            ? `0 4px 12px ${rankColor?.glow || "rgba(0,0,0,0.2)"}`
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

// ------------------------------
// Helpers
// ------------------------------
function normalizeAlgorithmName(algo) {
  const a = (algo || "").toLowerCase().trim();
  if (!a || a === "none") return "";
  if (a === "mcts" || a.includes("monte")) return "Monte Carlo Tree Search (MCTS)";
  if (a.includes("minmax") || a.includes("minimax")) return "Minimax";
  if (a.includes("heur")) return "Heuristic";
  return algo;
}

// If provider is just a default placeholder (common culprit)
function isDefaultProviderPlaceholder(player) {
  const p = (player?.provider || "").toLowerCase();
  const m = (player?.providerModel || "").toLowerCase();
  // Treat this combo as “not truly selected” when an algorithm exists.
  return p === "openai" && (m === "gpt-4o" || m === "gpt4o" || m.includes("gpt-4o"));
}

function inferStrategyMode(player) {
  const explicit = player?.algorithmMode;
  if (explicit) return explicit;

  const hasAlgo = !!normalizeAlgorithmName(player?.algorithm);
  const hasProvider = !!player?.provider || !!player?.providerModel || player?.model === "ai";

  // If algorithm exists but provider looks like a default placeholder, treat as algo_only
  if (hasAlgo && isDefaultProviderPlaceholder(player)) return "algo_only";

  if (hasAlgo && hasProvider) return "llm_plus_algo";
  if (hasAlgo && !hasProvider) return "algo_only";
  if (!hasAlgo && hasProvider) return "llm_only";
  return "none";
}

function getDisplayName(player) {
  const id = Number.isFinite(player?.id) ? player.id + 1 : "";
  const raw = (player?.name || "").trim();
  const providerish = new Set(
    [player?.providerName, player?.provider, player?.providerModel]
      .filter(Boolean)
      .map((x) => String(x).trim().toLowerCase())
  );

  // If name is empty OR basically equals provider/model text, show Player #
  if (!raw) return `Player ${id}`.trim();
  if (providerish.has(raw.toLowerCase())) return `Player ${id}`.trim();
  if (/^player\s*\d+/i.test(raw)) return raw; // already ok

  return raw;
}

// ------------------------------
// Provider/Algorithm Meta Chip
// ------------------------------
function ProviderMeta({ player }) {
  const mode = inferStrategyMode(player);
  const algoName = normalizeAlgorithmName(player?.algorithm);

  const providerId = player?.provider ? String(player.provider).toLowerCase() : "";
  const IconComponent = PROVIDER_ICONS[providerId];
  const color = PROVIDER_COLORS[providerId] || "#94a3b8";
  const useWhite = WHITE_LOGO_PROVIDERS.includes(providerId);
  const isHuman = player?.model === "human" || player?.type === "human";

  // ALGORITHM ONLY
  if (mode === "algo_only") {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
        <div
          className="w-6 h-6 rounded-md bg-slate-900/70 flex items-center justify-center flex-shrink-0"
          style={{ border: "1px solid rgba(148,163,184,0.25)" }}
        >
          <Cpu size={14} className="text-slate-300" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[11px] text-slate-200 truncate">Algorithm</div>
          <div className="text-[10px] text-slate-500 truncate">
            {algoName || "—"}
          </div>
        </div>
      </div>
    );
  }

  // LLM ONLY or LLM + ALGO
  if (!providerId) {
    if (isHuman) return null;
    // Fallback when provider missing but we consider AI
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 min-w-0">
        <div
          className="w-6 h-6 rounded-md bg-slate-900/70 flex items-center justify-center flex-shrink-0"
          style={{ border: "1px solid rgba(99,102,241,0.25)" }}
        >
          <Robot size={14} className="text-indigo-300" />
        </div>
        <div className="leading-tight min-w-0">
          <div className="text-[11px] text-slate-200 truncate">AI</div>
          {mode === "llm_plus_algo" && algoName && (
            <div className="text-[10px] text-slate-500 truncate">{`+ ${algoName}`}</div>
          )}
        </div>
      </div>
    );
  }

  const renderIcon = () => {
    if (isHuman) return <User size={12} className="text-slate-400" />;
    if (IconComponent?.Color && !useWhite) return <IconComponent.Color size={14} />;
    if (IconComponent)
      return <IconComponent size={14} style={{ color: useWhite ? "#ffffff" : color }} />;
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
        <div className="text-[10px] text-slate-500 truncate">
          {player?.providerModel || ""}
          {mode === "llm_plus_algo" && algoName ? ` + ${algoName}` : ""}
        </div>
      </div>
    </div>
  );
}

ProviderMeta.propTypes = {
  player: PropTypes.object,
};

export function LeaderboardRow({
  player,
  rank,
  showStats = false,
  compact = false,
  className,
}) {
  const playerColor = getPlayerColor(player?.id || 0);
  const rankColor = getRankColor(rank);
  const hasRankStyle = rank <= 3;

  const displayName = getDisplayName(player);

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
          ? `linear-gradient(135deg, ${rankColor?.bg || "rgba(15,23,42,0.4)"}, rgba(15,23,42,0.5))`
          : "linear-gradient(135deg, rgba(30,41,59,0.4), rgba(15,23,42,0.5))",
        boxShadow: hasRankStyle
          ? `0 4px 16px ${rankColor?.glow || "rgba(0,0,0,0.15)"}, inset 0 1px 0 rgba(255,255,255,0.03)`
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
          <span
            className={cn(
              "font-medium text-slate-200 truncate",
              compact ? "text-[11px]" : "text-[13px]"
            )}
          >
            {displayName}
          </span>
          <PlayerLabel playerId={player?.id || 0} size="sm" />
        </div>

        {/* Strategy/Provider chip */}
        <ProviderMeta player={player} />
      </div>

      {/* VP */}
      <div className="text-right flex-shrink-0">
        <div
          className={cn(
            "font-bold text-slate-200",
            compact ? "text-[13px]" : "text-[14px]"
          )}
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

export default { RankBadge, LeaderboardRow };
