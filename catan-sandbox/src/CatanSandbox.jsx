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

const RESOURCES = [
  { key: "wood", label: "Lumber", color: "#2a712dff" },
  { key: "sheep", label: "Wool", color: "#7de398ff" },
  { key: "wheat", label: "Grain", color: "#f9a825" },
  { key: "brick", label: "Brick", color: "#c62828" },
  { key: "ore", label: "Ore", color: "#757575" },
  { key: "desert", label: "Desert", color: "#d4b483" },
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

function generateBoard() {
  // 1) Layout 19 axial hexes, compute centers
  const axial = generateAxialHexes(HEX_RADIUS);
  // Shuffle resources & numbers
  const resources = randShuffle(RESOURCE_DISTRIBUTION);
  const numbers = randShuffle(NUMBER_TOKENS);

  // Assign tiles
  let numberIdx = 0;
  const tiles = axial.map(({ q, r }) => {
    const resource = resources.pop();
    const center = axialToPixel(q, r, TILE_SIZE);
    let number = null;
    if (resource !== "desert") {
      number = numbers[numberIdx++];
    }
    return { q, r, center, resource, number, hasRobber: resource === "desert" };
  });

  // 2) Build nodes (corners) & edges from tile geometry
  const nodeMap = new Map(); // key -> nodeId
  const nodes = []; // {id, x, y, adjHexes:[], building:null|{ownerId,type}}
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
        nodes.push({ id, x: pt.x, y: pt.y, adjHexes: [hexIdx], building: null });
        return id;
      } else {
        const id = nodeMap.get(key);
        // add adjacency if missing
        if (!nodes[id].adjHexes.includes(hexIdx)) nodes[id].adjHexes.push(hexIdx);
        return id;
      }
    });

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

  return { tiles, nodes, edges };
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

