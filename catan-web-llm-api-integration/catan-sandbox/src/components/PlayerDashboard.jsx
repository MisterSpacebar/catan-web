// src/components/PlayerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Users,
  Cube,
  Play,
  Pause,
  Crosshair,
  Path,
  House,
  Buildings,
  ArrowsLeftRight,
  MapPin,
  CreditCard,
  Eye,
  ArrowClockwise,
  SkipForward,
  Trophy,
  Robot,
  User,
  Book,
  ListChecks,
  Sparkle,
  Hammer,
  DiceOne,
  DiceTwo,
  DiceThree,
  DiceFour,
  DiceFive,
  DiceSix,
  Plus,
  Equals,
  SignOut,
} from "@phosphor-icons/react";
import { getPlayerColor } from "../lib/colors";
import { cn, resourceEmoji } from "../lib/utils";
import {
  PROVIDER_ICONS,
  PROVIDER_COLORS,
  WHITE_LOGO_PROVIDERS,
} from "../lib/providers";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Collapsible } from "./ui/Collapsible";
import {
  PlayerDot,
  PlayerLabel,
  PlayerTurnChip,
  PlayerCard,
} from "./ui/PlayerChip";
import { ResourceGrid, ResourceSummary } from "./ui/ResourceChip";
import { RankBadge, LeaderboardRow } from "./ui/RankBadge";
import { Button } from "./ui/Button";

// Model icons mapping (fallback for players without provider info)
const MODEL_ICONS = {
  human: User,
  ai: Robot,
  default: User,
};

// ------------------------------
// Strategy / Provider helpers
// ------------------------------
function friendlyProviderName(id) {
  if (!id) return "";
  if (id === "google") return "Google Gemini";
  if (id === "openai") return "OpenAI";
  if (id === "anthropic") return "Anthropic";
  if (id === "ollama") return "Ollama (Local)";
  return id;
}

function inferProviderId(player) {
  // Prefer explicit provider
  if (player?.provider) return player.provider;

  // Try to infer from providerName/providerModel strings
  const a = `${player?.providerName || ""}`.toLowerCase();
  const b = `${player?.providerModel || ""}`.toLowerCase();

  if (a.includes("ollama") || b.includes("llama") || b.includes("ollama"))
    return "ollama";
  if (a.includes("openai") || b.includes("gpt")) return "openai";
  if (a.includes("anthropic") || b.includes("claude")) return "anthropic";
  if (a.includes("gemini") || a.includes("google") || b.includes("gemini"))
    return "google";

  return null;
}

function humanizeAlgorithm(alg) {
  const key = `${alg || ""}`.toLowerCase().trim();
  if (!key || key === "none") return "None";
  if (key === "mcts" || key.includes("monte")) return "Monte Carlo Tree Search (MCTS)";
  if (key === "minimax" || key.includes("mini")) return "Minimax";
  if (key === "heuristic") return "Heuristic";
  return alg;
}

function getStrategy(player) {
  const mode = player?.algorithmMode || "llm_only"; // llm_only | algo_only | llm_plus_algo | none
  const algo = player?.algorithm || "none";

  const hasAlgo = mode === "algo_only" || mode === "llm_plus_algo";
  const hasLLM = mode === "llm_only" || mode === "llm_plus_algo";

  const providerId = inferProviderId(player);
  const providerModel = player?.providerModel || "";
  const providerName =
    player?.providerName ||
    (providerId ? friendlyProviderName(providerId) : "");

  const algoLabel = hasAlgo ? humanizeAlgorithm(algo) : "";
  const llmLabel = hasLLM
    ? [providerName, providerModel].filter(Boolean).join(" — ")
    : "";

  const modeLabel =
    mode === "algo_only"
      ? "Algorithm Only"
      : mode === "llm_plus_algo"
      ? "LLM + Algorithm"
      : mode === "llm_only"
      ? "LLM Only"
      : "Human";

  const subtitle =
    mode === "algo_only"
      ? `${modeLabel} — ${algoLabel || "Algorithm"}`
      : mode === "llm_plus_algo"
      ? `${modeLabel} — ${[providerModel || providerName, algoLabel]
          .filter(Boolean)
          .join(" + ")}`
      : mode === "llm_only"
      ? `${modeLabel} — ${providerModel || providerName || "LLM"}`
      : "Human Player";

  return {
    mode,
    modeLabel,
    hasAlgo,
    hasLLM,
    providerId,
    providerName,
    providerModel,
    llmLabel,
    algoLabel,
    subtitle,
  };
}

