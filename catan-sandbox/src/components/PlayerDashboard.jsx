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
import { QuickRulesPanel } from "./QuickRulesPanel";

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

/**
 * Dice display component
 */
function DiceDisplay({ value, isRolling }) {
  return (
    <motion.div
      animate={isRolling ? { rotate: [0, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.3 }}
      className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-300 shadow-lg flex items-center justify-center"
    >
      <span className="text-lg font-bold text-slate-800">{value}</span>
    </motion.div>
  );
}

DiceDisplay.propTypes = {
  value: PropTypes.number.isRequired,
  isRolling: PropTypes.bool,
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
function TurnControls({ onRoll, onEndTurn, isPaused, onPause, onResume }) {
  return (
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
      
      {isPaused ? (
        <Button
          variant="success"
          size="icon"
          onClick={onResume}
        >
          <Play size={14} weight="fill" />
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="icon"
          onClick={onPause}
        >
          <Pause size={14} weight="fill" />
        </Button>
      )}

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
  );
}

TurnControls.propTypes = {
  onRoll: PropTypes.func.isRequired,
  onEndTurn: PropTypes.func.isRequired,
  isPaused: PropTypes.bool,
  onPause: PropTypes.func,
  onResume: PropTypes.func,
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
  mode,
  onSetMode,
  onBuyDevCard,
  onShowDevCards,
}) {
  const [selectedId, setSelectedId] = useState(
    typeof currentPlayer === "number" ? currentPlayer : currentPlayer?.id
  );

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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={16} className="text-indigo-400" />
          <span className="text-[14px] font-semibold">Game Overview</span>
        </CardTitle>
      </CardHeader>

      <CardContent
        className="flex-1 overflow-y-auto space-y-2.5 text-[13px] leading-relaxed pr-1 min-h-0"
      >
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
              <PlayerTurnChip player={currentTurnPlayer} isActive={true} size="md" />
              <ProviderMetaRow player={currentTurnPlayer} />
            </div>

            {/* Next Turn */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Next Turn</div>
              <PlayerTurnChip player={nextTurnPlayer} isActive={false} size="md" />
              <ProviderMetaRow player={nextTurnPlayer} />
            </div>

            {/* Turn Queue */}
            {turnQueue.length > 0 && (
              <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Upcoming Order</div>
                <div className="flex flex-wrap gap-2">
                  {turnQueue.map((player) => (
                    <div key={player.id} className="flex flex-col">
                      <PlayerTurnChip
                        player={player}
                        isActive={false}
                        size="sm"
                        className="bg-slate-900/60"
                      />
                      <ProviderMetaRow player={player} className="mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dice Display */}
            {lastRoll && (
              <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 shadow-lg shadow-black/20">
                <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase mb-2">Last Roll</div>
                {roll1 != null && roll2 != null ? (
                  <div className="flex items-center gap-2">
                    <DiceDisplay value={roll1} />
                    <DiceDisplay value={roll2} />
                    <div className="ml-2 text-2xl font-bold text-slate-200">
                      = {rollSum}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No roll yet</div>
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
              />
              <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
              <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">Build & Actions</div>
              <ActionTools
                mode={mode}
                onSetMode={onSetMode}
                onBuyDevCard={onBuyDevCard}
                onShowDevCards={onShowDevCards}
              />
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
                <div className="flex items-start gap-2">
                  {entry.provider && (
                    <div className="pt-0.5">
                      <ProviderAvatar providerId={entry.provider} size={14} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-slate-300 truncate">
                          {entry.playerName || "Player"}
                        </span>
                        {entry.playerId !== undefined && (
                          <PlayerLabel playerId={entry.playerId} size="sm" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 whitespace-nowrap">
                        {entry.turn ? `T${entry.turn} • ` : ""}
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    {entry.providerModel && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <span>{entry.providerModel}</span>
                      </div>
                    )}
                    <div className="text-slate-300 leading-snug">
                      {entry.message}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        <div className="pt-2">
          <QuickRulesPanel />
        </div>
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
  mode: PropTypes.string,
  onSetMode: PropTypes.func,
  onBuyDevCard: PropTypes.func,
  onShowDevCards: PropTypes.func,
};

export default PlayerDashboard;
