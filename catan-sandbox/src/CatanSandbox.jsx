import React, { useMemo, useRef, useState } from "react";

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

const TILE_SIZE = 48; // radius of a hex (px)
const BOARD_PADDING = 30;
const HEX_RADIUS = 2; // standard Catan board (radius 2) => 19 tiles
const WATER_RADIUS = 3; // water extends one more ring around the land

const RESOURCES = [
  { key: "wood", label: "Lumber", color: "#2a712dff" },
  { key: "sheep", label: "Wool", color: "#7de398ff" },
  { key: "wheat", label: "Grain", color: "#f9a825" },
  { key: "brick", label: "Brick", color: "#c62828" },
  { key: "ore", label: "Ore", color: "#757575" },
  { key: "desert", label: "Desert", color: "#d4b483" },
  { key: "water", label: "Water", color: "#4a90e2" },
];

// Harbor types
const HARBORS = [
  { type: "2:1", resource: "wood", ratio: 2 },
  { type: "2:1", resource: "brick", ratio: 2 },
  { type: "2:1", resource: "wheat", ratio: 2 },
  { type: "2:1", resource: "sheep", ratio: 2 },
  { type: "2:1", resource: "ore", ratio: 2 },
  { type: "3:1", resource: "any", ratio: 3 },
  { type: "3:1", resource: "any", ratio: 3 },
  { type: "3:1", resource: "any", ratio: 3 },
  { type: "3:1", resource: "any", ratio: 3 },
];

const RESOURCE_DISTRIBUTION = [
  // Standard-ish: 4/4/4/3/3 + 1 desert
  "wood", "wood", "wood", "wood",
  "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat",
  "brick", "brick", "brick",
  "ore", "ore", "ore",
  "desert",
];

const NUMBER_TOKENS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
]; // 18 tokens; desert gets none

const DEFAULT_COLORS = ["#1976d2", "#e53935", "#8e24aa", "#ef6c00"]; // blue, red, purple, orange

// Building costs (standard Catan rules)
const BUILDING_COSTS = {
  road: { wood: 1, brick: 1 },
  town: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { wheat: 2, ore: 3 }, // upgrade cost from town
};

function randShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function axialToPixel(q, r, size) {
  // pointy-top axial
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function hexCorner(center, size, i) {
  // pointy-top hex corners (0..5)
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
}

function generateAxialHexes(radius) {
  // All axial coords within hex distance <= radius
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes; // length 19 for radius=2
}

// Helper function to calculate axial distance between two hexes
function axialDistance(hex1, hex2) {
  return (Math.abs(hex1.q - hex2.q) + Math.abs(hex1.q + hex1.r - hex2.q - hex2.r) + Math.abs(hex1.r - hex2.r)) / 2;
}

// Helper function to check if hex is on the outer edge (adjacent to land)
function isOuterEdgeHex(hex, landSet) {
  const { q, r } = hex;
  // Check all 6 adjacent hexes
  const neighbors = [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 }
  ];
  
  // Must be adjacent to at least one land hex
  return neighbors.some(neighbor => landSet.has(`${neighbor.q},${neighbor.r}`));
}

