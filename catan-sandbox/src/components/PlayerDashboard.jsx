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
import { PROVIDER_ICONS, PROVIDER_COLORS, WHITE_LOGO_PROVIDERS } from "../lib/providers";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Collapsible } from "./ui/Collapsible";
import { PlayerDot, PlayerLabel, PlayerTurnChip, PlayerCard } from "./ui/PlayerChip";
import { ResourceGrid, ResourceSummary } from "./ui/ResourceChip";
import { RankBadge, LeaderboardRow } from "./ui/RankBadge";
import { Button } from "./ui/Button";

// Model icons mapping (fallback for players without provider info)
const MODEL_ICONS = {
  human: User,
  ai: Robot,
  default: User,
};

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
    return <IconComponent size={size} style={{ color: useWhiteLogo ? "#ffffff" : color }} />;
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

function ProviderMetaRow({ player, className }) {
  const providerId = player?.provider;
  if (!providerId) return null;
  return (
    <div className={cn("flex items-center gap-2 mt-1 text-[12px] text-slate-300", className)}>
      <div className="w-7 h-7 rounded-lg bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
        <ProviderAvatar providerId={providerId} size={14} />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="font-semibold truncate">
          {player?.providerName || providerId}
        </div>
        {player?.providerModel && (
          <div className="text-[10px] text-slate-500 truncate">{player.providerModel}</div>
        )}
      </div>
    </div>
  );
}