// Provider Logo component for the dashboard
function ProviderAvatar({ providerId, size = 16 }) {
  const IconComponent = PROVIDER_ICONS[providerId];
  const color = PROVIDER_COLORS[providerId] || "#666";
  const useWhiteLogo = WHITE_LOGO_PROVIDERS.includes(providerId);

  if (IconComponent) {
    // Use the full-color logo on top of the dashboard chip background,
    // except for brands we intentionally render as white.
    if (!useWhiteLogo && IconComponent.Color) {
      return <IconComponent.Color size={size} />;
    }
    return (
      <IconComponent
        size={size}
        style={{ color: useWhiteLogo ? "#ffffff" : color }}
      />
    );
  }

  // Fallback for unknown providers
  return (
    <div
      className="rounded flex items-center justify-center font-bold text-white text-[8px]"
      style={{
        width: size,
        height: size,
        background: color,
      }}
    >
      {providerId?.slice(0, 2).toUpperCase() || "AI"}
    </div>
  );
}

ProviderAvatar.propTypes = {
  providerId: PropTypes.string,
  size: PropTypes.number,
};

function ProviderMetaRow({ player, className }) {
  const strat = getStrategy(player);

  // IMPORTANT FIX:
  // If this player is Algorithm Only, DO NOT show OpenAI/Ollama provider rows.
  if (!strat.hasLLM) return null;

  const providerId = strat.providerId;
  const providerName = strat.providerName || providerId;
  const providerModel = strat.providerModel;

  if (!providerId && !providerName && !providerModel) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 xl:gap-3 mt-1 text-[12px] lg:text-[13px] xl:text-sm text-slate-300",
        className
      )}
    >
      <div className="w-7 h-7 xl:w-8 xl:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
        {providerId ? (
          <ProviderAvatar providerId={providerId} size={14} />
        ) : (
          <Robot size={14} className="text-indigo-300" />
        )}
      </div>

      <div className="min-w-0 leading-tight">
        <div className="font-semibold truncate">
          {providerName || "LLM"}
        </div>
        {providerModel && (
          <div className="text-[10px] lg:text-[11px] xl:text-xs text-slate-500 truncate">
            {providerModel}
          </div>
        )}
      </div>
    </div>
  );
}

ProviderMetaRow.propTypes = {
  player: PropTypes.object,
  className: PropTypes.string,
};

function AlgorithmMetaRow({ player, className }) {
  const strat = getStrategy(player);
  if (!strat.hasAlgo) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 xl:gap-3 mt-1 text-[12px] lg:text-[13px] xl:text-sm text-slate-300",
        className
      )}
    >
      <div className="w-7 h-7 xl:w-8 xl:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
        <Cube size={14} className="text-amber-300" weight="fill" />
      </div>

      <div className="min-w-0 leading-tight">
        <div className="font-semibold truncate">Algorithm</div>
        <div className="text-[10px] lg:text-[11px] xl:text-xs text-slate-500 truncate">
          {strat.algoLabel || "Enabled"}
        </div>
      </div>
    </div>
  );
}

AlgorithmMetaRow.propTypes = {
  player: PropTypes.object,
  className: PropTypes.string,
};

// Dice icon mapping for values 1-6
const DICE_ICONS = {
  1: DiceOne,
  2: DiceTwo,
  3: DiceThree,
  4: DiceFour,
  5: DiceFive,
  6: DiceSix,
};

/**
 * Dice display component using Phosphor dice icons
 */