function PlayerPanel({ player, isActive, onSelect }) {
  const keys = ["wood", "brick", "wheat", "sheep", "ore"]; 
  return (
    <div
      className={`rounded-2xl p-3 shadow ${isActive ? "ring-2" : "ring-0"}`}
      style={{
        background: "#101418",
        color: "#e5e7eb",
        border: `1px solid rgba(255,255,255,0.06)`,
        ringColor: isActive ? player.color : undefined,
      }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="font-semibold" style={{ color: player.color }}>
            {player.name}
          </div>
          {isActive && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold text-black" style={{ backgroundColor: player.color }}>
              <span>●</span>
              <span>TURN</span>
            </div>
          )}
        </div>
        <div className="text-xs opacity-80">(id {player.id+1})</div>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
        {keys.map((k) => (
          <div key={k} className="rounded-lg px-2 py-1" style={{ background: "#0b0f13", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded"
                style={{ background: resourceColor(k) }}
              />
              <span className="capitalize">{k}</span>
            </div>
            <div className="mt-1 text-center text-base font-semibold">{player.resources[k] || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toolbar({ mode, setMode, onNewBoard, onRandomize, onEndTurn, onReset, canMoveRobber }) {
  const Button = ({ label, active, onClick }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-xl border text-sm ${active ? "bg-white text-black" : "bg-transparent text-white"}`}
      style={{ borderColor: "rgba(255,255,255,0.2)" }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button label="Select" active={mode === "select"} onClick={() => setMode("select")} />
      <Button label="Build Road" active={mode === "build-road"} onClick={() => setMode("build-road")} />
      <Button label="Build Town" active={mode === "build-town"} onClick={() => setMode("build-town")} />
      <Button label="Build City" active={mode === "build-city"} onClick={() => setMode("build-city")} />
      <Button label={canMoveRobber ? "Move Robber" : "Robber"} active={mode === "move-robber"} onClick={() => setMode("move-robber")} />
      <span className="mx-2 opacity-60">|</span>
      <Button label="End Turn" onClick={onEndTurn} />
      <span className="mx-2 opacity-60">|</span>
      <Button label="New Game" onClick={onNewBoard} />
      <Button label="Reroll Setup" onClick={onRandomize} />
      <Button label="Reset All" onClick={onReset} />
    </div>
  );
}

function DicePanel({ lastRoll, onRoll }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onRoll}
        className="px-4 py-2 rounded-xl border bg-white text-black font-semibold"
      >
        Roll Dice
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
  const [mode, setMode] = useState("select"); // select | build-road | build-town | build-city | move-robber
  const [lastRoll, setLastRoll] = useState(null);
  const [selection, setSelection] = useState(null); // {type:'node'|'edge'|'hex', id:number}

  // Helper function to place initial settlements and roads
  const placeInitialBuildings = (newBoard) => {
    const { nodes, edges, tiles } = newBoard;
    
    // Find desert tile indices
    const desertTileIndices = tiles
      .map((tile, index) => tile.resource === "desert" ? index : -1)
      .filter(index => index !== -1);
    
    // Filter out nodes that are adjacent to desert tiles
    const availableNodes = nodes.filter(n => {
      if (n.building) return false; // already occupied
      
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
        const connectedEdges = edges.filter(e => 
          (e.n1 === selectedNode.id || e.n2 === selectedNode.id) && 
          e.ownerId === null
        );
        
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
      resources: { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 },
    }));
    
    // Create a new board with initial placements
    const newBoard = generateBoard();
    const boardWithInitialPlacements = placeInitialBuildings(newBoard);
    setBoard(boardWithInitialPlacements);
    
    setPlayers(ppl);
    setCurrent(0);
    setStage("play");
    setMode("select");
    setLastRoll(null);
    setSelection(null);
  };

  const newGame = () => {
    setStage("setup");
    setPlayers([]);
    setCurrent(0);
    setMode("select");
    setLastRoll(null);
    setSelection(null);
    // Generate a fresh board without initial placements
    setBoard(generateBoard());
  };

  const endTurn = () => {
    setCurrent((c) => (players.length ? (c + 1) % players.length : 0));
    setMode("select");
    setSelection(null);
  };

  const awardProduction = (rollTotal) => {
    if (!players.length) return;

    const tiles = board.tiles;
    const nodes = board.nodes;

    const newPlayers = players.map((p) => ({ ...p, resources: { ...p.resources } }));

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
          newPlayers[owner].resources[resource] =
            (newPlayers[owner].resources[resource] || 0) + amt;
        }
      });
    });

    setPlayers(newPlayers);
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
    setBoard((b) => {
      const node = b.nodes[nodeId];
      if (!node) return b;
      const building = node.building;
      if (buildType === "town") {
        if (building) return b; // occupied
        const updated = { ...node, building: { ownerId: current, type: "town" } };
        const nodes = b.nodes.slice();
        nodes[nodeId] = updated;
        return { ...b, nodes };
      }
      if (buildType === "city") {
        if (!building) return b; // need existing town
        if (building.ownerId !== current) return b;
        if (building.type === "city") return b;
        const updated = { ...node, building: { ownerId: current, type: "city" } };
        const nodes = b.nodes.slice();
        nodes[nodeId] = updated;
        return { ...b, nodes };
      }
      return b;
    });
  };

  const tryBuildOnEdge = (edgeId) => {
    setBoard((b) => {
      const edge = b.edges[edgeId];
      if (!edge) return b;
      if (edge.ownerId != null) return b; // occupied
      const edges = b.edges.slice();
      edges[edgeId] = { ...edge, ownerId: current };
      return { ...b, edges };
    });
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

  // Action panel for selected element -------------------------------
  const SelectedActions = () => {
    if (!selection) return null;
    const { type, id } = selection;

    if (type === "node") {
      const node = board.nodes[id];
      const canTown = !node.building;
      const canCity = node.building && node.building.ownerId === current && node.building.type === "town";
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Node #{id}</div>
            <button
              disabled={!canTown}
              onClick={() => tryBuildOnNode(id, "town")}
              className={`px-3 py-1 rounded-xl border text-sm ${canTown ? "bg-white text-black" : "opacity-40"}`}
            >
              Build Town
            </button>
            <button
              disabled={!canCity}
              onClick={() => tryBuildOnNode(id, "city")}
              className={`px-3 py-1 rounded-xl border text-sm ${canCity ? "bg-white text-black" : "opacity-40"}`}
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
      const canRoad = edge.ownerId == null;
      return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="rounded-2xl border bg-[#0b0f13] text-white shadow-xl p-3 flex items-center gap-2">
            <div className="text-sm opacity-80">Edge #{id}</div>
            <button
              disabled={!canRoad}
              onClick={() => tryBuildOnEdge(id)}
              className={`px-3 py-1 rounded-xl border text-sm ${canRoad ? "bg-white text-black" : "opacity-40"}`}
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
      <div className="max-w-7xl mx-auto p-4">
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
          <div className="mt-4 grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="rounded-2xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="flex items-center justify-between gap-4">
                <Toolbar
                  mode={mode}
                  setMode={setMode}
                  onNewBoard={newGame}
                  onRandomize={rerandomize}
                  onEndTurn={endTurn}
                  onReset={newGame}
                  canMoveRobber={true}
                />
                <DicePanel lastRoll={lastRoll} onRoll={onRollDice} />
              </div>

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

            <div className="rounded-2xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-white/90 font-semibold">Players</div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-full border" style={{ 
                  borderColor: players[current]?.color || "rgba(255,255,255,0.2)",
                  backgroundColor: `${players[current]?.color}20` || "rgba(255,255,255,0.05)"
                }}>
                  <span className="text-white/70 text-sm">Current Turn:</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: players[current]?.color || "#fff" }}></span>
                    <span style={{ color: players[current]?.color || "#fff" }} className="font-semibold text-sm">{players[current]?.name}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-3">
                {players.map((p, idx) => (
                  <PlayerPanel key={p.id} player={p} isActive={idx === current} onSelect={() => setCurrent(idx)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