ProviderMetaRow.propTypes = {
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
function DiceDisplay({ value, isRolling, size = 40 }) {
  const DiceIcon = DICE_ICONS[value];
  
  if (!DiceIcon) {
    // Fallback for invalid values
    return (
      <div 
        className="rounded-lg bg-gradient-to-br from-slate-100 to-slate-300 shadow-lg flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-lg font-bold text-slate-800">{value}</span>
      </div>
    );
  }
  
  return (
    <motion.div
      animate={isRolling ? { rotate: [0, 15, -15, 10, -5, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative"
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
};

/**
 * Player info row with model type and AI provider info
 */
function PlayerInfoRow({ player, isSelected, onSelect }) {
  const color = getPlayerColor(player.id);
  const isAI = player.model === "ai" || player.provider;
  const hasProviderInfo = player.provider && PROVIDER_ICONS[player.provider];
  const ModelIcon = MODEL_ICONS[player.model] || MODEL_ICONS.default;
  const resources = player.resources || {};
  const totalResources = Object.values(resources).reduce((a, b) => a + b, 0);

  return (
    <PlayerCard
      player={player}
      isSelected={isSelected}
      onClick={() => onSelect?.(player)}
      className="mb-1.5"
    >
      <div className="p-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* Model/Provider icon */}
            <div 
              className="w-6 h-6 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-700/40 to-slate-800/60 shadow-sm shadow-black/20 overflow-hidden"
            >
              {hasProviderInfo ? (
                <ProviderAvatar providerId={player.provider} size={14} />
              ) : (
                <ModelIcon size={12} style={{ color: color.primary }} />
              )}
            </div>
            
            {/* Player name and label */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-slate-200">{player.name}</span>
                <PlayerLabel playerId={player.id} size="sm" showDot={false} />
              </div>
              <div className="text-[11px] text-slate-500">
                {isAI && player.providerModel ? (
                  <span className="flex items-center gap-1">
                    <Robot size={10} className="text-indigo-400" />
                    <span className="text-indigo-400/80">{player.providerModel}</span>
                  </span>
                ) : isAI ? (
                  <span className="flex items-center gap-1">
                    <Robot size={10} className="text-indigo-400" />
                    <span className="text-indigo-400/80">AI Player</span>
                  </span>
                ) : (
                  <span className="capitalize">{player.model || "Human"} Player</span>
                )}
              </div>
            </div>
          </div>

          {/* VP badge - chip style */}
          <div 
            className="px-2.5 py-1 rounded-xl text-[13px] font-bold shadow-sm"
            style={{ 
              color: color.primary,
            }}
          >
            {player.victoryPoints || 0}
          </div>
        </div>

        {/* Resource summary */}
        <div className="flex items-center justify-between text-[12px] text-slate-400">
          <ResourceSummary resources={resources} />
          <span className="text-[11px]">{totalResources} cards</span>
        </div>

        {/* Expanded resource grid when selected */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 pt-2"
            style={{ borderTop: '1px solid rgba(51, 65, 85, 0.3)' }}
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
function TurnControls({ onRoll, onEndTurn, isPaused, onPause, onResume, onQuit }) {
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
    const sorted = [...players].sort((a, b) => 
      (b.victoryPoints || 0) - (a.victoryPoints || 0)
    );
    return sorted;
  }, [players]);

  // Get current turn player using the currentPlayer prop, not an isCurrentTurn flag
  const currentIndex = (() => {
    const byId = players.findIndex((p) => p.id === currentPlayerId);
    return byId !== -1 ? byId : 0;
  })();

  const currentTurnPlayer = players[currentIndex] || players[0];
  const friendlyProvider = (id) => {
    if (id === "google") return "Google Gemini";
    if (id === "openai") return "OpenAI";
    if (id === "anthropic") return "Anthropic";
    return id;
  };
  const normalizeTurnName = (player) => {
    const name = (player?.name || "").trim();
    if (!name) return `Player ${Number.isFinite(player?.id) ? player.id + 1 : ""}`.trim();
    const friendly = friendlyProvider(player?.provider);
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
      <CardContent
        className="flex-1 overflow-y-auto space-y-2.5 text-[13px] leading-relaxed pr-1 min-h-0 pt-4"
      >
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
                isSelected={selectedPlayer?.id === player.id || isActivePlayer(player)}
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
          <div className="space-y-2.5">
            {/* Current Turn */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Current Turn</div>
              <div className="flex items-center gap-2">
                <PlayerTurnChip
                  player={{ ...currentTurnPlayer, name: normalizeTurnName(currentTurnPlayer) }}
                  isActive={true}
                  size="md"
                  showName={false}
                />
                <PlayerLabel playerId={currentTurnPlayer?.id} size="sm" />
                <ProviderMetaRow player={currentTurnPlayer} className="mt-0" />
              </div>
            </div>

            {/* Next Turn */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Next Turn</div>
              <div className="flex items-center gap-2">
                <PlayerTurnChip
                  player={{ ...nextTurnPlayer, name: normalizeTurnName(nextTurnPlayer) }}
                  isActive={false}
                  size="md"
                  showName={false}
                />
                <PlayerLabel playerId={nextTurnPlayer?.id} size="sm" />
                <ProviderMetaRow player={nextTurnPlayer} className="mt-0" />
              </div>
            </div>

            {/* Turn Queue */}
            {turnQueue.length > 0 && (
              <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Upcoming Order</div>
                <div className="flex flex-wrap gap-2">
                  {turnQueue.map((player) => (
                    <div key={player.id} className="flex items-center gap-2">
                      <PlayerTurnChip
                        player={{ ...player, name: normalizeTurnName(player) }}
                        isActive={false}
                        size="sm"
                        showName={false}
                        className="bg-slate-900/60"
                      />
                      <PlayerLabel playerId={player?.id} size="sm" />
                      <ProviderMetaRow player={player} className="mt-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dice Display */}
            {lastRoll && (
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Last Roll</div>
                {roll1 != null && roll2 != null ? (
                  <div className="flex items-center justify-center gap-2">
                    {/* First Die */}
                    <DiceDisplay value={roll1} size={28} />
                    
                    {/* Plus sign */}
                    <Plus size={14} weight="bold" className="text-slate-500" />
                    
                    {/* Second Die */}
                    <DiceDisplay value={roll2} size={28} />
                    
                    {/* Equals sign */}
                    <Equals size={14} weight="bold" className="text-slate-500" />
                    
                    {/* Sum display */}
                    <span className="text-lg font-bold text-slate-200">
                      {rollSum}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center">No roll yet</div>
                )}
              </div>
            )}

            {/* Controls */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20 space-y-3">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Controls</div>
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
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Build & Actions</div>
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
        <Collapsible
          title="Leaderboard"
          icon={Trophy}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="space-y-1.5">
            {rankings.map((player, idx) => (
              <LeaderboardRow
                key={player.id}
                player={player}
                rank={idx + 1}
                compact={true}
              />
            ))}
          </div>
        </Collapsible>

        {/* Last Production */}
        {lastProduction && Object.keys(lastProduction).length > 0 && (
          <Collapsible
            title="Last Production"
            icon={Cube}
            defaultOpen={false}
            variant="elevated"
          >
            <div className="space-y-2">
              {Object.entries(lastProduction).map(([playerId, resources]) => {
                const player = players.find(p => String(p.id) === String(playerId));
                const color = getPlayerColor(playerId);
                
                return (
                  <div
                    key={playerId}
                    className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ backgroundColor: `${color.primary}08` }}
                  >
                    <PlayerDot playerId={playerId} size="sm" />
                    <span className="text-xs text-slate-400 flex-1">{player?.name || `P${playerId}`}</span>
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
        <Collapsible
          title="Action Log"
          icon={Eye}
          defaultOpen={false}
          variant="elevated"
        >
          <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
            {actionLog.length === 0 && (
              <div className="text-xs text-slate-500">No messages yet.</div>
            )}
            {[...actionLog].reverse().map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs text-slate-200"
              >
                {/* Header row: P# chip, provider chip, timestamp - all on same line */}
                <div className="flex items-center gap-2 mb-1">
                  {entry.playerId !== undefined && (
                    <PlayerLabel playerId={entry.playerId} size="sm" />
                  )}
                  {entry.provider && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <div className="w-5 h-5 rounded-md bg-slate-900/70 flex items-center justify-center shadow-inner shadow-black/30 flex-shrink-0">
                        <ProviderAvatar providerId={entry.provider} size={12} />
                      </div>
                      <div className="leading-tight min-w-0">
                        <div className="text-[10px] text-slate-300 truncate">
                          {(() => {
                            const defaultPlayer = /^player\s*\d+/i.test((entry.playerName || "").trim());
                            const friendly = (id) => {
                              if (id === "google") return "Gemini";
                              if (id === "openai") return "OpenAI";
                              if (id === "anthropic") return "Anthropic";
                              return id;
                            };
                            if (!entry.providerName) return friendly(entry.provider);
                            if (entry.providerName === entry.playerName || defaultPlayer) return friendly(entry.provider);
                            return entry.providerName;
                          })()}
                        </div>
                        {entry.providerModel && (
                          <div className="text-[9px] text-slate-500 truncate -mt-0.5">
                            {entry.providerModel}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <span className="flex-1" />
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {entry.turn ? `T${entry.turn} • ` : ""}
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
                {/* Message */}
                <div className="text-slate-300 leading-snug">
                  {entry.message}
                </div>
              </div>
            ))}
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
          <div className="space-y-2.5 pt-2">
            {/* How to play */}
            <Collapsible 
              title="How to Play" 
              icon={ListChecks}
              defaultOpen={true}
              variant="elevated"
            >
              <div className="space-y-2">
                {QUICK_RULES_STEPS.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/25 to-emerald-600/15 text-emerald-300 text-[13px] font-bold flex items-center justify-center shadow-inner shadow-emerald-500/10">
                      {idx + 1})
                    </span>
                    <div>
                      <div className="text-[13px] text-slate-100 font-semibold">{step.title}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Collapsible>

            {/* Resources */}
            <Collapsible 
              title="Resources" 
              icon={Sparkle}
              defaultOpen={true}
              variant="elevated"
            >
              <div className="grid grid-cols-2 gap-1.5">
                {["wood", "brick", "wheat", "sheep", "ore"].map((key) => (
                  <div key={key} className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/70 shadow-md shadow-black/20 hover:from-slate-800/60 hover:to-slate-900/80 transition-all duration-150">
                    <span className="text-base drop-shadow-sm">{resourceEmoji(key)}</span>
                    <span className="text-[13px] text-slate-200 capitalize font-medium">{key}</span>
                  </div>
                ))}
              </div>
            </Collapsible>

            {/* Build costs */}
            <Collapsible 
              title="Build Costs" 
              icon={Hammer}
              defaultOpen={true}
              variant="elevated"
            >
              <div className="space-y-1.5">
                {BUILD_COSTS.map((row) => (
                  <div key={row.name} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                    <span className="text-[13px] font-semibold text-slate-100">{row.name}</span>
                    <div className="flex items-center gap-1">
                      {row.cost.map((c, i) => (
                        <div
                          key={`${row.name}-${c.resource}-${i}`}
                          className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-br from-slate-700/60 to-slate-800/80 shadow-sm shadow-black/20"
                        >
                          <span className="text-[13px] drop-shadow-sm">{resourceEmoji(c.resource)}</span>
                          <span className="text-[11px] font-semibold text-slate-200">{c.amount}</span>
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