function DiceDisplay({ value, isRolling, size = 40, className = "" }) {
  const DiceIcon = DICE_ICONS[value];

  if (!DiceIcon) {
    // Fallback for invalid values
    return (
      <div
        className={cn(
          "rounded-lg bg-gradient-to-br from-slate-100 to-slate-300 shadow-lg flex items-center justify-center",
          className
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-lg xl:text-xl font-bold text-slate-800">
          {value}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      animate={isRolling ? { rotate: [0, 15, -15, 10, -5, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("relative", className)}
    >
      <DiceIcon
        size={size}
        weight="fill"
        className="text-white drop-shadow-lg"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
        }}
      />
    </motion.div>
  );
}

DiceDisplay.propTypes = {
  value: PropTypes.number.isRequired,
  isRolling: PropTypes.bool,
  size: PropTypes.number,
  className: PropTypes.string,
};

/**
 * Player info row with model type and AI provider info
 */
function PlayerInfoRow({ player, isSelected, onSelect }) {
  const color = getPlayerColor(player.id);
  const strat = getStrategy(player);

  // "AI" if it has LLM or Algorithm
  const isAI = strat.hasLLM || strat.hasAlgo || player.model === "ai" || player.provider;

  const providerId = strat.providerId;
  const hasProviderIcon = strat.hasLLM && providerId && PROVIDER_ICONS[providerId];

  const ModelIcon = MODEL_ICONS[player.model] || MODEL_ICONS.default;

  const resources = player.resources || {};
  const totalResources = Object.values(resources).reduce((a, b) => a + b, 0);

  return (
    <PlayerCard
      player={player}
      isSelected={isSelected}
      onClick={() => onSelect?.(player)}
      className="mb-1.5 xl:mb-2"
    >
      <div className="p-2.5 xl:p-3 2xl:p-4">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 xl:gap-3 mb-2 xl:mb-3">
          <div className="flex items-center gap-2 xl:gap-3">
            {/* Model/Provider/Algorithm icon */}
            <div className="w-6 h-6 xl:w-8 xl:h-8 2xl:w-9 2xl:h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-700/40 to-slate-800/60 shadow-sm shadow-black/20 overflow-hidden">
              {hasProviderIcon ? (
                <ProviderAvatar providerId={providerId} size={14} />
              ) : strat.hasAlgo && !strat.hasLLM ? (
                <Cube size={12} weight="fill" className="text-amber-300" />
              ) : isAI ? (
                <Robot size={12} className="text-indigo-300" />
              ) : (
                <ModelIcon size={12} style={{ color: color.primary }} />
              )}
            </div>

            {/* Player name and label */}
            <div>
              <div className="flex items-center gap-1.5 xl:gap-2">
                <span className="text-[13px] lg:text-sm xl:text-base font-semibold text-slate-200">
                  {player.name}
                </span>
                <PlayerLabel playerId={player.id} size="sm" showDot={false} />
              </div>

              {/* IMPORTANT FIX: strategy-aware subtitle (prevents "openai" showing for algo-only) */}
              <div className="text-[11px] lg:text-xs xl:text-sm text-slate-500">
                {isAI ? (
                  <span className="flex items-center gap-1">
                    {strat.hasAlgo && !strat.hasLLM ? (
                      <Cube size={10} className="text-amber-300" weight="fill" />
                    ) : (
                      <Robot size={10} className="text-indigo-400" />
                    )}
                    <span
                      className={
                        strat.hasAlgo && !strat.hasLLM
                          ? "text-amber-300/90"
                          : "text-indigo-400/80"
                      }
                    >
                      {strat.subtitle}
                    </span>
                  </span>
                ) : (
                  <span className="capitalize">{player.model || "Human"} Player</span>
                )}
              </div>
            </div>
          </div>

          {/* VP badge - chip style */}
          <div
            className="px-2.5 py-1 xl:px-3 xl:py-1.5 rounded-xl text-[13px] lg:text-sm xl:text-base font-bold shadow-sm"
            style={{
              color: color.primary,
            }}
          >
            {player.victoryPoints || 0}
          </div>
        </div>

        {/* Resource summary */}
        <div className="flex items-center justify-between text-[12px] lg:text-[13px] xl:text-sm text-slate-400">
          <ResourceSummary resources={resources} />
          <span className="text-[11px] lg:text-xs xl:text-sm">
            {totalResources} cards
          </span>
        </div>

        {/* Expanded resource grid when selected */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 xl:mt-3 pt-2 xl:pt-3"
            style={{ borderTop: "1px solid rgba(51, 65, 85, 0.3)" }}
          >
            <ResourceGrid resources={resources} size="sm" />
          </motion.div>
        )}
      </div>
    </PlayerCard>
  );
}

PlayerInfoRow.propTypes = {
  player: PropTypes.object.isRequired,
  isSelected: PropTypes.bool,
  onSelect: PropTypes.func,
};

/**
 * Turn controls component
 */
function TurnControls({
  onRoll,
  onEndTurn,
  isPaused,
  onPause,
  onResume,
  onQuit,
}) {
  return (
    <div className="space-y-2">
      {/* Roll & End Turn row */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="warning"
          size="default"
          onClick={onRoll}
          className="flex-1"
        >
          <Cube size={14} weight="fill" />
          Roll
        </Button>

        <Button
          variant="primary"
          size="default"
          onClick={onEndTurn}
          className="flex-1"
        >
          <SkipForward size={14} weight="fill" />
          End Turn
        </Button>
      </div>

      {/* Pause/Resume & Quit row */}
      <div className="flex items-center gap-1.5">
        {isPaused ? (
          <Button
            variant="success"
            size="default"
            onClick={onResume}
            className="flex-1"
          >
            <Play size={14} weight="fill" />
            Resume
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="default"
            onClick={onPause}
            className="flex-1"
          >
            <Pause size={14} weight="fill" />
            Pause
          </Button>
        )}

        <Button
          variant="danger"
          size="default"
          onClick={onQuit}
          className="flex-1"
        >
          <SignOut size={14} weight="fill" />
          Quit
        </Button>
      </div>
    </div>
  );
}

TurnControls.propTypes = {
  onRoll: PropTypes.func.isRequired,
  onEndTurn: PropTypes.func.isRequired,
  isPaused: PropTypes.bool,
  onPause: PropTypes.func,
  onResume: PropTypes.func,
  onQuit: PropTypes.func,
};

/**
 * Build/interaction controls, reusing the main toolbar actions
 */
function ActionTools({ mode, onSetMode, onBuyDevCard, onShowDevCards }) {
  const tools = [
    { id: "select", label: "Select", icon: Crosshair, variant: "ghost" },
    { id: "build-road", label: "Road", icon: Path, variant: "primary" },
    { id: "build-town", label: "Town", icon: House, variant: "primary" },
    { id: "build-city", label: "City", icon: Buildings, variant: "primary" },
    { id: "trade", label: "Trade", icon: ArrowsLeftRight, variant: "secondary" },
    { id: "move-robber", label: "Robber", icon: MapPin, variant: "danger" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {tools.map((tool) => (
          <Button
            key={tool.id}
            variant={mode === tool.id ? tool.variant : "subtle"}
            size="sm"
            className="justify-start rounded-2xl px-3"
            onClick={() => onSetMode?.(tool.id)}
          >
            <tool.icon size={14} weight={mode === tool.id ? "fill" : "regular"} />
            <span className="text-[12px]">{tool.label}</span>
          </Button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 justify-start rounded-2xl"
          onClick={onBuyDevCard}
        >
          <CreditCard size={14} />
          <span className="text-[12px]">Buy Card</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 justify-start rounded-2xl"
          onClick={onShowDevCards}
        >
          <Eye size={14} />
          <span className="text-[12px]">View</span>
        </Button>
      </div>
    </div>
  );
}

ActionTools.propTypes = {
  mode: PropTypes.string,
  onSetMode: PropTypes.func,
  onBuyDevCard: PropTypes.func,
  onShowDevCards: PropTypes.func,
};

// Quick Rules data
const QUICK_RULES_STEPS = [
  { title: "Roll & Produce", desc: "Tiles with matching numbers produce resources." },
  { title: "Trade Smart", desc: "Use harbors or 4:1 bank trades." },
  { title: "Build & Expand", desc: "Roads → settlements → cities." },
  { title: "End Turn", desc: "Pass after building/trading." },
];

const BUILD_COSTS = [
  { name: "Road", cost: [{ resource: "wood", amount: 1 }, { resource: "brick", amount: 1 }] },
  { name: "Settlement", cost: [{ resource: "wood", amount: 1 }, { resource: "brick", amount: 1 }, { resource: "wheat", amount: 1 }, { resource: "sheep", amount: 1 }] },
  { name: "City", cost: [{ resource: "ore", amount: 3 }, { resource: "wheat", amount: 2 }] },
  { name: "Dev Card", cost: [{ resource: "ore", amount: 1 }, { resource: "wheat", amount: 1 }, { resource: "sheep", amount: 1 }] },
];

/**
 * Main Player Dashboard Component
 */
export function PlayerDashboard({
  players,
  currentPlayer,
  lastRoll,
  lastProduction,
  actionLog = [],
  onRollDice,
  onSelectPlayer,
  onEndTurn,
  isPaused,
  onPause,
  onResume,
  onQuit,
  mode,
  onSetMode,
  onBuyDevCard,
  onShowDevCards,
}) {
  const [selectedId, setSelectedId] = useState(
    typeof currentPlayer === "number" ? currentPlayer : currentPlayer?.id
  );
  const [isGameOverviewOpen, setIsGameOverviewOpen] = useState(true);
  const [isQuickRulesOpen, setIsQuickRulesOpen] = useState(true);

  useEffect(() => {
    const incomingId =
      typeof currentPlayer === "number" ? currentPlayer : currentPlayer?.id;
    if (incomingId !== undefined && incomingId !== selectedId) {
      setSelectedId(incomingId);
    }
  }, [currentPlayer, selectedId]);

  const currentPlayerId =
    typeof currentPlayer === "number" ? currentPlayer : currentPlayer?.id;

  // Calculate rankings
  const rankings = useMemo(() => {
    const sorted = [...players].sort(
      (a, b) => (b.victoryPoints || 0) - (a.victoryPoints || 0)
    );
    return sorted;
  }, [players]);

  // Get current turn player using the currentPlayer prop, not an isCurrentTurn flag
  const currentIndex = (() => {
    const byId = players.findIndex((p) => p.id === currentPlayerId);
    return byId !== -1 ? byId : 0;
  })();

  const currentTurnPlayer = players[currentIndex] || players[0];

  const normalizeTurnName = (player) => {
    const name = (player?.name || "").trim();
    if (!name)
      return `Player ${Number.isFinite(player?.id) ? player.id + 1 : ""}`.trim();

    // Keep custom names, but avoid showing "OpenAI"/"Ollama" as the *player name*
    const providerId = inferProviderId(player);
    const friendly = friendlyProviderName(providerId);

    if (
      name === player?.providerName ||
      name === player?.provider ||
      name === friendly ||
      name === player?.providerModel
    ) {
      return `Player ${Number.isFinite(player?.id) ? player.id + 1 : ""}`.trim();
    }
    return name;
  };

  // Get next turn player
  const nextIndex = (currentIndex + 1) % players.length;
  const nextTurnPlayer = players[nextIndex];

  // Build full queue of upcoming turns (excluding the active player)
  const turnQueue = useMemo(() => {
    if (!players?.length) return [];
    const activeIndex = currentIndex >= 0 ? currentIndex : 0;
    return Array.from({ length: players.length - 1 }, (_, offset) => {
      const idx = (activeIndex + offset + 1) % players.length;
      return players[idx];
    });
  }, [players, currentIndex]);

  // Get selected player object
  const selectedPlayer = players.find((p) => p.id === selectedId) || null;
  const handleSelectPlayer = (player) => {
    setSelectedId(player?.id);
    onSelectPlayer?.(player);
  };
  const isActivePlayer = (player) => player?.id === currentPlayerId;

  const roll1 = lastRoll?.die1 ?? lastRoll?.d1 ?? null;
  const roll2 = lastRoll?.die2 ?? lastRoll?.d2 ?? null;
  const rollSum =
    typeof roll1 === "number" && typeof roll2 === "number" ? roll1 + roll2 : null;

  return (
    <Card className="h-full flex flex-col overflow-hidden shadow-2xl shadow-black/35">
      <CardContent className="flex-1 overflow-y-auto space-y-2.5 xl:space-y-3 2xl:space-y-4 text-[13px] lg:text-sm xl:text-base leading-relaxed pr-1 min-h-0 pt-4 xl:pt-5 2xl:pt-6">
        {/* Game Overview Section */}
        <Collapsible
          title="Game Overview"
          icon={Users}
          defaultOpen={isGameOverviewOpen}
          onOpenChange={setIsGameOverviewOpen}
          variant="elevated"
          className="!bg-transparent !shadow-none !p-0"
          headerClassName="!bg-gradient-to-br !from-slate-800/50 !to-slate-900/60 !rounded-2xl !shadow-lg !shadow-black/20"
        >
          <div className="space-y-2.5 pt-2">
            {/* Player Information */}
            <Collapsible
              title="Player Information"
              icon={Users}
              badge={players.length}
              defaultOpen={true}
              variant="elevated"
            >
              <div className="space-y-1">
                {players.map((player) => (
                  <PlayerInfoRow
                    key={player.id}
                    player={player}
                    isSelected={
                      selectedPlayer?.id === player.id || isActivePlayer(player)
                    }
                    onSelect={handleSelectPlayer}
                  />
                ))}
              </div>
            </Collapsible>

            {/* Turn Information */}
            <Collapsible
              title="Turn Information"
              icon={ArrowClockwise}
              defaultOpen={true}
              variant="elevated"
            >
              <div className="space-y-2.5 xl:space-y-3">
                {/* Current Turn */}
                <div className="p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                  <div className="text-[11px] lg:text-xs xl:text-sm font-semibold tracking-wide text-slate-500 uppercase mb-2 xl:mb-3">
                    Current Turn
                  </div>
                  <div className="flex items-center gap-2 xl:gap-3">
                    <PlayerTurnChip
                      player={{
                        ...currentTurnPlayer,
                        name: normalizeTurnName(currentTurnPlayer),
                      }}
                      isActive={true}
                      size="md"
                      showName={false}
                    />
                    <PlayerLabel playerId={currentTurnPlayer?.id} size="sm" />
                    <div className="flex-1" />
                  </div>

                  {/* IMPORTANT FIX: show strategy rows properly */}
                  <ProviderMetaRow player={currentTurnPlayer} className="mt-2" />
                  <AlgorithmMetaRow player={currentTurnPlayer} className="mt-2" />
                </div>

                {/* Next Turn */}
                <div className="p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                  <div className="text-[11px] lg:text-xs xl:text-sm font-semibold tracking-wide text-slate-500 uppercase mb-2 xl:mb-3">
                    Next Turn
                  </div>
                  <div className="flex items-center gap-2 xl:gap-3">
                    <PlayerTurnChip
                      player={{ ...nextTurnPlayer, name: normalizeTurnName(nextTurnPlayer) }}
                      isActive={false}
                      size="md"
                      showName={false}
                    />
                    <PlayerLabel playerId={nextTurnPlayer?.id} size="sm" />
                    <div className="flex-1" />
                  </div>

                  <ProviderMetaRow player={nextTurnPlayer} className="mt-2" />
                  <AlgorithmMetaRow player={nextTurnPlayer} className="mt-2" />
                </div>

                {/* Turn Queue */}
                {turnQueue.length > 0 && (
                  <div className="p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                    <div className="text-[11px] lg:text-xs xl:text-sm font-semibold tracking-wide text-slate-500 uppercase mb-2 xl:mb-3">
                      Upcoming Order
                    </div>
                    <div className="flex flex-wrap gap-2 xl:gap-3">
                      {turnQueue.map((player) => (
                        <div key={player.id} className="flex items-start gap-2 xl:gap-3">
                          <PlayerTurnChip
                            player={{ ...player, name: normalizeTurnName(player) }}
                            isActive={false}
                            size="sm"
                            showName={false}
                            className="bg-slate-900/60"
                          />
                          <div className="min-w-0">
                            <PlayerLabel playerId={player?.id} size="sm" />
                            <ProviderMetaRow player={player} className="mt-1" />
                            <AlgorithmMetaRow player={player} className="mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dice Display */}
                {lastRoll && (
                  <div className="p-2.5 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                    <div className="text-[10px] lg:text-[11px] xl:text-xs font-semibold tracking-wide text-slate-500 uppercase mb-2 xl:mb-3">
                      Last Roll
                    </div>
                    {roll1 != null && roll2 != null ? (
                      <div className="flex items-center justify-center gap-2 xl:gap-3">
                        <DiceDisplay value={roll1} size={28} className="xl:scale-125 2xl:scale-150" />
                        <Plus size={14} weight="bold" className="text-slate-500 xl:scale-125" />
                        <DiceDisplay value={roll2} size={28} className="xl:scale-125 2xl:scale-150" />
                        <Equals size={14} weight="bold" className="text-slate-500 xl:scale-125" />
                        <span className="text-lg xl:text-xl 2xl:text-2xl font-bold text-slate-200">
                          {rollSum}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 text-center">No roll yet</div>
                    )}
                  </div>
                )}

                {/* Controls */}
                <div className="p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20 space-y-3 xl:space-y-4">
                  <div className="text-[11px] lg:text-xs xl:text-sm font-semibold tracking-wide text-slate-500 uppercase">
                    Controls
                  </div>
                  <TurnControls
                    onRoll={onRollDice}
                    onEndTurn={onEndTurn || (() => {})}
                    isPaused={isPaused}
                    onPause={onPause}
                    onResume={onResume}
                    onQuit={onQuit}
                  />
                  {/* BUILD & ACTIONS - commented out for agent-only games
                  <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
                  <div className="text-[11px] lg:text-xs xl:text-sm font-semibold tracking-wide text-slate-500 uppercase">Build & Actions</div>
                  <ActionTools
                    mode={mode}
                    onSetMode={onSetMode}
                    onBuyDevCard={onBuyDevCard}
                    onShowDevCards={onShowDevCards}
                  />
                  */}
                </div>
              </div>
            </Collapsible>

            {/* Leaderboard */}
            <Collapsible title="Leaderboard" icon={Trophy} defaultOpen={true} variant="elevated">
              <div className="space-y-1.5">
                {rankings.map((player, idx) => (
                  <LeaderboardRow key={player.id} player={player} rank={idx + 1} compact={true} />
                ))}
              </div>
            </Collapsible>

            {/* Last Production */}
            {lastProduction && Object.keys(lastProduction).length > 0 && (
              <Collapsible title="Last Production" icon={Cube} defaultOpen={false} variant="elevated">
                <div className="space-y-2">
                  {Object.entries(lastProduction).map(([playerId, resources]) => {
                    const player = players.find((p) => String(p.id) === String(playerId));
                    const color = getPlayerColor(playerId);

                    return (
                      <div
                        key={playerId}
                        className="flex items-center gap-2 p-2 rounded-lg"
                        style={{ backgroundColor: `${color.primary}08` }}
                      >
                        <PlayerDot playerId={playerId} size="sm" />
                        <span className="text-xs text-slate-400 flex-1">
                          {player?.name || `P${playerId}`}
                        </span>
                        <div className="flex gap-1">
                          {Object.entries(resources).map(([resource, count]) => (
                            <span key={resource} className="text-sm">
                              {resourceEmoji(resource)} {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Collapsible>
            )}

            {/* Action Log */}
            <Collapsible title="Action Log" icon={Eye} defaultOpen={false} variant="elevated">
              <div className="space-y-1.5 xl:space-y-2 max-h-60 xl:max-h-80 overflow-y-auto pr-1">
                {actionLog.length === 0 && (
                  <div className="text-xs lg:text-sm text-slate-500">No messages yet.</div>
                )}

                {[...actionLog].reverse().map((entry, idx) => {
                  const logColor = getPlayerColor(entry.playerId ?? 0);
                  const p = players.find((pp) => pp.id === entry.playerId);
                  const strat = getStrategy(p);

                  // IMPORTANT FIX: if the player is algorithm-only, show Algorithm badge instead of provider
                  const showProviderChip = !!entry.provider && strat.hasLLM;
                  const showAlgoChip = strat.hasAlgo;

                  return (
                    <div
                      key={entry.id || idx}
                      className="relative p-2.5 xl:p-3 pl-4 xl:pl-5 rounded-2xl text-xs lg:text-[13px] xl:text-sm text-slate-200 transition-all duration-200"
                      style={{
                        background: `linear-gradient(135deg, ${logColor.primary}20, ${logColor.primary}10)`,
                        border: `1px solid ${logColor.primary}30`,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.04)`,
                      }}
                    >
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                        style={{
                          background: `linear-gradient(180deg, ${logColor.primary}, ${logColor.primary}80)`,
                        }}
                      />

                      {/* Header row */}
                      <div className="flex items-center gap-2 xl:gap-3 mb-1.5 xl:mb-2">
                        {entry.playerId !== undefined && (
                          <PlayerLabel playerId={entry.playerId} size="sm" />
                        )}

                        {/* Strategy chips */}
                        {showAlgoChip && !strat.hasLLM && (
                          <div className="flex items-center gap-1.5 xl:gap-2 text-[11px] lg:text-xs xl:text-sm text-slate-400">
                            <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
                              <Cube size={12} className="text-amber-300" weight="fill" />
                            </div>
                            <div className="leading-tight min-w-0">
                              <div className="text-[10px] lg:text-[11px] xl:text-xs text-slate-300 truncate">
                                Algorithm
                              </div>
                              <div className="text-[9px] lg:text-[10px] xl:text-[11px] text-slate-500 truncate -mt-0.5">
                                {strat.algoLabel || "Enabled"}
                              </div>
                            </div>
                          </div>
                        )}

                        {showProviderChip && (
                          <div className="flex items-center gap-1.5 xl:gap-2 text-[11px] lg:text-xs xl:text-sm text-slate-400">
                            <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
                              <ProviderAvatar providerId={entry.provider} size={12} />
                            </div>
                            <div className="leading-tight min-w-0">
                              <div className="text-[10px] lg:text-[11px] xl:text-xs text-slate-300 truncate">
                                {entry.providerName ||
                                  friendlyProviderName(entry.provider)}
                              </div>
                              {entry.providerModel && (
                                <div className="text-[9px] lg:text-[10px] xl:text-[11px] text-slate-500 truncate -mt-0.5">
                                  {entry.providerModel}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* If LLM+Algo, we can show both (optional) */}
                        {strat.hasLLM && strat.hasAlgo && (
                          <div className="flex items-center gap-1.5 xl:gap-2 text-[11px] lg:text-xs xl:text-sm text-slate-400">
                            <div className="w-5 h-5 xl:w-6 xl:h-6 rounded-md bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
                              <Cube size={12} className="text-amber-300" weight="fill" />
                            </div>
                            <div className="leading-tight min-w-0">
                              <div className="text-[10px] lg:text-[11px] xl:text-xs text-slate-300 truncate">
                                {strat.modeLabel}
                              </div>
                              <div className="text-[9px] lg:text-[10px] xl:text-[11px] text-slate-500 truncate -mt-0.5">
                                {strat.algoLabel}
                              </div>
                            </div>
                          </div>
                        )}

                        <span className="flex-1" />

                        <span className="text-[10px] lg:text-[11px] xl:text-xs text-slate-500 whitespace-nowrap">
                          {entry.turn ? `T${entry.turn} • ` : ""}
                          {new Date(entry.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>

                      {/* Message */}
                      <div className="text-slate-300 leading-snug">{entry.message}</div>
                    </div>
                  );
                })}
              </div>
            </Collapsible>
          </div>
        </Collapsible>

        {/* Quick Rules Section */}
        <Collapsible
          title="Quick Rules"
          icon={Book}
          defaultOpen={isQuickRulesOpen}
          onOpenChange={setIsQuickRulesOpen}
          variant="elevated"
          className="!bg-transparent !shadow-none !p-0"
          headerClassName="!bg-gradient-to-br !from-slate-800/50 !to-slate-900/60 !rounded-2xl !shadow-lg !shadow-black/20"
        >
          <div className="space-y-2.5 xl:space-y-3 pt-2">
            {/* How to play */}
            <Collapsible title="How to Play" icon={ListChecks} defaultOpen={true} variant="elevated">
              <div className="space-y-2 xl:space-y-3">
                {QUICK_RULES_STEPS.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 xl:gap-4 p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20"
                  >
                    <span className="flex-shrink-0 w-6 h-6 xl:w-8 xl:h-8 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-300 text-[13px] lg:text-sm xl:text-base font-bold flex items-center justify-center shadow-inner shadow-emerald-500/10">
                      {idx + 1})
                    </span>
                    <div>
                      <div className="text-[13px] lg:text-sm xl:text-base text-slate-100 font-semibold">
                        {step.title}
                      </div>
                      <div className="text-[12px] lg:text-[13px] xl:text-sm text-slate-400 mt-0.5 leading-relaxed">
                        {step.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>

            {/* Resources */}
            <Collapsible title="Resources" icon={Sparkle} defaultOpen={true} variant="elevated">
              <div className="grid grid-cols-2 gap-1.5 xl:gap-2">
                {["wood", "brick", "wheat", "sheep", "ore"].map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 xl:gap-3 px-3 xl:px-4 py-2.5 xl:py-3 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/70 shadow-md shadow-black/20 hover:from-slate-800/60 hover:to-slate-900/80 transition-all duration-150"
                  >
                    <span className="text-base xl:text-lg 2xl:text-xl drop-shadow-sm">
                      {resourceEmoji(key)}
                    </span>
                    <span className="text-[13px] lg:text-sm xl:text-base text-slate-200 capitalize font-medium">
                      {key}
                    </span>
                  </div>
                ))}
              </div>
            </Collapsible>

            {/* Build costs */}
            <Collapsible title="Build Costs" icon={Hammer} defaultOpen={true} variant="elevated">
              <div className="space-y-1.5 xl:space-y-2">
                {BUILD_COSTS.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between p-3 xl:p-4 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20"
                  >
                    <span className="text-[13px] lg:text-sm xl:text-base font-semibold text-slate-100">
                      {row.name}
                    </span>
                    <div className="flex items-center gap-1 xl:gap-1.5">
                      {row.cost.map((c, i) => (
                        <div
                          key={`${row.name}-${c.resource}-${i}`}
                          className="flex items-center gap-1 xl:gap-1.5 px-2 xl:px-3 py-1 xl:py-1.5 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-800/80 shadow-sm shadow-black/20"
                        >
                          <span className="text-[13px] xl:text-base drop-shadow-sm">
                            {resourceEmoji(c.resource)}
                          </span>
                          <span className="text-[11px] lg:text-xs xl:text-sm font-semibold text-slate-200">
                            {c.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

PlayerDashboard.propTypes = {
  players: PropTypes.array.isRequired,
  currentPlayer: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  lastRoll: PropTypes.object,
  lastProduction: PropTypes.object,
  actionLog: PropTypes.array,
  onRollDice: PropTypes.func.isRequired,
  onSelectPlayer: PropTypes.func.isRequired,
  onEndTurn: PropTypes.func,
  isPaused: PropTypes.bool,
  onPause: PropTypes.func,
  onResume: PropTypes.func,
  onQuit: PropTypes.func,
  mode: PropTypes.string,
  onSetMode: PropTypes.func,
  onBuyDevCard: PropTypes.func,
  onShowDevCards: PropTypes.func,
};

export default PlayerDashboard;
