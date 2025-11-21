import React, { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { generateBoard, TILE_SIZE, hexCorner } from "../shared/board.js";

// Catan Sandbox — React (Vanilla JS)
// ------------------------------------------------------------
// Goals (per user):
// 1) Randomized setup (tiles + numbers, robber on desert)
// 2) Players (3 or 4) can roll dice; on 7, move robber; normal rolls award resources to players based on their towns/cities
// 3) Players can build towns, roads, cities by: (A) choosing a build tool then clicking a node/edge OR (B) clicking a node/edge first then choosing a build option
//
// Simplifications:
// - No costs or legality/distance rules; only prevents building over occupied node/edge.
// - No stealing/discarding on a 7—just move the robber.
// - Cities produce 2 resources; towns produce 1; robber blocks production on its hex.
// - No ports, dev cards, trades, or longest road.
// ------------------------------------------------------------

const BOARD_PADDING = 30;

const RESOURCES = [
  { key: "wood", label: "Lumber", color: "#2a712dff" },
  { key: "sheep", label: "Wool", color: "#7de398ff" },
  { key: "wheat", label: "Grain", color: "#f9a825" },
  { key: "brick", label: "Brick", color: "#c62828" },
  { key: "ore", label: "Ore", color: "#757575" },
  { key: "desert", label: "Desert", color: "#d4b483" },
  { key: "water", label: "Water", color: "#4a90e2" },
];

const DEFAULT_COLORS = ["#1976d2", "#e53935", "#8e24aa", "#ef6c00"]; // blue, red, purple, orange

// Building costs (standard Catan rules)
// Note: Building costs, dev cards, and game constants moved to server-side (CatanGame.js)

function resourceColor(key) {
  return RESOURCES.find((r) => r.key === key)?.color || "#ccc";
}

function prettyResource(key) {
  return RESOURCES.find((r) => r.key === key)?.label || key;
}

// Harbor trading helper functions (client-side for UI)
function getPlayerTradingRatios(playerId, nodes) {
  const ratios = { default: 4 }; // 4:1 base

  nodes.forEach((node) => {
    if (node.building && node.building.ownerId === playerId) {
      node.harbors.forEach((harbor) => {
        if (harbor.resource === "any") {
          ratios.default = Math.min(ratios.default, harbor.ratio);
        } else {
          ratios[harbor.resource] = Math.min(
            ratios[harbor.resource] || 4,
            harbor.ratio
          );
        }
      });
    }
  });

  return ratios;
}

function getBestTradingRatio(playerId, resource, nodes) {
  const ratios = getPlayerTradingRatios(playerId, nodes);
  return ratios[resource] || ratios.default;
}

// Note: Dice rolling moved to server-side (CatanGame.js)

// Note: Resource management functions moved to server-side (CatanGame.js)

// Note: Harbor trading logic moved to server-side (CatanGame.js)

function PlayerPanel({ player, isActive, onSelect }) {
  const keys = ["wood", "brick", "wheat", "sheep", "ore"];
  return (
    <div
      className={`rounded-xl p-3 shadow cursor-pointer transition-all duration-200 ${isActive ? "ring-2" : "ring-0"} hover:bg-opacity-80`}
      style={{
        background: "#101418",
        color: "#e5e7eb",
        border: `1px solid rgba(255,255,255,0.06)`,
        ringColor: isActive ? player.color : undefined,
      }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: player.color }}></span>
          <div className="font-semibold text-sm" style={{ color: player.color }}>
            {player.name}
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold text-white bg-green-600">
            <span>●</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-5 gap-1 text-xs">
        {keys.map((k) => (
          <div key={k} className="rounded px-1 py-1 text-center" style={{ background: "#0b0f13", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded"
                style={{ background: resourceColor(k) }}
              />
              <span className="text-white/70 text-xs capitalize truncate">{k}</span>
            </div>
            <div className="text-xs font-semibold">{player.resources[k] || 0}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-xs">Victory Points: </span>
          <span className="text-yellow-400 font-bold text-lg">{player.vp || 0}</span>
        </div>
      </div>
      {/* ADD THIS NEW SECTION HERE - RIGHT AFTER THE VICTORY POINTS DIV ABOVE */}
      {player.longestRoad && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-orange-400">
            <span className="text-lg">🛣️</span>
            <span className="text-xs font-bold">Longest Road (+2 VP)</span>
          </div>
        </div>
      )}
      {player.largestArmy && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-center gap-2 text-red-400">
            <span className="text-lg">⚔️</span>
            <span className="text-xs font-bold">Largest Army (+2 VP)</span>
          </div>
        </div>
      )}
    </div>
  );
}

PlayerPanel.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    resources: PropTypes.object.isRequired,
    vp: PropTypes.number.isRequired,
    longestRoad: PropTypes.bool,
    largestArmy: PropTypes.bool,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

function Toolbar({ mode, setMode, onNewBoard, onRandomize, onEndTurn, onReset, canMoveRobber, onBuyDevCard, onShowDevCards }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Main Actions Row */}
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton label="Select" active={mode === "select"} onClick={() => setMode("select")} />
        <span className="mx-1 opacity-40">|</span>
        <ToolbarButton label="Build Road" active={mode === "build-road"} onClick={() => setMode("build-road")} variant="primary" />
        <ToolbarButton label="Build Town" active={mode === "build-town"} onClick={() => setMode("build-town")} variant="primary" />
        <ToolbarButton label="Build City" active={mode === "build-city"} onClick={() => setMode("build-city")} variant="primary" />
        <span className="mx-1 opacity-40">|</span>
        <ToolbarButton label="Trade" active={mode === "trade"} onClick={() => setMode("trade")} variant="secondary" />
        <ToolbarButton label={canMoveRobber ? "Move Robber" : "Robber"} active={mode === "move-robber"} onClick={() => setMode("move-robber")} variant="danger" />
        <ToolbarButton label="Buy Dev Card" active={false} onClick={onBuyDevCard} variant="secondary" />
        <ToolbarButton label="View Cards" active={false} onClick={onShowDevCards} variant="secondary" />
      </div>
      
      {/* Game Controls Row */}
      <div className="flex flex-wrap items-center gap-2">
        <ToolbarButton label="End Turn" onClick={onEndTurn} variant="secondary" />
        <span className="mx-1 opacity-40">|</span>
        <ToolbarButton label="New Game" onClick={onNewBoard} />
        <ToolbarButton label="Reroll Setup" onClick={onRandomize} />
        <ToolbarButton label="Reset All" onClick={onReset} />
      </div>
    </div>
  );
}

Toolbar.propTypes = {
  mode: PropTypes.string.isRequired,
  setMode: PropTypes.func.isRequired,
  onNewBoard: PropTypes.func.isRequired,
  onRandomize: PropTypes.func.isRequired,
  onEndTurn: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  canMoveRobber: PropTypes.bool.isRequired,
  onBuyDevCard: PropTypes.func.isRequired,
  onShowDevCards: PropTypes.func.isRequired,
};

// Extract Button component outside to fix ESLint warning
const ToolbarButton = ({ label, active, onClick, variant = "default" }) => {
  const baseClass = "px-3 py-1 rounded-xl border text-sm font-medium transition-all duration-200 transform";
  let colorClass = "";
  
  if (variant === "primary") {
    colorClass = active 
      ? "bg-blue-600 text-white border-blue-500 shadow-lg" 
      : "bg-blue-500 text-white border-blue-400 hover:bg-blue-400 hover:shadow-md active:scale-95";
  } else if (variant === "secondary") {
    colorClass = active 
      ? "bg-green-600 text-white border-green-500 shadow-lg"
      : "bg-gray-700 text-gray-200 border-gray-600 hover:bg-gray-600 hover:shadow-md active:scale-95";
  } else if (variant === "danger") {
    colorClass = active 
      ? "bg-red-600 text-white border-red-500 shadow-lg"
      : "bg-red-500 text-white border-red-400 hover:bg-red-400 hover:shadow-md active:scale-95";
  } else {
    colorClass = active 
      ? "bg-white text-black border-gray-300 shadow-lg"
      : "border-gray-600 text-gray-300 hover:bg-gray-700 hover:shadow-md active:scale-95";
  }
  
  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${colorClass}`}
    >
      {label}
    </button>
  );
};

ToolbarButton.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.string,
};

function DicePanel({ lastRoll, onRoll }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onRoll}
        className="px-6 py-3 rounded-xl border-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95 border-yellow-400"
      >
        🎲 Roll Dice 🎲
      </button>
      <div className="text-white/80 text-sm">
        {lastRoll ? (
          <span>
            Last roll: <b>{lastRoll.total}</b> ({lastRoll.d1} + {lastRoll.d2})
          </span>
        ) : (
          <span>No roll yet</span>
        )}
      </div>
    </div>
  );
}

DicePanel.propTypes = {
  lastRoll: PropTypes.shape({
    d1: PropTypes.number.isRequired,
    d2: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
  }),
  onRoll: PropTypes.func.isRequired,
};

function ProductionDisplay({ productionData }) {
  if (!productionData?.players?.length) {
    return null;
  }

  return (
    <div className="mt-2 p-3 rounded-xl bg-[#0b0f13] border border-white/10">
      <div className="text-white/90 text-sm font-semibold mb-2 flex items-center gap-2">
        <span className="bg-green-500 w-3 h-3 rounded"></span>
        Last Production (Roll: {productionData.rollTotal})
      </div>
      <div className="space-y-2">
        {productionData.players.map((playerProduction) => (
          <div key={playerProduction.playerId} className="flex items-center justify-between p-2 rounded-lg bg-[#101418]">
            <div className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded" 
                style={{ backgroundColor: playerProduction.playerColor }}
              ></span>
              <span className="text-white/90 text-sm font-medium">
                {playerProduction.playerName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {playerProduction.resources.map(({ resource, amount }) => (
                <div key={resource} className="flex items-center gap-1 px-2 py-1 rounded bg-[#0b0f13]">
                  <span 
                    className="w-2 h-2 rounded" 
                    style={{ backgroundColor: resourceColor(resource) }}
                  ></span>
                  <span className="text-white/80 text-xs capitalize">{resource}</span>
                  <span className="text-white font-semibold text-xs">+{amount}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

ProductionDisplay.propTypes = {
  productionData: PropTypes.shape({
    rollTotal: PropTypes.number.isRequired,
    players: PropTypes.arrayOf(
      PropTypes.shape({
        playerId: PropTypes.number.isRequired,
        playerColor: PropTypes.string.isRequired,
        resources: PropTypes.object.isRequired,
      })
    ).isRequired,
  }),
};

function TradePanel({ currentPlayer, onTrade, onClose, nodes }) {
  const [giveAmounts, setGiveAmounts] = useState({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
  const [receiveAmounts, setReceiveAmounts] = useState({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
  const resources = ["wood", "brick", "wheat", "sheep", "ore"];
  
  // Get player's trading ratios based on harbors
  const tradingRatios = getPlayerTradingRatios(currentPlayer.id, nodes);
  
  // Calculate total resources being given and received
  const totalGive = Object.values(giveAmounts).reduce((sum, val) => sum + val, 0);
  const totalReceive = Object.values(receiveAmounts).reduce((sum, val) => sum + val, 0);
  
  // Check if trade is valid based on available ratios
  const giveResource = Object.entries(giveAmounts).find(([, amount]) => amount > 0)?.[0];
  const requiredRatio = giveResource ? getBestTradingRatio(currentPlayer.id, giveResource, nodes) : 4;
  
  const canTrade = totalGive === requiredRatio && totalReceive === 1 && 
    Object.entries(giveAmounts).every(([resource, amount]) => 
      (currentPlayer.resources[resource] || 0) >= amount
    );

  const handleGiveChange = (resource, amount) => {
    // Reset all give amounts when selecting a new resource (since ratios might be different)
    const newAmounts = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };
    newAmounts[resource] = Math.max(0, amount);
    setGiveAmounts(newAmounts);
  };

  const handleReceiveChange = (resource, amount) => {
    setReceiveAmounts(prev => ({ ...prev, [resource]: Math.max(0, amount) }));
  };

  const executeTrade = () => {
    if (!canTrade) {
      console.log("Trade validation failed:", { canTrade, totalGive, totalReceive, currentPlayer: currentPlayer.resources });
      return;
    }
    
    // Convert amounts to trade format
    const giveResource = Object.entries(giveAmounts).find(([, amount]) => amount > 0)?.[0];
    const receiveResource = Object.entries(receiveAmounts).find(([, amount]) => amount > 0)?.[0];
    
    console.log("Attempting trade:", { giveResource, receiveResource, giveAmounts, receiveAmounts });
    
    if (giveResource && receiveResource) {
      onTrade(giveResource, receiveResource);
      // Reset trade amounts
      setGiveAmounts({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
      setReceiveAmounts({ wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 });
    }
  };

  return (
    <div className="p-4 rounded-xl border bg-[#101418] space-y-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-white text-lg font-bold">Resource Trading</div>
          <div className="text-white/70 text-sm">
            Your harbors: 
            {Object.keys(tradingRatios).length > 1 ? (
              <span className="ml-1">
                {Object.entries(tradingRatios).map(([resource, ratio]) => (
                  <span key={resource} className="ml-2">
                    {resource === 'default' ? `${ratio}:1 (any)` : `${ratio}:1 (${resource})`}
                  </span>
                ))}
              </span>
            ) : (
              <span className="ml-1">4:1 (no harbors)</span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-lg border text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
          style={{ borderColor: "rgba(255,255,255,0.25)" }}
        >
          ✕ Close
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Give Section */}
        <div className="space-y-3">
          <div className="text-white/90 font-semibold flex items-center gap-2">
            <span className="bg-red-500 w-3 h-3 rounded"></span>
            Give Away (Total: {totalGive}/{requiredRatio})
          </div>
          <div className="space-y-2">
            {resources.map(resource => {
              const available = currentPlayer.resources[resource] || 0;
              const resourceRatio = getBestTradingRatio(currentPlayer.id, resource, nodes);
              const maxGive = Math.min(available, resourceRatio);
              return (
                <div key={resource} className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f13]">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded" 
                      style={{ backgroundColor: resourceColor(resource) }}
                    ></span>
                    <span className="text-white/90 capitalize font-medium">{resource}</span>
                    <span className="text-white/60 text-xs">
                      ({available} available, {resourceRatio}:1 ratio)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleGiveChange(resource, giveAmounts[resource] - 1)}
                      disabled={giveAmounts[resource] <= 0}
                      className="w-6 h-6 rounded bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-white font-semibold">{giveAmounts[resource]}</span>
                    <button
                      onClick={() => handleGiveChange(resource, giveAmounts[resource] + 1)}
                      disabled={giveAmounts[resource] >= maxGive || totalGive >= resourceRatio}
                      className="w-6 h-6 rounded bg-red-500 text-white text-sm font-bold hover:bg-red-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Receive Section */}
        <div className="space-y-3">
          <div className="text-white/90 font-semibold flex items-center gap-2">
            <span className="bg-green-500 w-3 h-3 rounded"></span>
            Receive (Total: {totalReceive}/1)
          </div>
          <div className="space-y-2">
            {resources.map(resource => (
              <div key={resource} className="flex items-center justify-between p-2 rounded-lg bg-[#0b0f13]">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: resourceColor(resource) }}
                  ></span>
                  <span className="text-white/90 capitalize font-medium">{resource}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReceiveChange(resource, receiveAmounts[resource] - 1)}
                    disabled={receiveAmounts[resource] <= 0}
                    className="w-6 h-6 rounded bg-green-500 text-white text-sm font-bold hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-white font-semibold">{receiveAmounts[resource]}</span>
                  <button
                    onClick={() => handleReceiveChange(resource, receiveAmounts[resource] + 1)}
                    disabled={receiveAmounts[resource] >= 1 || totalReceive >= 1}
                    className="w-6 h-6 rounded bg-green-500 text-white text-sm font-bold hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trade Action */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="text-sm text-white/70">
          {totalGive < requiredRatio && totalReceive < 1 && `Select ${requiredRatio} resources to give and 1 to receive`}
          {totalGive === requiredRatio && totalReceive < 1 && "Now select 1 resource to receive"}
          {totalGive < requiredRatio && totalReceive === 1 && `Select ${requiredRatio - totalGive} more resources to give`}
          {totalGive > requiredRatio && "Too many resources selected to give"}
          {totalReceive > 1 && "Can only receive 1 resource"}
          {!canTrade && totalGive === requiredRatio && totalReceive === 1 && "Not enough resources available"}
        </div>
        <button
          disabled={!canTrade}
          onClick={executeTrade}
          className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
            canTrade 
              ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-95 shadow-md" 
              : "bg-gray-600 text-gray-400 cursor-not-allowed"
          }`}
        >
          Execute Trade
        </button>
      </div>
    </div>
  );
}