function generateBoard() {
  // 1) Generate land tiles (radius 2) and water tiles (radius 3)
  const landHexes = generateAxialHexes(HEX_RADIUS);
  const allHexes = generateAxialHexes(WATER_RADIUS);
  
  // Separate land and water hexes
  const landSet = new Set(landHexes.map(({ q, r }) => `${q},${r}`));
  const waterHexes = allHexes.filter(({ q, r }) => !landSet.has(`${q},${r}`));
  
  // Find outer edge water hexes (adjacent to land)
  const outerEdgeHexes = waterHexes.filter(hex => isOuterEdgeHex(hex, landSet));
  
  // Shuffle resources & numbers for land tiles
  const resources = randShuffle(RESOURCE_DISTRIBUTION);
  const numbers = randShuffle(NUMBER_TOKENS);
  
  // Place harbors with proper spacing
  const harbors = [...HARBORS];
  const harborPlacements = [];
  const shuffledEdgeHexes = randShuffle([...outerEdgeHexes]);
  
  for (const harbor of harbors) {
    // Find a valid placement (at least distance 2 from other harbors)
    const validHex = shuffledEdgeHexes.find(hex => {
      return harborPlacements.every(placedHex => axialDistance(hex, placedHex) >= 2);
    });
    
    if (validHex) {
      harborPlacements.push(validHex);
      validHex.harbor = harbor;
    }
  }

  // Assign land tiles
  let numberIdx = 0;
  const landTiles = landHexes.map(({ q, r }) => {
    const resource = resources.pop();
    const center = axialToPixel(q, r, TILE_SIZE);
    let number = null;
    if (resource !== "desert") {
      number = numbers[numberIdx++];
    }
    return { q, r, center, resource, number, hasRobber: resource === "desert", isWater: false };
  });

  // Assign water tiles
  const waterTiles = waterHexes.map(({ q, r, harbor }) => {
    const center = axialToPixel(q, r, TILE_SIZE);
    return { q, r, center, resource: "water", number: null, hasRobber: false, isWater: true, harbor: harbor || null };
  });

  // Combine all tiles
  const tiles = [...landTiles, ...waterTiles];

  // 2) Build nodes (corners) & edges from tile geometry
  const nodeMap = new Map(); // key -> nodeId
  const nodes = []; // {id, x, y, adjHexes:[], building:null|{ownerId,type}, harbors:[], canBuild:boolean}
  const edges = []; // {id, n1, n2, ownerId:null}
  const edgeMap = new Map(); // "minId-maxId" -> edgeId

  const roundKey = (x, y) => `${Math.round(x * 1000) / 1000}_${Math.round(y * 1000) / 1000}`;

  tiles.forEach((tile, hexIdx) => {
    const corners = Array.from({ length: 6 }, (_, i) => hexCorner(tile.center, TILE_SIZE, i));

    // Ensure nodes
    const nodeIds = corners.map((pt) => {
      const key = roundKey(pt.x, pt.y);
      if (!nodeMap.has(key)) {
        const id = nodes.length;
        nodeMap.set(key, id);
        nodes.push({ id, x: pt.x, y: pt.y, adjHexes: [hexIdx], building: null, harbors: [], canBuild: false });
        return id;
      } else {
        const id = nodeMap.get(key);
        const node = nodes[id];
        // add adjacency if missing
        if (!node.adjHexes.includes(hexIdx)) node.adjHexes.push(hexIdx);
        // add harbor if this water tile has one
        if (tile.harbor && !node.harbors.some(h => h.type === tile.harbor.type && h.resource === tile.harbor.resource)) {
          node.harbors.push(tile.harbor);
        }
        return id;
      }
    });

    // If this is a water tile with a harbor, add harbor to its corner nodes
    if (tile.harbor) {
      nodeIds.forEach(nodeId => {
        const node = nodes[nodeId];
        if (!node.harbors.some(h => h.type === tile.harbor.type && h.resource === tile.harbor.resource)) {
          node.harbors.push(tile.harbor);
        }
      });
    }

    // Ensure edges (six per tile)
    const E = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
    E.forEach(([a, b]) => {
      const n1 = nodeIds[a];
      const n2 = nodeIds[b];
      const key = n1 < n2 ? `${n1}-${n2}` : `${n2}-${n1}`;
      if (!edgeMap.has(key)) {
        const id = edges.length;
        edgeMap.set(key, id);
        edges.push({ id, n1, n2, ownerId: null });
      }
    });
  });

  // Mark nodes as buildable if they're adjacent to at least one land tile
  nodes.forEach(node => {
    node.canBuild = node.adjHexes.some(hexIdx => !tiles[hexIdx].isWater);
  });

  // Before filtering, transfer harbors from water-only nodes to nearby land-adjacent nodes
  const waterOnlyNodes = nodes.filter(node => !node.canBuild && node.harbors.length > 0);
  waterOnlyNodes.forEach(waterNode => {
    // Find the closest land-adjacent node
    const nearbyLandNodes = nodes.filter(node => 
      node.canBuild && 
      Math.abs(node.x - waterNode.x) < TILE_SIZE * 1.5 && 
      Math.abs(node.y - waterNode.y) < TILE_SIZE * 1.5
    );
    
    if (nearbyLandNodes.length > 0) {
      // Transfer harbors to the closest land node
      const closestNode = nearbyLandNodes.reduce((closest, current) => {
        const closestDist = Math.sqrt((closest.x - waterNode.x) ** 2 + (closest.y - waterNode.y) ** 2);
        const currentDist = Math.sqrt((current.x - waterNode.x) ** 2 + (current.y - waterNode.y) ** 2);
        return currentDist < closestDist ? current : closest;
      });
      
      // Add harbors to the closest land node (avoiding duplicates)
      waterNode.harbors.forEach(harbor => {
        if (!closestNode.harbors.some(h => h.type === harbor.type && h.resource === harbor.resource)) {
          closestNode.harbors.push(harbor);
        }
      });
    }
  });

  // Filter out nodes that are only adjacent to water tiles
  // Keep only nodes that are adjacent to at least one land tile
  const filteredNodes = nodes.filter(node => {
    // Keep nodes that are buildable (adjacent to land)
    return node.canBuild;
  });

  // Create a mapping from old node IDs to new node IDs
  const nodeIdMapping = new Map();
  filteredNodes.forEach((node, newIndex) => {
    nodeIdMapping.set(node.id, newIndex);
    node.id = newIndex; // Update to new sequential ID
  });

  // Filter out edges that connect to removed nodes
  // Only keep edges where both nodes are connected to land (both survived filtering)
  const filteredEdges = edges.filter(edge => {
    const hasNode1 = nodeIdMapping.has(edge.n1);
    const hasNode2 = nodeIdMapping.has(edge.n2);
    return hasNode1 && hasNode2;
  }).map((edge, newIndex) => ({
    ...edge,
    id: newIndex,
    n1: nodeIdMapping.get(edge.n1),
    n2: nodeIdMapping.get(edge.n2)
  }));

  return { tiles, nodes: filteredNodes, edges: filteredEdges };
}

