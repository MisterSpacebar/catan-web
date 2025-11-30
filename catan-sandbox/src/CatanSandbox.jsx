import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowsLeftRight,
  CreditCard,
  ArrowCounterClockwise,
  Shuffle,
  Play,
  Trophy,
  X,
  Check,
  WarningCircle,
  Sparkle,
  Book,
  ListChecks,
  Hammer,
  CaretLeft,
  CaretRight,
  ChartBar,
  GameController,
  Cube,
  Users,
} from "@phosphor-icons/react";
import { generateBoard, TILE_SIZE, hexCorner } from "../shared/board.js";
import { Button } from "./components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/Card";
import { Collapsible } from "./components/ui/Collapsible";
import { GameBoard } from "./components/GameBoard";
import { PlayerDashboard } from "./components/PlayerDashboard";
import { StatsDashboard } from "./components/StatsDashboard";
import { cn, resourceColor, resourceEmoji } from "./lib/utils";

// ============================================
// Constants
// ============================================
const BOARD_PADDING = 30;
const DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#a855f7", "#f97316"];

const DEV_CARD_DECK = [
  ...Array(14).fill({ type: "knight" }),
  ...Array(5).fill({ type: "victory" }),
  ...Array(2).fill({ type: "road-building" }),
  ...Array(2).fill({ type: "year-of-plenty" }),
  ...Array(2).fill({ type: "monopoly" }),
];

function randShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================
// Custom Hook: useBoard
// ============================================
function useBoard() {
  const [board, setBoard] = useState(() => generateBoard());
  const rerandomize = () => setBoard(generateBoard());

  const bbox = useMemo(() => {
    const centers = board.tiles.map((t) => t.center);
    const xs = centers.map((c) => c.x);
    const ys = centers.map((c) => c.y);
    const minX = Math.min(...xs) - TILE_SIZE - BOARD_PADDING;
    const maxX = Math.max(...xs) + TILE_SIZE + BOARD_PADDING;
    const minY = Math.min(...ys) - TILE_SIZE - BOARD_PADDING;
    const maxY = Math.max(...ys) + TILE_SIZE + BOARD_PADDING;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [board]);

  return { board, setBoard, rerandomize, bbox };
}

// ============================================
// Trade Panel Component
// ============================================
function TradePanel({ currentPlayer, onTrade, onClose, nodes }) {
  const [giveAmounts, setGiveAmounts] = useState({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
  const [receiveAmounts, setReceiveAmounts] = useState({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
  const resources = ["wood", "brick", "wheat", "sheep", "ore"];

  const getTradingRatios = () => {
    const ratios = { default: 4 };
    nodes.forEach((node) => {
      if (node.building && node.building.ownerId === currentPlayer.id) {
        node.harbors?.forEach((harbor) => {
          if (harbor.resource === "any") {
            ratios.default = Math.min(ratios.default, harbor.ratio);
          } else {
            ratios[harbor.resource] = Math.min(ratios[harbor.resource] || 4, harbor.ratio);
          }
        });
      }
    });
    return ratios;
  };

  const tradingRatios = getTradingRatios();
  const totalGive = Object.values(giveAmounts).reduce((sum, val) => sum + val, 0);
  const totalReceive = Object.values(receiveAmounts).reduce((sum, val) => sum + val, 0);
  const giveResource = Object.entries(giveAmounts).find(([, amount]) => amount > 0)?.[0];
  const requiredRatio = giveResource ? (tradingRatios[giveResource] || tradingRatios.default) : 4;

  const canTrade = totalGive === requiredRatio && totalReceive === 1 &&
    Object.entries(giveAmounts).every(([resource, amount]) =>
      (currentPlayer.resources[resource] || 0) >= amount
    );

  const handleGiveChange = (resource, amount) => {
    const newAmounts = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };
    newAmounts[resource] = Math.max(0, amount);
    setGiveAmounts(newAmounts);
  };

  const handleReceiveChange = (resource, amount) => {
    setReceiveAmounts(prev => ({ ...prev, [resource]: Math.max(0, amount) }));
  };

  const executeTrade = () => {
    if (!canTrade) return;
    const giveRes = Object.entries(giveAmounts).find(([, amount]) => amount > 0)?.[0];
    const receiveRes = Object.entries(receiveAmounts).find(([, amount]) => amount > 0)?.[0];
    if (giveRes && receiveRes) {
      onTrade(giveRes, receiveRes);
      setGiveAmounts({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
      setReceiveAmounts({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="rounded-xl overflow-hidden shadow-2xl shadow-black/50"
    >
      <div className="bg-slate-900/95 backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <ArrowsLeftRight size={16} className="text-cyan-400" />
            <div>
              <h3 className="text-sm font-medium text-slate-200">Harbor Trading</h3>
              <p className="text-[10px] text-slate-600">
                {Object.keys(tradingRatios).length > 1 ? (
                  Object.entries(tradingRatios).map(([r, ratio]) => (
                    <span key={r} className="mr-2">
                      {r === 'default' ? `${ratio}:1` : `${ratio}:1 ${r}`}
                    </span>
                  ))
                ) : (
                  "4:1 (no harbors)"
                )}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="iconSm" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        <div className="p-3 grid md:grid-cols-2 gap-3">
          {/* Give Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Give ({totalGive}/{requiredRatio})
            </div>
            {resources.map(resource => {
              const available = currentPlayer.resources[resource] || 0;
              const resourceRatio = tradingRatios[resource] || tradingRatios.default;
              return (
                <div key={resource} className="flex items-center justify-between p-2 rounded-lg bg-black/25">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{resourceEmoji(resource)}</span>
                    <span className="text-xs text-slate-400 capitalize">{resource}</span>
                    <span className="text-[10px] text-slate-600">({available})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleGiveChange(resource, giveAmounts[resource] - 1)}
                      disabled={giveAmounts[resource] <= 0}
                    >
                      −
                    </Button>
                    <span className="w-5 text-center text-slate-300 font-medium text-sm font-mono">
                      {giveAmounts[resource]}
                    </span>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleGiveChange(resource, giveAmounts[resource] + 1)}
                      disabled={giveAmounts[resource] >= available || totalGive >= resourceRatio}
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Receive Section */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Receive ({totalReceive}/1)
            </div>
            {resources.map(resource => {
              return (
                <div key={resource} className="flex items-center justify-between p-2 rounded-lg bg-black/25">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{resourceEmoji(resource)}</span>
                    <span className="text-xs text-slate-400 capitalize">{resource}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleReceiveChange(resource, receiveAmounts[resource] - 1)}
                      disabled={receiveAmounts[resource] <= 0}
                    >
                      −
                    </Button>
                    <span className="w-5 text-center text-slate-300 font-medium text-sm font-mono">
                      {receiveAmounts[resource]}
                    </span>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      onClick={() => handleReceiveChange(resource, receiveAmounts[resource] + 1)}
                      disabled={receiveAmounts[resource] >= 1 || totalReceive >= 1}
                    >
                      +
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            {!canTrade && totalGive === requiredRatio && totalReceive === 1 && "Not enough resources"}
            {totalGive < requiredRatio && `Select ${requiredRatio} to give`}
            {totalGive === requiredRatio && totalReceive < 1 && "Select 1 to receive"}
          </p>
          <Button
            variant={canTrade ? "success" : "secondary"}
            disabled={!canTrade}
            onClick={executeTrade}
            size="default"
          >
            <ArrowsLeftRight size={14} />
            Trade
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

TradePanel.propTypes = {
  currentPlayer: PropTypes.object.isRequired,
  onTrade: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  nodes: PropTypes.array.isRequired,
};

// ============================================
// Collapsible Sidebar Wrapper
// ============================================
function CollapsibleSidebar({ collapsed, onToggle, side, children, icon: Icon, title }) {
  const isLeft = side === "left";
  
  return (
    <motion.aside
      animate={{ width: collapsed ? 48 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 35 }}
      className="h-full flex-shrink-0 relative drop-shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
    >
      {collapsed ? (
        <div className="h-full rounded-2xl bg-slate-950/60 ring-1 ring-slate-800/70 backdrop-blur-lg flex flex-col items-center py-3 gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isLeft ? <CaretRight size={16} weight="bold" /> : <CaretLeft size={16} weight="bold" />}
          </button>
          <div className="w-px h-4 bg-slate-700/50" />
          {Icon && <Icon size={16} className="text-slate-500" />}
          <span className="text-[10px] text-slate-600 [writing-mode:vertical-rl] rotate-180">{title}</span>
        </div>
      ) : (
        <div className="h-full relative rounded-2xl bg-slate-950/60 ring-1 ring-slate-800/70 shadow-[0_18px_50px_rgba(0,0,0,0.35)] overflow-hidden">
          {children}
          <div
            className={cn(
              "absolute top-6 bottom-6 w-[2px] bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-full shadow-[0_0_18px_rgba(0,0,0,0.35)]",
              isLeft ? "right-0" : "left-0"
            )}
          />
          {/* Toggle button */}
          <button
            onClick={onToggle}
            className={cn(
              "absolute top-3 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-colors z-10",
              isLeft ? "right-2" : "left-2"
            )}
          >
            {isLeft ? <CaretLeft size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </button>
        </div>
      )}
    </motion.aside>
  );
}

CollapsibleSidebar.propTypes = {
  collapsed: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  side: PropTypes.oneOf(["left", "right"]).isRequired,
  children: PropTypes.node.isRequired,
  icon: PropTypes.elementType,
  title: PropTypes.string,
};

// ============================================
// Rules Sidebar Content
// ============================================
function RulesSidebarContent() {
  const steps = [
    { title: "Roll & Produce", desc: "Tiles with matching numbers produce resources." },
    { title: "Trade Smart", desc: "Use harbors or 4:1 bank trades." },
    { title: "Build & Expand", desc: "Roads → settlements → cities." },
    { title: "End Turn", desc: "Pass after building/trading." },
  ];

  const buildCosts = [
    { name: "Road", cost: [{ resource: "wood", amount: 1 }, { resource: "brick", amount: 1 }] },
    { name: "Settlement", cost: [{ resource: "wood", amount: 1 }, { resource: "brick", amount: 1 }, { resource: "wheat", amount: 1 }, { resource: "sheep", amount: 1 }] },
    { name: "City", cost: [{ resource: "ore", amount: 3 }, { resource: "wheat", amount: 2 }] },
    { name: "Dev Card", cost: [{ resource: "ore", amount: 1 }, { resource: "wheat", amount: 1 }, { resource: "sheep", amount: 1 }] },
  ];

  return (
    <Card className="h-full overflow-hidden shadow-2xl shadow-black/35">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book size={16} className="text-emerald-400" />
          <span className="text-base font-semibold">Quick Rules</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="overflow-y-auto space-y-3 text-sm leading-relaxed" style={{ maxHeight: "calc(100% - 56px)" }}>
        {/* How to play - Collapsible */}
        <Collapsible 
          title="How to Play" 
          icon={ListChecks}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 ring-1 ring-slate-800/60">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-300 text-sm font-bold flex items-center justify-center">
                  {idx + 1})
                </span>
                <div>
                  <div className="text-sm text-slate-100 font-semibold">{step.title}</div>
                  <div className="text-[13px] text-slate-400 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Resources - Collapsible */}
        <Collapsible 
          title="Resources" 
          icon={Sparkle}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="grid grid-cols-2 gap-1.5">
            {["wood", "brick", "wheat", "sheep", "ore"].map((key) => (
              <div key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900/40 ring-1 ring-slate-800/60">
                <span className="text-lg">{resourceEmoji(key)}</span>
                <span className="text-sm text-slate-200 capitalize font-medium">{key}</span>
              </div>
            ))}
          </div>
        </Collapsible>

        {/* Build costs - Collapsible */}
        <Collapsible 
          title="Build Costs" 
          icon={Hammer}
          defaultOpen={true}
          variant="elevated"
        >
          <div className="space-y-1.5">
            {buildCosts.map((row) => (
              <div key={row.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/40 ring-1 ring-slate-800/60">
                <span className="text-sm font-semibold text-slate-100">{row.name}</span>
                <div className="flex items-center gap-1">
                  {row.cost.map((c, i) => (
                    <div
                      key={`${row.name}-${c.resource}-${i}`}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/70"
                    >
                      <span className="text-sm">{resourceEmoji(c.resource)}</span>
                      <span className="text-xs font-semibold text-slate-200">{c.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ============================================
// Control Dock
// ============================================
function ControlDock({ onReroll, onEndTurn, onNewGame, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute left-1/2 -translate-x-1/2 bottom-4 z-20"
    >
      <div className="flex items-center gap-1 rounded-xl bg-slate-900/80 backdrop-blur-xl px-2 py-1.5 shadow-xl shadow-black/40">
        <Button variant="warning" size="default" onClick={onReroll}>
          <Cube size={14} />
          Roll
        </Button>
        <div className="w-px h-4 bg-slate-700/40 mx-0.5" />
        <Button variant="success" size="default" onClick={onEndTurn}>
          <Check size={14} weight="bold" />
          End
        </Button>
        <div className="w-px h-4 bg-slate-700/40 mx-0.5" />
        <Button variant="ghost" size="default" onClick={onNewGame}>
          <Play size={14} weight="fill" />
          New
        </Button>
        <Button variant="ghost" size="icon" onClick={onReset}>
          <ArrowCounterClockwise size={14} />
        </Button>
      </div>
    </motion.div>
  );
}

ControlDock.propTypes = {
  onReroll: PropTypes.func.isRequired,
  onEndTurn: PropTypes.func.isRequired,
  onNewGame: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};

// ============================================
// Dev Card Panel
// ============================================
function DevCardPanel({ player, devCardDeck, onClose, onPlayCard }) {
  const cardInfo = {
    victory: { name: 'Victory Point', emoji: '⭐', color: '#fbbf24' },
    knight: { name: 'Knight', emoji: '⚔️', color: '#ef4444' },
    'road-building': { name: 'Road Building', emoji: '🛣️', color: '#f97316' },
    'year-of-plenty': { name: 'Year of Plenty', emoji: '🌾', color: '#22c55e' },
    monopoly: { name: 'Monopoly', emoji: '💰', color: '#a855f7' }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        className="relative bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-purple-400" />
            <span className="text-sm font-medium text-slate-200">Development Cards</span>
          </div>
          <Button variant="ghost" size="iconSm" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4">
          {player.devCards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard size={24} className="mx-auto mb-2 text-slate-600" />
              <p className="text-slate-500 text-sm">No cards yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {player.devCards.map((card, index) => {
                const info = cardInfo[card.type];
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={cn(
                      "rounded-lg p-3 transition-all",
                      card.canPlay ? "bg-slate-800/50 hover:bg-slate-700/50" : "bg-slate-900/50 opacity-50"
                    )}
                  >
                    <div className="text-2xl text-center mb-1">{info.emoji}</div>
                    <div className="text-slate-300 font-medium text-center text-xs mb-2">{info.name}</div>
                    {card.type !== 'victory' ? (
                      <Button
                        variant={card.canPlay ? "primary" : "secondary"}
                        size="xs"
                        className="w-full"
                        disabled={!card.canPlay}
                        onClick={() => onPlayCard(index)}
                      >
                        {card.canPlay ? 'Play' : 'Wait'}
                      </Button>
                    ) : (
                      <div className="text-center text-[10px] text-slate-600">Auto</div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center justify-between text-xs text-slate-600">
          <span>Knights: <span className="text-slate-400">{player.knightsPlayed}</span></span>
          <span>Deck: <span className="text-slate-400">{devCardDeck.length}</span></span>
        </div>
      </motion.div>
    </motion.div>
  );
}

DevCardPanel.propTypes = {
  player: PropTypes.object.isRequired,
  devCardDeck: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onPlayCard: PropTypes.func.isRequired,
};

// ============================================
// Winner Modal
// ============================================
function WinnerModal({ winner, onNewGame }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", bounce: 0.4 }}
        className="bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 text-center shadow-2xl"
      >
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-slate-200 mb-2">Victory!</h2>
        <p className="text-base mb-6">
          <span style={{ color: winner.color }} className="font-bold">{winner.name}</span>
          <span className="text-slate-400"> wins with </span>
          <span className="text-amber-400 font-bold">{winner.vp} VP</span>
        </p>
        <Button variant="warning" size="lg" onClick={onNewGame}>
          <Play size={16} weight="fill" />
          New Game
        </Button>
      </motion.div>
    </motion.div>
  );
}

WinnerModal.propTypes = {
  winner: PropTypes.object.isRequired,
  onNewGame: PropTypes.func.isRequired,
};

// ============================================
// Toast Notification
// ============================================
function Toast({ message, type }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        "px-4 py-2 rounded-lg shadow-xl backdrop-blur-xl",
        "flex items-center gap-2",
        type === 'success' && "bg-emerald-500/90 text-white",
        type === 'error' && "bg-red-500/90 text-white"
      )}
    >
      {type === 'success' ? <Check size={16} weight="bold" /> : <WarningCircle size={16} />}
      <span className="font-medium text-sm">{message}</span>
    </motion.div>
  );
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

// ============================================
// View Tabs Component
// ============================================
function ViewTabs({ activeView, onViewChange }) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-800/40">
      {[
        { id: "game", icon: GameController },
        { id: "stats", icon: ChartBar },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={cn(
            "p-1.5 rounded transition-all duration-150",
            activeView === tab.id
              ? "bg-indigo-500/20 text-indigo-400"
              : "text-slate-500 hover:text-slate-300"
          )}
        >
          <tab.icon size={16} weight={activeView === tab.id ? "fill" : "regular"} />
        </button>
      ))}
    </div>
  );
}

ViewTabs.propTypes = {
  activeView: PropTypes.string.isRequired,
  onViewChange: PropTypes.func.isRequired,
};

// ============================================
// Setup Screen
// ============================================
function SetupScreen({ numPlayers, setNumPlayers, onStart, onRerandomize, board, bbox }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Sparkle size={20} weight="fill" className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-200">Catan Sandbox</h1>
          </div>
          <p className="text-slate-500 text-sm">Configure and start</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Settings Card */}
          <Card glow interactive>
            <CardHeader>
              <CardTitle size="sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Players</label>
                <div className="flex gap-1.5">
                  {[3, 4].map((n) => (
                    <Button
                      key={n}
                      variant={numPlayers === n ? "primary" : "secondary"}
                      onClick={() => setNumPlayers(n)}
                      className="flex-1"
                      size="default"
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <Button variant="success" className="w-full" size="lg" onClick={onStart}>
                  <Play size={16} weight="fill" />
                  Start Game
                </Button>
                <Button variant="secondary" className="w-full" size="default" onClick={onRerandomize}>
                  <Shuffle size={14} />
                  Rerandomize
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle size="sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden bg-slate-950/50">
                <svg
                  width="100%"
                  viewBox={`${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`}
                >
                  <defs>
                    <filter id="previewShadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                  </defs>
                  {board.tiles.map((t, idx) => {
                    const pts = Array.from({ length: 6 }, (_, i) => hexCorner(t.center, TILE_SIZE, i));
                    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
                    return (
                      <path
                        key={idx}
                        d={path}
                        fill={resourceColor(t.resource)}
                        stroke="rgba(0,0,0,0.3)"
                        strokeWidth={1.5}
                        filter="url(#previewShadow)"
                      />
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}

SetupScreen.propTypes = {
  numPlayers: PropTypes.number.isRequired,
  setNumPlayers: PropTypes.func.isRequired,
  onStart: PropTypes.func.isRequired,
  onRerandomize: PropTypes.func.isRequired,
  board: PropTypes.object.isRequired,
  bbox: PropTypes.object.isRequired,
};

// ============================================
// Main Component
// ============================================
export default function CatanSandbox() {
  const { board, setBoard, rerandomize, bbox } = useBoard();

  const [stage, setStage] = useState("setup");
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState("select");
  const [lastRoll, setLastRoll] = useState(null);
  const [selection, setSelection] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const [lastProduction, setLastProduction] = useState(null);
  const [devCardDeck, setDevCardDeck] = useState([]);
  const [showDevCardPanel, setShowDevCardPanel] = useState(false);
  const [winner, setWinner] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [isLeftCollapsed, setLeftCollapsed] = useState(false);
  const [isRightCollapsed, setRightCollapsed] = useState(false);
  const [activeView, setActiveView] = useState("game");

  const API_BASE = "http://localhost:4000";

  // Create game on mount
  React.useEffect(() => {
    async function createGame() {
      try {
        const res = await fetch(`${API_BASE}/api/games`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numPlayers: 4 }),
        });

        const data = await res.json();
        setGameId(data.id);
        setBoard(data.board);
        setPlayers(data.players);
        setCurrent(data.current);
        setLastRoll(data.lastRoll || null);
        setWinner(data.winner || null);
        setStage("play");
      } catch (err) {
        console.error("Failed to create game:", err);
        startLocalGame();
      }
    }
    createGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setBoard]);

  const sendAction = async (type, payload = {}) => {
    if (!gameId) return;

    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });

      const data = await res.json();

      if (!data.ok) {
        setLastAction({ type: "error", message: data.error, timestamp: Date.now() });
        setTimeout(() => setLastAction(null), 3000);
        return;
      }

      const state = data.state;
      setBoard(state.board);
      setPlayers(state.players);
      setCurrent(state.current);
      setLastRoll(state.lastRoll || null);
      setLastProduction(state.lastProduction || null);
      setWinner(state.winner || null);

      if (state.winner) {
        setLastAction({ type: "success", message: `${state.winner.name} wins!`, timestamp: Date.now() });
      }
    } catch (err) {
      setLastAction({ type: "error", message: "Network error", timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const placeInitialBuildings = (newBoard) => {
    const { nodes, edges, tiles } = newBoard;
    const desertTileIndices = tiles
      .map((tile, index) => tile.resource === "desert" ? index : -1)
      .filter(index => index !== -1);

    const availableNodes = nodes.filter(n => {
      if (n.building || !n.canBuild) return false;
      return !n.adjHexes.some(hexIdx => desertTileIndices.includes(hexIdx));
    });

    for (let playerId = 0; playerId < numPlayers; playerId++) {
      for (let settlement = 0; settlement < 2; settlement++) {
        if (availableNodes.length === 0) break;

        const randomIndex = Math.floor(Math.random() * availableNodes.length);
        const selectedNode = availableNodes[randomIndex];
        selectedNode.building = { ownerId: playerId, type: "town" };
        availableNodes.splice(randomIndex, 1);

        const connectedEdges = edges.filter(e => {
          if (e.ownerId !== null) return false;
          const isConnected = e.n1 === selectedNode.id || e.n2 === selectedNode.id;
          if (!isConnected) return false;
          const node1 = nodes.find(n => n.id === e.n1);
          const node2 = nodes.find(n => n.id === e.n2);
          return node1?.canBuild && node2?.canBuild;
        });

        if (connectedEdges.length > 0) {
          const randomEdgeIndex = Math.floor(Math.random() * connectedEdges.length);
          connectedEdges[randomEdgeIndex].ownerId = playerId;
        }

        const adjacentNodeIds = edges
          .filter(e => e.n1 === selectedNode.id || e.n2 === selectedNode.id)
          .flatMap(e => [e.n1, e.n2])
          .filter(id => id !== selectedNode.id);

        for (let i = availableNodes.length - 1; i >= 0; i--) {
          if (adjacentNodeIds.includes(availableNodes[i].id)) {
            availableNodes.splice(i, 1);
          }
        }
      }
    }
    return newBoard;
  };

  const startLocalGame = () => {
    const ppl = Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `Player ${i + 1}`,
      color: DEFAULT_COLORS[i],
      resources: { wood: 1, brick: 1, wheat: 1, sheep: 1, ore: 1 },
      vp: 0,
      devCards: [],
      playedDevCards: [],
      knightsPlayed: 0,
      largestArmy: false,
      longestRoad: false,
      boughtDevCardThisTurn: false
    }));

    const shuffledDeck = randShuffle([...DEV_CARD_DECK]);
    setDevCardDeck(shuffledDeck);

    const boardWithPlacements = placeInitialBuildings(board);
    setBoard(boardWithPlacements);
    setPlayers(ppl);
    setCurrent(0);
    setStage("play");
    setMode("select");
    setLastRoll(null);
    setSelection(null);
    setLastProduction(null);
  };

  const newGame = () => {
    setStage("setup");
    setPlayers([]);
    setCurrent(0);
    setMode("select");
    setLastRoll(null);
    setSelection(null);
    setLastProduction(null);
    setBoard(generateBoard());
    setActiveView("game");
  };

  const endTurn = () => {
    sendAction("endTurn");
    setMode("select");
    setSelection(null);
    setLastProduction(null);
  };

  const onRollDice = () => sendAction("rollDice");

  const onClickHex = (hexId) => {
    if (mode === "move-robber") {
      sendAction("moveRobber", { hexId });
      setMode("select");
      setSelection(null);
      return;
    }
    setSelection({ type: "hex", id: hexId });
  };

  const onClickNode = (nodeId) => {
    if (mode === "build-town") {
      sendAction("buildTown", { nodeId, playerId: current });
      return;
    }
    if (mode === "build-city") {
      sendAction("buildCity", { nodeId, playerId: current });
      return;
    }
    setSelection({ type: "node", id: nodeId });
  };

  const onClickEdge = (edgeId) => {
    if (mode === "build-road") {
      sendAction("buildRoad", { edgeId, playerId: current });
      return;
    }
    setSelection({ type: "edge", id: edgeId });
  };

  const executeTrade = (giveResource, receiveResource) => {
    sendAction("harborTrade", { playerId: current, giveResource, receiveResource });
  };

  const buyDevCard = () => sendAction("buyDevCard");

  const playDevCard = (cardIndex) => {
    const card = players[current].devCards[cardIndex];
    if (!card.canPlay) {
      setLastAction({ type: 'error', message: 'Cannot play card bought this turn!', timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 2000);
      return;
    }

    if (card.type === 'victory') {
      setLastAction({ type: 'error', message: 'Victory point cards are auto-counted!', timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 2000);
      return;
    }

    if (card.type === 'knight') {
      sendAction("playKnight");
      setMode('move-robber');
      setShowDevCardPanel(false);
    } else if (card.type === 'road-building') {
      sendAction("playRoadBuilding");
      setShowDevCardPanel(false);
    } else if (card.type === 'year-of-plenty') {
      setShowDevCardPanel(false);
    } else if (card.type === 'monopoly') {
      setShowDevCardPanel(false);
    }
  };

  // ============================================
  // Render
  // ============================================
  if (stage === "setup") {
    return (
      <SetupScreen
        numPlayers={numPlayers}
        setNumPlayers={setNumPlayers}
        onStart={startLocalGame}
        onRerandomize={rerandomize}
        board={board}
        bbox={bbox}
      />
    );
  }

  return (
    <div className="h-screen relative overflow-hidden">
      {/* Toast notifications */}
      <AnimatePresence>
        {lastAction && <Toast message={lastAction.message} type={lastAction.type} />}
      </AnimatePresence>

      {/* Winner modal */}
      <AnimatePresence>
        {winner && <WinnerModal winner={winner} onNewGame={newGame} />}
      </AnimatePresence>

      {/* Dev Card Panel */}
      <AnimatePresence>
        {showDevCardPanel && players[current] && (
          <DevCardPanel
            player={players[current]}
            devCardDeck={devCardDeck}
            onClose={() => setShowDevCardPanel(false)}
            onPlayCard={playDevCard}
          />
        )}
      </AnimatePresence>

      {/* Main Layout */}
      <div className="relative z-10 flex h-full gap-2 p-2">
        {/* Left Sidebar - Rules */}
        <CollapsibleSidebar
          collapsed={isLeftCollapsed}
          onToggle={() => setLeftCollapsed(v => !v)}
          side="left"
          icon={Book}
          title="Rules"
        >
          <RulesSidebarContent />
        </CollapsibleSidebar>

        {/* Center - Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <motion.header
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex-shrink-0 mb-2"
          >
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-900/60 backdrop-blur-lg">
              {/* Logo & Title */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                </div>
                <span className="text-sm font-medium text-slate-300">Settlers of Catan</span>
              </div>

              {/* Toolbar - only show on game view */}

              {/* Right section */}
              <div className="flex items-center gap-2">
                <ViewTabs activeView={activeView} onViewChange={setActiveView} />
                {lastRoll && (
                  <span className="px-2 py-1 rounded bg-slate-800/50 text-xs text-slate-400 font-mono">
                    {lastRoll.total}
                  </span>
                )}
              </div>
            </div>
          </motion.header>

          {/* Main Content Area - full height */}
          <div className="flex-1 overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
              {activeView === "game" ? (
                <motion.div
                  key="game"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full relative"
                >
                  {/* Trade panel */}
                  <AnimatePresence>
                    {mode === "trade" && players[current] && (
                      <div className="absolute top-2 left-2 right-2 z-10">
                        <TradePanel
                          currentPlayer={players[current]}
                          nodes={board.nodes}
                          onTrade={executeTrade}
                          onClose={() => setMode("select")}
                        />
                      </div>
                    )}
                  </AnimatePresence>

                  {/* Game Board - takes full space */}
                  <GameBoard
                    board={board}
                    players={players}
                    mode={mode}
                    selection={selection}
                    onClickHex={onClickHex}
                    onClickNode={onClickNode}
                    onClickEdge={onClickEdge}
                    bbox={bbox}
                  />

                  {/* Control Dock */}
                  <ControlDock
                    onReroll={onRollDice}
                    onEndTurn={endTurn}
                    onNewGame={newGame}
                    onReset={rerandomize}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="h-full"
                >
                  <StatsDashboard players={players} board={board} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Sidebar - Game Overview */}
        <CollapsibleSidebar
          collapsed={isRightCollapsed}
          onToggle={() => setRightCollapsed(v => !v)}
          side="right"
          icon={Users}
          title="Overview"
        >
          <PlayerDashboard
            players={players}
            currentPlayer={current}
            lastRoll={lastRoll}
            lastProduction={lastProduction}
            onRollDice={onRollDice}
            onSelectPlayer={(player) => setCurrent(player.id)}
            onEndTurn={endTurn}
            mode={mode}
            onSetMode={setMode}
            onBuyDevCard={buyDevCard}
            onShowDevCards={() => setShowDevCardPanel(true)}
          />
        </CollapsibleSidebar>
      </div>
    </div>
  );
}