TradePanel.propTypes = {
  currentPlayer: PropTypes.shape({
    id: PropTypes.number.isRequired,
    resources: PropTypes.object.isRequired,
  }).isRequired,
  onTrade: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  nodes: PropTypes.array.isRequired,
};

function useBoard() {
  const [board, setBoard] = useState(() => generateBoard());
  const rerandomize = () => setBoard(generateBoard());

  // Live dimensions for SVG
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

function numberTokenStyle(n) {
  const hot = n === 6 || n === 8;
  return {
    fill: "#fff",
    stroke: hot ? "#d32f2f" : "#111",
    strokeWidth: 2,
    color: hot ? "#d32f2f" : "#111",
  };
}

function hexPolygonPath(center, size) {
  const pts = Array.from({ length: 6 }, (_, i) => hexCorner(center, size, i));
  return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
}

// FUNCTION FOR VICTORY POINTS 
// Note: VP calculation moved to server-side (CatanGame.js)

// Note: Game logic functions moved to server-side (CatanGame.js)

// Note: Longest road and largest army calculations moved to server-side (CatanGame.js)


export default function CatanSandbox() {
  const { board, setBoard, rerandomize, bbox } = useBoard();

  const [stage, setStage] = useState("setup"); // setup | play
  const [numPlayers, setNumPlayers] = useState(4);
  const [players, setPlayers] = useState([]);
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState("select"); // select | build-road | build-town | build-city | move-robber | trade
  const [lastRoll, setLastRoll] = useState(null);
  const [selection, setSelection] = useState(null); // {type:'node'|'edge'|'hex', id:number}
  const [lastAction, setLastAction] = useState(null); // For visual feedback
  const [lastProduction, setLastProduction] = useState(null); // {rollTotal, players: [{playerId, playerName, resources: [{resource, amount}]}]}
  const [devCardDeck, setDevCardDeck] = useState([]);
  const [showDevCardPanel, setShowDevCardPanel] = useState(false);
  const [showMonopolyModal, setShowMonopolyModal] = useState(false);
  const [showYearOfPlentyModal, setShowYearOfPlentyModal] = useState(false);
  const [winner, setWinner] = useState(null);

  // NEW: backend game id
  const [gameId, setGameId] = useState(null);

  // NEW: create a game on the server when the component mounts
  React.useEffect(() => {
    async function createGame() {
      const res = await fetch("http://localhost:4000/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numPlayers: 4 }), // or numPlayers if you wire that up
      });

      const data = await res.json();
      setGameId(data.id);

      // hydrate local state from server state
      setBoard(data.board);
      setPlayers(data.players);
      setCurrent(data.current);
      setLastRoll(data.lastRoll || null);
      setWinner(data.winner || null);
      setStage("play"); // or "setup" if you keep your existing setup flow
    }

    createGame();
  }, [setBoard]); // empty-ish deps: runs once on mount

  const API_BASE = "http://localhost:4000"; // or leave off host if you use a Vite proxy
  // Helper to send actions to server and update state accordingly

  // Handles errors and updates lastAction for feedback
  const sendAction = async (type, payload = {}) => {
    if (!gameId) {
      console.warn("No gameId yet, ignoring action", type);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/games/${gameId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
      });

      const data = await res.json();

      if (!data.ok) {
        console.error("Action error:", data.error);
        setLastAction({
          type: "error",
          message: data.error,
          timestamp: Date.now(),
        });
        setTimeout(() => setLastAction(null), 3000);
        return;
      }

      const state = data.state;

      // Hydrate client state from server
      setBoard(state.board);
      setPlayers(state.players);
      setCurrent(state.current);
      setLastRoll(state.lastRoll || null);
      setLastProduction(state.lastProduction || null);
      setWinner(state.winner || null);

      const winner = state.winner;
      if (winner) {
        setLastAction({
          type: "success",
          message: `${winner.name} wins with ${winner.vp} VP!`,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error("sendAction fetch failed:", err);
      setLastAction({
        type: "error",
        message: "Network error talking to Catan API",
        timestamp: Date.now(),
      });
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  // Helper function to place initial settlements and roads
  const placeInitialBuildings = (newBoard) => {
    const { nodes, edges, tiles } = newBoard;
    
    // Find desert tile indices
    const desertTileIndices = tiles
      .map((tile, index) => tile.resource === "desert" ? index : -1)
      .filter(index => index !== -1);
    
    // Filter out nodes that are adjacent to desert tiles or not buildable
    const availableNodes = nodes.filter(n => {
      if (n.building) return false; // already occupied
      if (!n.canBuild) return false; // not adjacent to land
      
      // Check if this node is adjacent to any desert tile
      const isAdjacentToDesert = n.adjHexes.some(hexIdx => 
        desertTileIndices.includes(hexIdx)
      );
      
      return !isAdjacentToDesert; // only allow nodes NOT adjacent to desert
    });
    
    // For each player, place 2 towns and connect each with a road
    for (let playerId = 0; playerId < numPlayers; playerId++) {
      for (let settlement = 0; settlement < 2; settlement++) {
        if (availableNodes.length === 0) break;
        
        // Randomly select a node for the town
        const randomIndex = Math.floor(Math.random() * availableNodes.length);
        const selectedNode = availableNodes[randomIndex];
        
        // Place the town
        selectedNode.building = { ownerId: playerId, type: "town" };
        
        // Remove this node from available nodes
        availableNodes.splice(randomIndex, 1);
        
        // Find edges connected to this node and place a road on a random one
        // Only consider edges where both connected nodes are buildable
        const connectedEdges = edges.filter(e => {
          if (e.ownerId !== null) return false; // edge already owned
          
          const isConnected = e.n1 === selectedNode.id || e.n2 === selectedNode.id;
          if (!isConnected) return false;
          
          // Check if both nodes connected by this edge are buildable
          const node1 = nodes.find(n => n.id === e.n1);
          const node2 = nodes.find(n => n.id === e.n2);
          
          return node1?.canBuild && node2?.canBuild;
        });
        
        if (connectedEdges.length > 0) {
          const randomEdgeIndex = Math.floor(Math.random() * connectedEdges.length);
          connectedEdges[randomEdgeIndex].ownerId = playerId;
        }
        
        // Remove nodes that are too close (adjacent) to maintain some spacing
        const adjacentNodeIds = edges
          .filter(e => e.n1 === selectedNode.id || e.n2 === selectedNode.id)
          .flatMap(e => [e.n1, e.n2])
          .filter(id => id !== selectedNode.id);
        
        // Remove adjacent nodes from available nodes to prevent too close placement
        for (let i = availableNodes.length - 1; i >= 0; i--) {
          if (adjacentNodeIds.includes(availableNodes[i].id)) {
            availableNodes.splice(i, 1);
          }
        }
      }
    }
    
    return newBoard;
  };

  // Initialize a new game
  const startGame = () => {
    const ppl = Array.from({ length: numPlayers }, (_, i) => ({
      id: i,
      name: `Player ${i + 1}`,
      color: DEFAULT_COLORS[i],
      resources: { wood: 1, brick: 1, wheat: 1, sheep: 1, ore: 1 }, // Starting resources
      vp: 0,
      devCards: [],
      playedDevCards: [],
      knightsPlayed: 0,
      largestArmy: false,
      longestRoad: false,
      boughtDevCardThisTurn: false
    }));
    
    // Shuffle dev card deck
    const shuffledDeck = randShuffle([...DEV_CARD_DECK]);
    setDevCardDeck(shuffledDeck);
    
    // Use the existing board (that may have been customized) and add initial placements
    const boardWithInitialPlacements = placeInitialBuildings(board);
    setBoard(boardWithInitialPlacements);
    
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
    // Generate a fresh board without initial placements
    setBoard(generateBoard());
  };

  const endTurn = () => {
    sendAction("endTurn");
    setMode("select");
    setSelection(null);
    setLastProduction(null);
  };

  const onRollDice = () => {
    if (!gameId) return;
    sendAction("rollDice");
  };

  const moveRobberTo = (hexId) => {
    setBoard((b) => {
      const tiles = b.tiles.map((t, i) => ({ ...t, hasRobber: i === hexId }));
      return { ...b, tiles };
    });
    setMode("select");
    setSelection(null);
  };

  const tryBuildOnEdge = (edgeId) => {
    sendAction("buildRoad", { edgeId, playerId: current });
    setSelection(null); // Close action panel
  };
  
  const tryBuildOnNode = (nodeId, buildType) => {
    if (buildType === "town") {
      sendAction("buildTown", { nodeId, playerId: current });
    } else if (buildType === "city") {
      sendAction("buildCity", { nodeId, playerId: current });
    }
    setSelection(null); // Close action panel
  };  // Click handlers --------------------------------------------------
    const onClickHex = (hexId) => {
    if (mode === "move-robber") {
      // was moveRobberTo(hexId);
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

  // Trade function with harbor support
  const executeTrade = (giveResource, receiveResource) => {
    sendAction("harborTrade", { 
      playerId: current, 
      giveResource, 
      receiveResource 
    });
  };



  const buyDevCard = () => {
    sendAction("buyDevCard");
  };


  
  const playDevCard = (cardIndex) => {
    const currentPlayer = players[current];
    const card = currentPlayer.devCards[cardIndex];
    
    if (!card.canPlay) {
      setLastAction({ type: 'error', message: 'Cannot play card bought this turn!', timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 2000);
      return;
    }
    
    if (card.type === 'victory') {
      setLastAction({ type: 'error', message: 'Victory point cards are automatically counted!', timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 2000);
      return;
    }
    
    // Handle different card types
    if (card.type === 'knight') {
      playKnight(cardIndex);
    } else if (card.type === 'road-building') {
      playRoadBuilding(cardIndex);
    } else if (card.type === 'year-of-plenty') {
      setShowYearOfPlentyModal(true);
      setShowDevCardPanel(false);
    } else if (card.type === 'monopoly') {
      setShowMonopolyModal(true);
      setShowDevCardPanel(false);
    }
  };
  
  const playKnight = (cardIndex) => {
    setPlayers(prevPlayers => {
      let newPlayers = prevPlayers.map(p => {
        if (p.id === current) {
          const newDevCards = p.devCards.filter((_, i) => i !== cardIndex);
          return {
            ...p,
            devCards: newDevCards,
            playedDevCards: [...p.playedDevCards, 'knight'],
            knightsPlayed: p.knightsPlayed + 1
          };
        }
        return p;
      });
      
      // Update largest army
      newPlayers = updateLargestArmy(newPlayers);
      
      // Recalculate VP
      return newPlayers.map(p => ({
        ...p,
        vp: calculateVP(p, board)
      }));
    });
    
    setMode('move-robber');
    setShowDevCardPanel(false);
    setLastAction({ type: 'success', message: 'Knight played! Move the robber.', timestamp: Date.now() });
    setTimeout(() => setLastAction(null), 2000);
  };
  
  const playRoadBuilding = (cardIndex) => {
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(p => {
        if (p.id === current) {
          const newDevCards = p.devCards.filter((_, i) => i !== cardIndex);
          return {
            ...p,
            devCards: newDevCards,
            playedDevCards: [...p.playedDevCards, 'road-building']
          };
        }
        return p;
      });
      return newPlayers;
    });
    
    setShowDevCardPanel(false);
    setLastAction({ type: 'success', message: 'Road Building! Build 2 free roads.', timestamp: Date.now() });
    setTimeout(() => setLastAction(null), 3000);
  };
  
  const playYearOfPlenty = (resource1, resource2) => {
    setPlayers(prevPlayers => {
      const newPlayers = prevPlayers.map(p => {
        if (p.id === current) {
          const cardIndex = p.devCards.findIndex(c => c.type === 'year-of-plenty' && c.canPlay);
          if (cardIndex === -1) return p;
          
          const newDevCards = p.devCards.filter((_, i) => i !== cardIndex);
          const newResources = { ...p.resources };
          newResources[resource1] = (newResources[resource1] || 0) + 1;
          newResources[resource2] = (newResources[resource2] || 0) + 1;
          
          return {
            ...p,
            devCards: newDevCards,
            playedDevCards: [...p.playedDevCards, 'year-of-plenty'],
            resources: newResources
          };
        }
        return p;
      });
      return newPlayers;
    });
    
    setShowYearOfPlentyModal(false);
    setLastAction({ type: 'success', message: 'Year of Plenty played!', timestamp: Date.now() });
    setTimeout(() => setLastAction(null), 2000);
  };
  
  const playMonopoly = (resource) => {
    setPlayers(prevPlayers => {
      let totalStolen = 0;
      const newPlayers = prevPlayers.map(p => {
        if (p.id === current) {
          const cardIndex = p.devCards.findIndex(c => c.type === 'monopoly' && c.canPlay);
          if (cardIndex === -1) return p;
          
          const newDevCards = p.devCards.filter((_, i) => i !== cardIndex);
          const newResources = { ...p.resources };
          newResources[resource] = (newResources[resource] || 0) + totalStolen;
          
          return {
            ...p,
            devCards: newDevCards,
            playedDevCards: [...p.playedDevCards, 'monopoly'],
            resources: newResources
          };
        } else {
          // Steal from other players
          const amount = p.resources[resource] || 0;
          totalStolen += amount;
          const newResources = { ...p.resources };
          newResources[resource] = 0;
          return { ...p, resources: newResources };
        }
      });
      return newPlayers;
    });
    
    setShowMonopolyModal(false);
    setLastAction({ type: 'success', message: `Monopoly! Collected ${totalStolen} ${resource}.`, timestamp: Date.now() });
    setTimeout(() => setLastAction(null), 2000);
  };

  // Dev Card Panel Component
  const DevCardPanel = () => {
    const currentPlayer = players[current];
    if (!currentPlayer) return null;
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowDevCardPanel(false)}>
        <div className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-slate-600" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Your Development Cards</h2>
            <button
              onClick={() => setShowDevCardPanel(false)}
              className="px-3 py-1 rounded-lg border text-white hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          
          {currentPlayer.devCards.length === 0 ? (
            <p className="text-white/70 text-center py-8">No development cards</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentPlayer.devCards.map((card, index) => {
                const cardInfo = {
                  victory: { name: 'Victory Point', emoji: '⭐', color: 'yellow' },
                  knight: { name: 'Knight', emoji: '⚔️', color: 'red' },
                  'road-building': { name: 'Road Building', emoji: '🛣️', color: 'orange' },
                  'year-of-plenty': { name: 'Year of Plenty', emoji: '🌾', color: 'green' },
                  monopoly: { name: 'Monopoly', emoji: '💰', color: 'purple' }
                }[card.type];
                
                return (
                  <div key={index} className={`bg-slate-700 rounded-xl p-4 border-2 ${!card.canPlay ? 'opacity-50' : ''}`}
                       style={{ borderColor: card.canPlay ? `var(--${cardInfo.color}-500)` : '#475569' }}>
                    <div className="text-4xl text-center mb-2">{cardInfo.emoji}</div>
                    <div className="text-white font-semibold text-center text-sm mb-2">{cardInfo.name}</div>
                    {card.type !== 'victory' && (
                      <button
                        disabled={!card.canPlay}
                        onClick={() => playDevCard(index)}
                        className={`w-full px-3 py-1 rounded-lg text-sm font-semibold ${
                          card.canPlay 
                            ? 'bg-blue-600 text-white hover:bg-blue-500' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {card.canPlay ? 'Play' : 'Next Turn'}
                      </button>
                    )}
                    {card.type === 'victory' && (
                      <div className="text-center text-xs text-white/70">Auto-counted</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="text-white/70 text-sm">
              <div>Knights Played: {currentPlayer.knightsPlayed}</div>
              <div>Cards Remaining in Deck: {devCardDeck.length}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Monopoly Modal
  const MonopolyModal = () => {
    const resources = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-600">
          <h2 className="text-2xl font-bold text-white mb-4">Choose Resource to Monopolize</h2>
          <div className="grid grid-cols-2 gap-3">
            {resources.map(resource => (
              <button
                key={resource}
                onClick={() => playMonopoly(resource)}
                className="px-4 py-3 rounded-xl border-2 text-white font-semibold hover:bg-white/10 transition-all flex items-center gap-2"
                style={{ borderColor: resourceColor(resource) }}
              >
                <span className="w-4 h-4 rounded" style={{ backgroundColor: resourceColor(resource) }}></span>
                <span className="capitalize">{resource}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Year of Plenty Modal
  const YearOfPlentyModal = () => {
    const [resource1, setResource1] = useState(null);
    const [resource2, setResource2] = useState(null);
    const resources = ['wood', 'brick', 'wheat', 'sheep', 'ore'];
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 border border-slate-600">
          <h2 className="text-2xl font-bold text-white mb-4">Choose 2 Resources</h2>
          <div className="mb-4">
            <div className="text-white/70 text-sm mb-2">First Resource:</div>
            <div className="grid grid-cols-3 gap-2">
              {resources.map(resource => (
                <button
                  key={resource}
                  onClick={() => setResource1(resource)}
                  className={`px-3 py-2 rounded-lg border-2 text-white text-sm font-semibold transition-all ${
                    resource1 === resource ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ borderColor: resourceColor(resource) }}
                >
                  <span className="capitalize">{resource}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <div className="text-white/70 text-sm mb-2">Second Resource:</div>
            <div className="grid grid-cols-3 gap-2">
              {resources.map(resource => (
                <button
                  key={resource}
                  onClick={() => setResource2(resource)}
                  className={`px-3 py-2 rounded-lg border-2 text-white text-sm font-semibold transition-all ${
                    resource2 === resource ? 'ring-2 ring-white' : ''
                  }`}
                  style={{ borderColor: resourceColor(resource) }}
                >
                  <span className="capitalize">{resource}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!resource1 || !resource2}
            onClick={() => playYearOfPlenty(resource1, resource2)}
            className={`w-full px-4 py-2 rounded-lg font-semibold ${
              resource1 && resource2
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  };

  // Action panel for selected element -------------------------------
  const SelectedActions = () => {
    if (!selection) return null;
    const { type, id } = selection;

    if (type === "node") {
      const node = board.nodes[id];
      
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Node #{id}</div>
            {!node.building && (
              <button
                onClick={() => tryBuildOnNode(id, "town")}
                className="px-3 py-1 rounded-xl border text-sm bg-white text-black hover:bg-gray-200"
                title="Build Town"
              >
                Build Town
              </button>
            )}
            {node.building && node.building.ownerId === current && node.building.type === "town" && (
              <button
                onClick={() => tryBuildOnNode(id, "city")}
                className="px-3 py-1 rounded-xl border text-sm bg-white text-black hover:bg-gray-200"
                title="Upgrade to City"
              >
                Upgrade to City
              </button>
            )}
            <button
              onClick={() => setSelection(null)}
              className="px-3 py-1 rounded-xl border text-sm"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (type === "edge") {
      const edge = board.edges[id];
      
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Edge #{id}</div>
            {edge.ownerId == null && (
              <button
                onClick={() => tryBuildOnEdge(id)}
                className="px-3 py-1 rounded-xl border text-sm bg-white text-black hover:bg-gray-200"
                title="Build Road"
              >
                Build Road
              </button>
            )}
            <button
              onClick={() => setSelection(null)}
              className="px-3 py-1 rounded-xl border text-sm"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    if (type === "hex") {
      const tile = board.tiles[id];
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Hex {id} — {prettyResource(tile.resource)} {tile.number ? `(${tile.number})` : ""}</div>
            {mode === "move-robber" && (
              <button
                onClick={() => moveRobberTo(id)}
                className={`px-3 py-1 rounded-xl border text-sm bg-white text-black`}
              >
                Move Robber Here
              </button>
            )}
            <button
              onClick={() => setSelection(null)}
              className="px-3 py-1 rounded-xl border text-sm"
              style={{ borderColor: "rgba(255,255,255,0.25)" }}
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render ----------------------------------------------------------
  const { minX, minY, width, height } = bbox;

  return (
    <div className="w-full min-h-screen" style={{ background: "#0b0f13" }}>
      {/* Action Feedback Notification */}
      {lastAction && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 font-medium ${
          lastAction.type === 'success' 
            ? 'bg-green-600 text-white border border-green-500' 
            : 'bg-red-600 text-white border border-red-500'
        }`}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {lastAction.type === 'success' ? '✓' : '⚠'}
            </span>
            <span>{lastAction.message}</span>
          </div>
        </div>
      )}
      
      <div className="max-w-none mx-auto p-4">
        <h1 className="text-2xl font-bold text-white">Catan Sandbox (3–4 players, JS/React)</h1>
        {stage === "setup" ? (
          <div className="mt-4 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="text-white/90 font-semibold mb-2">Players</div>
              <div className="flex items-center gap-3 text-white/90">
                <label className="text-sm opacity-80">Count:</label>
                <select
                  value={numPlayers}
                  onChange={(e) => setNumPlayers(parseInt(e.target.value, 10))}
                  className="bg-[#101418] border rounded-xl px-3 py-2"
                  style={{ borderColor: "rgba(255,255,255,0.2)", color: "#e5e7eb" }}
                >
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <div className="mt-4 text-white/80 text-sm">
                Default names/colors are assigned. You can rename players after starting by clicking their panel title.
              </div>
              <div className="mt-4">
                <button onClick={startGame} className="px-4 py-2 rounded-xl border bg-white text-black font-semibold">Start Game</button>
                <button onClick={rerandomize} className="ml-2 px-4 py-2 rounded-xl border text-white" style={{ borderColor: "rgba(255,255,255,0.25)" }}>Rerandomize Board</button>
              </div>
            </div>
            <div className="rounded-2xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="text-white/90 font-semibold mb-2">Preview</div>
              <div className="overflow-auto rounded-xl" style={{ background: "#0e141a" }}>
                <svg width="100%" viewBox={`${minX} ${minY} ${width} ${height}`}> 
                  {/* Tiles */}
                  {board.tiles.map((t, idx) => (
                    <path key={idx} d={hexPolygonPath(t.center, TILE_SIZE)} fill={resourceColor(t.resource)} stroke="#0b0f13" strokeWidth={2} />
                  ))}
                </svg>
              </div>
              <div className="mt-2 text-xs text-white/60">Setup is randomized each time.</div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-6">
            <div className="flex-1 rounded-2xl p-4 border space-y-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              {/* Toolbar Section */}
              <div className="flex items-start justify-between gap-4">
              <Toolbar
                  mode={mode}
                  setMode={setMode}
                  onNewBoard={newGame}
                  onRandomize={rerandomize}
                  onEndTurn={endTurn}
                  onReset={newGame}
                  canMoveRobber={true}
                  onBuyDevCard={buyDevCard}
                  onShowDevCards={() => setShowDevCardPanel(true)}
                />
                {mode !== "trade" && (
                  <DicePanel lastRoll={lastRoll} onRoll={onRollDice} />
                )}{(() => {
                  if (winner) {
                    return (
                      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl p-8 shadow-2xl max-w-md text-center">
                          <div className="text-6xl mb-4">🏆</div>
                          <h2 className="text-4xl font-bold text-white mb-2">Winner!</h2>
                          <p className="text-2xl text-white mb-6">
                            <span style={{ color: winner.color }} className="font-bold">{winner.name}</span> wins with {winner.vp} VP!
                          </p>
                          <button
                            onClick={newGame}
                            className="px-6 py-3 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all"
                          >
                            New Game
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                {showDevCardPanel && <DevCardPanel />}
                {showMonopolyModal && <MonopolyModal />}
                {showYearOfPlentyModal && <YearOfPlentyModal />}
              </div>

              {/* Trade Panel (when active) */}
              {mode === "trade" && (
                <TradePanel 
                  key={`trade-${current}-${JSON.stringify(players[current]?.resources)}`}
                  currentPlayer={players[current]} 
                  nodes={board.nodes}
                  onTrade={executeTrade} 
                  onClose={() => setMode("select")} 
                />
              )}

              <div className="mt-4 overflow-auto rounded-xl" style={{ background: "#0e141a" }}>
                <svg
                  width="100%"
                  viewBox={`${minX} ${minY} ${width} ${height}`}
                  style={{ cursor: mode === "move-robber" ? "crosshair" : "default" }}
                >
                  {/* Grid aura */}
                  <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.4" />
                    </filter>
                  </defs>

                  {/* Tiles */}
                  {board.tiles.map((t, idx) => (
                    <g key={idx} onClick={() => onClickHex(idx)} style={{ pointerEvents: "all" }}>
                      <path
                        d={hexPolygonPath(t.center, TILE_SIZE)}
                        fill={resourceColor(t.resource)}
                        stroke="#0b0f13"
                        strokeWidth={2}
                        filter="url(#shadow)"
                        opacity={selection?.type === "hex" && selection?.id === idx ? 0.9 : 1}
                      />
                      {/* Number token */}
                      {t.number && (
                        <g>
                          <circle cx={t.center.x} cy={t.center.y} r={16} {...numberTokenStyle(t.number)} />
                          <text x={t.center.x} y={t.center.y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={numberTokenStyle(t.number).color}>{t.number}</text>
                        </g>
                      )}
                      {/* Robber */}
                      {t.hasRobber && (
                        <g>
                          <circle cx={t.center.x} cy={t.center.y} r={8} fill="#000" stroke="#fff" strokeWidth={2} />
                          <text x={t.center.x} y={t.center.y - 14} textAnchor="middle" fontSize={10} fill="#fff">Robber</text>
                        </g>
                      )}
                      {/* Harbor */}
                      {t.harbor && (
                        <g>
                          <circle cx={t.center.x} cy={t.center.y} r={12} fill="#fff" stroke="#333" strokeWidth={2} />
                          <text x={t.center.x} y={t.center.y + 3} textAnchor="middle" fontSize={8} fill="#333" fontWeight="bold">
                            {t.harbor.type}
                          </text>
                          {t.harbor.resource !== "any" && (
                            <circle cx={t.center.x} cy={t.center.y - 18} r={4} fill={resourceColor(t.harbor.resource)} stroke="#fff" strokeWidth={1} />
                          )}
                        </g>
                      )}
                    </g>
                  ))}

                  {/* Roads (edges) */}
                  {board.edges.map((e) => {
                    const n1 = board.nodes[e.n1];
                    const n2 = board.nodes[e.n2];
                    const ownerColor = e.ownerId != null ? players[e.ownerId]?.color : "#9aa0a6";
                    const isSelected = selection?.type === "edge" && selection?.id === e.id;
                    return (
                      <g key={e.id} onClick={() => onClickEdge(e.id)} style={{ pointerEvents: "stroke" }}>
                        <line
                          x1={n1.x}
                          y1={n1.y}
                          x2={n2.x}
                          y2={n2.y}
                          stroke={ownerColor}
                          strokeWidth={e.ownerId != null ? 8 : 6}
                          strokeLinecap="round"
                          opacity={isSelected ? 0.9 : 0.75}
                        />
                        {/* Invisible thicker hit area for easier clicking */}
                        <line
                          x1={n1.x}
                          y1={n1.y}
                          x2={n2.x}
                          y2={n2.y}
                          stroke="transparent"
                          strokeWidth={20}
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}

                  {/* Towns/Cities (nodes) */}
                  {board.nodes.map((n) => {
                    const isSelected = selection?.type === "node" && selection?.id === n.id;
                    const b = n.building;
                    const fill = b ? players[b.ownerId]?.color : "#111827";
                    const stroke = b ? "#fff" : "#9aa0a6";
                    const r = b?.type === "city" ? 9 : 6; // city bigger
                    return (
                      <g key={n.id} onClick={() => onClickNode(n.id)} style={{ pointerEvents: "all" }}>
                        <circle cx={n.x} cy={n.y} r={r + 2} fill="#000" opacity={0.25} />
                        <circle
                          cx={n.x}
                          cy={n.y}
                          r={r}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={isSelected ? 3 : 2}
                        />
                        {/* Easier hit area */}
                        <circle cx={n.x} cy={n.y} r={14} fill="transparent" />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <SelectedActions />

              <div className="mt-3 text-white/70 text-sm">
                <ul className="list-disc pl-6 space-y-1">
                  <li>Click <b>Roll Dice</b> each turn. On a 7, switch to <b>Move Robber</b> mode and click any hex.</li>
                  <li>Build by selecting a tool (Build Road/Town/City) then clicking an edge/node — OR click a node/edge first to open its action panel.</li>
                  <li>No costs or rule checks are enforced; you can’t build over existing pieces. Cities upgrade your own towns.</li>
                </ul>
              </div>
            </div>

            <div className="w-80 flex-shrink-0 rounded-2xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="text-white/90 font-semibold mb-4">Game Status</div>
              
              {/* 2x3 Grid Layout */}
              <div className="grid grid-cols-2 grid-rows-3 gap-3 h-[500px]">
                {/* Row 1: Current Turn */}
                <div className="rounded-xl p-3 border flex flex-col" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#101418" }}>
                  <div className="text-white/90 font-semibold mb-2 text-sm">Current Turn</div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-full border flex-grow" style={{ 
                    borderColor: players[current]?.color || "rgba(255,255,255,0.2)",
                    backgroundColor: players[current]?.color ? `${players[current].color}20` : "rgba(255,255,255,0.05)"
                  }}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: players[current]?.color || "#fff" }}></span>
                      <span style={{ color: players[current]?.color || "#fff" }} className="font-semibold text-sm">{players[current]?.name || "No Player"}</span>
                    </div>
                  </div>
                </div>
                
                {/* Row 1: Last Production */}
                <div className="rounded-xl p-3 border flex flex-col" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#101418" }}>
                  <div className="text-white/90 font-semibold mb-2 text-sm">Last Production</div>
                  <div className="flex-grow overflow-hidden">
                    {lastProduction && lastProduction.players.length > 0 ? (
                      <div className="space-y-2 h-full">
                        <div className="text-white/70 text-xs">Roll: {lastProduction.rollTotal}</div>
                        <div className="space-y-1 overflow-y-auto h-full">
                          {lastProduction.players.map((playerProduction) => (
                            <div key={playerProduction.playerId} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <span 
                                  className="w-2 h-2 rounded" 
                                  style={{ backgroundColor: playerProduction.playerColor }}
                                ></span>
                                <span className="text-white/80 truncate">{playerProduction.playerName}</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {playerProduction.resources.map(({ resource, amount }) => (
                                  <div key={resource} className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                                    <span 
                                      className="w-1.5 h-1.5 rounded" 
                                      style={{ backgroundColor: resourceColor(resource) }}
                                    ></span>
                                    <span className="text-white/70 text-xs capitalize">{resource}</span>
                                    <span className="text-white font-semibold text-xs">+{amount}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/50 text-xs flex items-center justify-center h-full">No recent production</div>
                    )}
                  </div>
                </div>

                {/* Row 2-3: Players */}
                {[0, 1, 2, 3].map((playerIndex) => (
                  <div key={playerIndex} className="rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    {players[playerIndex] ? (
                      <PlayerPanel 
                        player={players[playerIndex]} 
                        isActive={playerIndex === current} 
                        onSelect={() => setCurrent(playerIndex)} 
                      />
                    ) : (
                      <div className="p-3 h-full flex items-center justify-center rounded-xl" style={{ backgroundColor: "#0a0e12" }}>
                        <span className="text-white/30 text-xs">Empty Slot</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Resource Legend */}
              <div className="mt-4 rounded-xl p-3 border" style={{ borderColor: "rgba(255,255,255,0.1)", backgroundColor: "#101418" }}>
                <div className="text-white/90 font-semibold mb-3 text-sm">Resource Legend</div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { resource: 'wood', name: 'Wood (Forest)' },
                    { resource: 'brick', name: 'Brick (Hills)' },
                    { resource: 'wheat', name: 'Wheat (Fields)' },
                    { resource: 'sheep', name: 'Sheep (Pasture)' },
                    { resource: 'ore', name: 'Ore (Mountains)' },
                    { resource: 'desert', name: 'Desert (No Resource)' },
                    { resource: 'water', name: 'Water (Harbors)' }
                  ].map(({ resource, name }) => {
                    const color = resourceColor(resource);
                    return (
                      <div key={resource} className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-5 h-5 rounded border-2 border-white/30 flex-shrink-0" 
                            style={{ 
                              backgroundColor: color,
                              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)'
                            }}
                          ></div>
                          <span className="text-white/80 text-xs">{name}</span>
                        </div>
                        <span className="text-white/50 text-xs font-mono">{color}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