function resourceColor(key) {
  return RESOURCES.find((r) => r.key === key)?.color || "#ccc";
}

function prettyResource(key) {
  return RESOURCES.find((r) => r.key === key)?.label || key;
}

function rollDice() {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  return { total: d1 + d2, d1, d2 };
}

// Helper functions for resource management
function canAfford(playerResources, cost) {
  return Object.entries(cost).every(([resource, amount]) => 
    (playerResources[resource] || 0) >= amount
  );
}

function deductResources(playerResources, cost) {
  const newResources = { ...playerResources };
  Object.entries(cost).forEach(([resource, amount]) => {
    newResources[resource] = (newResources[resource] || 0) - amount;
  });
  return newResources;
}

function addResources(playerResources, gains) {
  const newResources = { ...playerResources };
  Object.entries(gains).forEach(([resource, amount]) => {
    newResources[resource] = (newResources[resource] || 0) + amount;
  });
  return newResources;
}

// Helper function to get available trading ratios for a player
function getPlayerTradingRatios(playerId, nodes) {
  const ratios = { default: 4 }; // Default 4:1 trading
  
  // Check all nodes where player has buildings
  nodes.forEach(node => {
    if (node.building && node.building.ownerId === playerId) {
      // Check harbors at this node
      node.harbors.forEach(harbor => {
        if (harbor.resource === "any") {
          // 3:1 harbor for any resource
          ratios.default = Math.min(ratios.default, harbor.ratio);
        } else {
          // 2:1 harbor for specific resource
          ratios[harbor.resource] = Math.min(ratios[harbor.resource] || 4, harbor.ratio);
        }
      });
    }
  });
  
  return ratios;
}

// Helper function to get the best trading ratio for a resource
function getBestTradingRatio(playerId, resource, nodes) {
  const ratios = getPlayerTradingRatios(playerId, nodes);
  return ratios[resource] || ratios.default;
}

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
    </div>
  );
}

