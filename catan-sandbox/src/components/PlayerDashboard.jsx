import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import {
  Users,
  Cube,
  Play,
  Pause,
  ArrowClockwise,
  SkipForward,
  Trophy,
  Robot,
  User,
} from "@phosphor-icons/react";
import { getPlayerColor } from "../lib/colors";
import { cn, resourceEmoji } from "../lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Collapsible } from "./ui/Collapsible";
import { PlayerDot, PlayerLabel, PlayerTurnChip, PlayerCard } from "./ui/PlayerChip";
import { ResourceGrid, ResourceSummary } from "./ui/ResourceChip";
import { RankBadge, LeaderboardRow } from "./ui/RankBadge";
import { Button } from "./ui/Button";

// Model icons mapping
const MODEL_ICONS = {
  human: User,
  ai: Robot,
  default: User,
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
 * Player info row with model type
 */
function PlayerInfoRow({ player, isSelected, onSelect }) {
  const color = getPlayerColor(player.id);
  const ModelIcon = MODEL_ICONS[player.model] || MODEL_ICONS.default;
  const resources = player.resources || {};
  const totalResources = Object.values(resources).reduce((a, b) => a + b, 0);

  return (
    <PlayerCard
      player={player}
      isSelected={isSelected}
      onClick={() => onSelect?.(player)}
      className="mb-2"
    >
      <div className="p-2.5">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {/* Model icon */}
            <div 
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color.primary}15` }}
            >
              <ModelIcon size={14} style={{ color: color.primary }} />
            </div>
            
            {/* Player name and label */}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-200">{player.name}</span>
                <PlayerLabel playerId={player.id} size="sm" showDot={false} />
              </div>
              <div className="text-[10px] text-slate-500 capitalize">
                {player.model || "Human"} Player
              </div>
            </div>
          </div>

          {/* VP badge */}
          <div 
            className="px-2 py-1 rounded-lg text-sm font-bold"
            style={{ 
              backgroundColor: `${color.primary}15`,
              color: color.primary,
            }}
          >
            {player.victoryPoints || 0}
          </div>
        </div>

        {/* Resource summary */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <ResourceSummary resources={resources} />
          <span>{totalResources} cards</span>
        </div>

        {/* Expanded resource grid when selected */}
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2 pt-2 border-t border-slate-800/50"
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
 * Main Player Dashboard Component
 */
export function PlayerDashboard({
  players,
  currentPlayer,
  lastRoll,
  lastProduction,
  onRollDice,
  onSelectPlayer,
  onEndTurn,
  isPaused,
  onPause,
  onResume,
}) {
  // Calculate rankings
  const rankings = useMemo(() => {
    const sorted = [...players].sort((a, b) => 
      (b.victoryPoints || 0) - (a.victoryPoints || 0)
    );
    return sorted;
  }, [players]);

  // Get current turn player
  const currentTurnPlayer = players.find(p => p.isCurrentTurn) || players[0];
  
  // Get next turn player
  const currentIndex = players.findIndex(p => p.isCurrentTurn);
  const nextIndex = (currentIndex + 1) % players.length;
  const nextTurnPlayer = players[nextIndex];

  // Get selected player object
  const selectedPlayer = typeof currentPlayer === 'number' 
    ? players.find(p => p.id === currentPlayer) 
    : currentPlayer;

  return (
    <Card className="h-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={16} className="text-indigo-400" />
          <span className="text-sm">Game Overview</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="overflow-y-auto space-y-2" style={{ maxHeight: "calc(100% - 56px)" }}>
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
                isSelected={selectedPlayer?.id === player.id}
                onSelect={onSelectPlayer}
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
          <div className="space-y-3">
            {/* Current Turn */}
            <div className="p-2.5 rounded-lg bg-black/20">
              <div className="text-[10px] text-slate-500 mb-1.5">Current Turn</div>
              <PlayerTurnChip player={currentTurnPlayer} isActive={true} size="md" />
            </div>

            {/* Next Turn */}
            <div className="p-2.5 rounded-lg bg-black/20">
              <div className="text-[10px] text-slate-500 mb-1.5">Next Turn</div>
              <PlayerTurnChip player={nextTurnPlayer} isActive={false} size="md" />
            </div>

            {/* Dice Display */}
            {lastRoll && (
              <div className="p-2.5 rounded-lg bg-black/20">
                <div className="text-[10px] text-slate-500 mb-1.5">Last Roll</div>
                <div className="flex items-center gap-2">
                  <DiceDisplay value={lastRoll.die1} />
                  <DiceDisplay value={lastRoll.die2} />
                  <div className="ml-2 text-xl font-bold text-slate-300">
                    = {lastRoll.die1 + lastRoll.die2}
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="pt-1">
              <div className="text-[10px] text-slate-500 mb-1.5">Controls</div>
              <TurnControls
                onRoll={onRollDice}
                onEndTurn={onEndTurn || (() => {})}
                isPaused={isPaused}
                onPause={onPause}
                onResume={onResume}
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
      </CardContent>
    </Card>
  );
}

PlayerDashboard.propTypes = {
  players: PropTypes.array.isRequired,
  currentPlayer: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  lastRoll: PropTypes.object,
  lastProduction: PropTypes.object,
  onRollDice: PropTypes.func.isRequired,
  onSelectPlayer: PropTypes.func.isRequired,
  onEndTurn: PropTypes.func,
  isPaused: PropTypes.bool,
  onPause: PropTypes.func,
  onResume: PropTypes.func,
};

export default PlayerDashboard;