function Toolbar({ mode, setMode, onNewBoard, onRandomize, onEndTurn, onReset, canMoveRobber }) {
  const Button = ({ label, active, onClick, variant = "default" }) => {
    const baseClass = "px-3 py-1 rounded-xl border text-sm font-medium transition-all duration-200 transform";
    let colorClass = "";
    
    if (variant === "primary") {
      colorClass = active 
        ? "bg-blue-600 text-white border-blue-500 shadow-lg" 
        : "bg-blue-500 text-white border-blue-400 hover:bg-blue-400 hover:shadow-md active:scale-95";
    } else if (variant === "secondary") {
      colorClass = active 
        ? "bg-green-600 text-white border-green-500 shadow-lg" 
        : "bg-green-500 text-white border-green-400 hover:bg-green-400 hover:shadow-md active:scale-95";
    } else if (variant === "danger") {
      colorClass = active 
        ? "bg-red-600 text-white border-red-500 shadow-lg" 
        : "bg-red-500 text-white border-red-400 hover:bg-red-400 hover:shadow-md active:scale-95";
    } else {
      colorClass = active 
        ? "bg-white text-black border-gray-300 shadow-lg" 
        : "bg-transparent text-white border-white/20 hover:bg-white/10 hover:border-white/30 active:scale-95";
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

  return (
    <div className="flex flex-col gap-3">
      {/* Main Actions Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button label="Select" active={mode === "select"} onClick={() => setMode("select")} />
        <span className="mx-1 opacity-40">|</span>
        <Button label="Build Road" active={mode === "build-road"} onClick={() => setMode("build-road")} variant="primary" />
        <Button label="Build Town" active={mode === "build-town"} onClick={() => setMode("build-town")} variant="primary" />
        <Button label="Build City" active={mode === "build-city"} onClick={() => setMode("build-city")} variant="primary" />
        <span className="mx-1 opacity-40">|</span>
        <Button label="Trade" active={mode === "trade"} onClick={() => setMode("trade")} variant="secondary" />
        <Button label={canMoveRobber ? "Move Robber" : "Robber"} active={mode === "move-robber"} onClick={() => setMode("move-robber")} variant="danger" />
      </div>
      
      {/* Game Controls Row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button label="End Turn" onClick={onEndTurn} variant="secondary" />
        <span className="mx-1 opacity-40">|</span>
        <Button label="New Game" onClick={onNewBoard} />
        <Button label="Reroll Setup" onClick={onRandomize} />
        <Button label="Reset All" onClick={onReset} />
      </div>
    </div>
  );
}

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

function ProductionDisplay({ productionData }) {
  if (!productionData || !productionData.players.length) {
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
    }));
    
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
    setCurrent((c) => (players.length ? (c + 1) % players.length : 0));
    setMode("select");
    setSelection(null);
    setLastProduction(null); // Clear production display for new turn
  };

  const awardProduction = (rollTotal) => {
    if (!players.length) return;

    const tiles = board.tiles;
    const nodes = board.nodes;

    const newPlayers = players.map((p) => ({ ...p, resources: { ...p.resources } }));
    const productionTracking = {}; // Track production by player ID

    tiles.forEach((tile, hexIdx) => {
      if (tile.hasRobber) return; // blocked
      if (tile.number !== rollTotal) return;
      const resource = tile.resource;
      if (!resource || resource === "desert") return;

      // Nodes touching this hex get 1 (town) or 2 (city) of the resource
      // Find nodes by checking nodes whose adjHexes includes hexIdx
      nodes.forEach((n) => {
        if (n.building && n.adjHexes.includes(hexIdx)) {
          const amt = n.building.type === "city" ? 2 : 1;
          const owner = n.building.ownerId;
          
          // Update player resources
          newPlayers[owner].resources[resource] =
            (newPlayers[owner].resources[resource] || 0) + amt;
          
          // Track production for display
          if (!productionTracking[owner]) {
            productionTracking[owner] = {};
          }
          productionTracking[owner][resource] = 
            (productionTracking[owner][resource] || 0) + amt;
        }
      });
    });

    setPlayers(newPlayers);

    // Set production tracking for display
    const productionData = {
      rollTotal,
      players: Object.entries(productionTracking).map(([playerId, resources]) => ({
        playerId: parseInt(playerId),
        playerName: players[parseInt(playerId)].name,
        playerColor: players[parseInt(playerId)].color,
        resources: Object.entries(resources).map(([resource, amount]) => ({
          resource,
          amount
        }))
      }))
    };
    
    setLastProduction(productionData.players.length > 0 ? productionData : null);
  };

  const onRollDice = () => {
    const r = rollDice();
    setLastRoll(r);
    if (r.total === 7) {
      setMode("move-robber");
    } else {
      awardProduction(r.total);
    }
  };

  const moveRobberTo = (hexId) => {
    setBoard((b) => {
      const tiles = b.tiles.map((t, i) => ({ ...t, hasRobber: i === hexId }));
      return { ...b, tiles };
    });
    setMode("select");
    setSelection(null);
  };

  const tryBuildOnNode = (nodeId, buildType) => {
    const cost = BUILDING_COSTS[buildType];
    const currentPlayer = players[current];
    
    // Check if player can afford the building
    if (!canAfford(currentPlayer.resources, cost)) {
      setLastAction({ type: 'error', message: `Not enough resources for ${buildType}!`, timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 2000);
      return; // Can't afford it
    }

    let buildSuccessful = false;

    setBoard((b) => {
      const node = b.nodes[nodeId];
      if (!node) return b;
      
      // Check if node is buildable (adjacent to land)
      if (!node.canBuild) {
        setLastAction({ type: 'error', message: 'Cannot build here - no adjacent land!', timestamp: Date.now() });
        setTimeout(() => setLastAction(null), 2000);
        return b;
      }
      
      const building = node.building;
      
      if (buildType === "town") {
        if (building) {
          setLastAction({ type: 'error', message: 'Location already occupied!', timestamp: Date.now() });
          setTimeout(() => setLastAction(null), 2000);
          return b; // occupied
        }
        const updated = { ...node, building: { ownerId: current, type: "town" } };
        const nodes = b.nodes.slice();
        nodes[nodeId] = updated;
        buildSuccessful = true;
        return { ...b, nodes };
      }
      
      if (buildType === "city") {
        if (!building) {
          setLastAction({ type: 'error', message: 'Need a town first!', timestamp: Date.now() });
          setTimeout(() => setLastAction(null), 2000);
          return b; // need existing town
        }
        if (building.ownerId !== current) {
          setLastAction({ type: 'error', message: 'Not your town!', timestamp: Date.now() });
          setTimeout(() => setLastAction(null), 2000);
          return b;
        }
        if (building.type === "city") {
          setLastAction({ type: 'error', message: 'Already a city!', timestamp: Date.now() });
          setTimeout(() => setLastAction(null), 2000);
          return b;
        }
        const updated = { ...node, building: { ownerId: current, type: "city" } };
        const nodes = b.nodes.slice();
        nodes[nodeId] = updated;
        buildSuccessful = true;
        return { ...b, nodes };
      }
      
      return b;
    });

    if (buildSuccessful) {
      // Deduct resources from player
      setPlayers(prevPlayers => {
        const newPlayers = [...prevPlayers];
        newPlayers[current] = {
          ...currentPlayer,
          resources: deductResources(currentPlayer.resources, cost)
        };
        return newPlayers;
      });

      // Show success feedback
      setLastAction({ 
        type: 'success', 
        message: `${buildType} built successfully!`, 
        timestamp: Date.now() 
      });
      setTimeout(() => setLastAction(null), 2000);
    }
  };

  const tryBuildOnEdge = (edgeId) => {
    const cost = BUILDING_COSTS.road;
    const currentPlayer = players[current];
    
    // Check if player can afford the road
    if (!canAfford(currentPlayer.resources, cost)) {
      setLastAction({ type: 'error', message: 'Not enough resources for road!', timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 2000);
      return; // Can't afford it
    }

    let buildSuccessful = false;

    setBoard((b) => {
      const edge = b.edges[edgeId];
      if (!edge) return b;
      if (edge.ownerId != null) {
        setLastAction({ type: 'error', message: 'Road already exists here!', timestamp: Date.now() });
        setTimeout(() => setLastAction(null), 2000);
        return b; // occupied
      }
      
      // Check if edge connects to buildable nodes (adjacent to land)
      const node1 = b.nodes[edge.n1];
      const node2 = b.nodes[edge.n2];
      if (!node1.canBuild && !node2.canBuild) {
        setLastAction({ type: 'error', message: 'Cannot build road here - no adjacent land!', timestamp: Date.now() });
        setTimeout(() => setLastAction(null), 2000);
        return b;
      }
      const edges = b.edges.slice();
      edges[edgeId] = { ...edge, ownerId: current };
      buildSuccessful = true;
      return { ...b, edges };
    });

    if (buildSuccessful) {
      // Deduct resources from player
      setPlayers(prevPlayers => {
        const newPlayers = [...prevPlayers];
        newPlayers[current] = {
          ...currentPlayer,
          resources: deductResources(currentPlayer.resources, cost)
        };
        return newPlayers;
      });

      // Show success feedback
      setLastAction({ 
        type: 'success', 
        message: 'Road built successfully!', 
        timestamp: Date.now() 
      });
      setTimeout(() => setLastAction(null), 2000);
    }
  };

  // Click handlers --------------------------------------------------
  const onClickHex = (hexId) => {
    if (mode === "move-robber") {
      moveRobberTo(hexId);
      return;
    }
    setSelection({ type: "hex", id: hexId });
  };

  const onClickNode = (nodeId) => {
    if (mode === "build-town") {
      tryBuildOnNode(nodeId, "town");
      return;
    }
    if (mode === "build-city") {
      tryBuildOnNode(nodeId, "city");
      return;
    }
    setSelection({ type: "node", id: nodeId });
  };

  const onClickEdge = (edgeId) => {
    if (mode === "build-road") {
      tryBuildOnEdge(edgeId);
      return;
    }
    setSelection({ type: "edge", id: edgeId });
  };

  // Trade function with harbor support
  const executeTrade = (giveResource, receiveResource) => {
    const currentPlayer = players[current];
    const requiredAmount = getBestTradingRatio(currentPlayer.id, giveResource, board.nodes);
    
    // Check if player has enough of the resource to give
    if ((currentPlayer.resources[giveResource] || 0) < requiredAmount) {
      setLastAction({ type: 'error', message: `Not enough ${giveResource} to trade! Need ${requiredAmount}, have ${currentPlayer.resources[giveResource] || 0}`, timestamp: Date.now() });
      setTimeout(() => setLastAction(null), 3000);
      return; // Can't afford the trade
    }

    // Execute the trade with visual feedback
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      const newResources = { ...currentPlayer.resources };
      newResources[giveResource] = (newResources[giveResource] || 0) - requiredAmount;
      newResources[receiveResource] = (newResources[receiveResource] || 0) + 1;
      
      newPlayers[current] = {
        ...currentPlayer,
        resources: newResources
      };
      return newPlayers;
    });

    // Show success feedback
    setLastAction({ 
      type: 'success', 
      message: `Trade completed: ${requiredAmount} ${giveResource} → 1 ${receiveResource}`, 
      timestamp: Date.now() 
    });
    setTimeout(() => setLastAction(null), 3000);
    
    console.log(`Trade completed: ${requiredAmount} ${giveResource} → 1 ${receiveResource}`);
  };

  // Action panel for selected element -------------------------------
  const SelectedActions = () => {
    if (!selection) return null;
    const { type, id } = selection;

    if (type === "node") {
      const node = board.nodes[id];
      const currentPlayer = players[current];
      const canTown = !node.building && canAfford(currentPlayer.resources, BUILDING_COSTS.town);
      const canCity = node.building && node.building.ownerId === current && node.building.type === "town" && canAfford(currentPlayer.resources, BUILDING_COSTS.city);
      
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Node #{id}</div>
            <button
              disabled={!canTown}
              onClick={() => tryBuildOnNode(id, "town")}
              className={`px-3 py-1 rounded-xl border text-sm ${canTown ? "bg-white text-black" : "opacity-40"}`}
              title={!node.building ? `Town: ${Object.entries(BUILDING_COSTS.town).map(([r,c]) => `${c} ${r}`).join(', ')}` : 'Node occupied'}
            >
              Build Town
            </button>
            <button
              disabled={!canCity}
              onClick={() => tryBuildOnNode(id, "city")}
              className={`px-3 py-1 rounded-xl border text-sm ${canCity ? "bg-white text-black" : "opacity-40"}`}
              title={node.building?.type === "town" ? `City: ${Object.entries(BUILDING_COSTS.city).map(([r,c]) => `${c} ${r}`).join(', ')}` : 'Need town first'}
            >
              Upgrade to City
            </button>
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
      const currentPlayer = players[current];
      const canRoad = edge.ownerId == null && canAfford(currentPlayer.resources, BUILDING_COSTS.road);
      
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Edge #{id}</div>
            <button
              disabled={!canRoad}
              onClick={() => tryBuildOnEdge(id)}
              className={`px-3 py-1 rounded-xl border text-sm ${canRoad ? "bg-white text-black" : "opacity-40"}`}
              title={edge.ownerId == null ? `Road: ${Object.entries(BUILDING_COSTS.road).map(([r,c]) => `${c} ${r}`).join(', ')}` : 'Edge occupied'}
            >
              Build Road
            </button>
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
                />
                {mode !== "trade" && (
                  <DicePanel lastRoll={lastRoll} onRoll={onRollDice} />
                )}
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
