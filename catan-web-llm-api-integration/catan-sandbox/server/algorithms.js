// server/algorithms.js
// Heuristic agent + REAL search wrappers (MCTS + Minimax)
//
// ✅ Heuristic: expected value (2d6 probs) + resource weights + robber heuristic
// ✅ REAL MCTS: selection (UCB1), expansion, rollout, backprop
// ✅ REAL Minimax: depth-2 alpha-beta
//
// IMPORTANT: Search uses an APPROX forward model (applyActionApprox) because full Catan simulation is large.
// Your server still executes the chosen action using the real engine via performAction/applyActionSafely.

const RES_ALIASES = {
  // canonical (engine uses these)
  wood: "wood",
  brick: "brick",
  wheat: "wheat",
  sheep: "sheep",
  ore: "ore",

  // common aliases (front-end / other code)
  lumber: "wood",
  clay: "brick",
  grain: "wheat",
  wool: "sheep",
};

function normResKey(k) {
  const key = String(k || "").toLowerCase();
  return RES_ALIASES[key] || key;
}

function getRes(player, key) {
  const k = normResKey(key);
  const r = player?.resources || {};
  if (r[k] != null) return Number(r[k]) || 0;

  // tolerate unexpected keys by normalizing existing keys
  for (const [rk, rv] of Object.entries(r)) {
    if (normResKey(rk) === k) return Number(rv) || 0;
  }
  return 0;
}

function addRes(player, key, delta) {
  const k = normResKey(key);
  if (!player.resources) player.resources = {};
  const cur = Number(player.resources[k] ?? 0) || 0;
  player.resources[k] = cur + delta;
}

function canAfford(player, cost) {
  return Object.entries(cost).every(([k, v]) => getRes(player, k) >= v);
}

function payCost(player, cost) {
  for (const [k, v] of Object.entries(cost)) addRes(player, k, -v);
}

const COSTS = {
  road: { wood: 1, brick: 1 },
  town: { wood: 1, brick: 1, wheat: 1, sheep: 1 },
  city: { wheat: 2, ore: 3 },
  dev: { wheat: 1, sheep: 1, ore: 1 },
};

// 2d6 probabilities (exact)
const DICE_P = {
  2: 1 / 36,
  3: 2 / 36,
  4: 3 / 36,
  5: 4 / 36,
  6: 5 / 36,
  7: 0,
  8: 5 / 36,
  9: 4 / 36,
  10: 3 / 36,
  11: 2 / 36,
  12: 1 / 36,
};

// Resource value weights (tweakable, canonical keys)
const RES_VALUE_SETTLEMENT = { wood: 1.0, brick: 1.0, sheep: 1.0, wheat: 1.15, ore: 1.1 };
const RES_VALUE_CITY = { wood: 1.0, brick: 0.95, sheep: 0.95, wheat: 1.25, ore: 1.4 };

function uniq(arr) {
  return [...new Set(arr.filter((x) => x !== undefined && x !== null))];
}

function toInt(v) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function safePlayerId(game) {
  const p = game.players?.[game.current];
  return p?.id ?? game.current;
}

function getTileInfo(game, tileId) {
  const t = game.board?.tiles?.[tileId];
  if (!t) return null;
  const res = normResKey(t.resource);
  return { res, num: t.number, hasRobber: !!t.hasRobber };
}

// Expected production score for a node (settlement or city)
function nodeProductionScore(game, nodeId, mode = "settlement") {
  const node = game.board?.nodes?.[nodeId];
  if (!node) return -Infinity;

  const weights = mode === "city" ? RES_VALUE_CITY : RES_VALUE_SETTLEMENT;

  let score = 0;
  const seen = new Set();

  const adj = Array.isArray(node.adjHexes) ? node.adjHexes : [];
  for (const hexId of adj) {
    const ti = getTileInfo(game, hexId);
    if (!ti) continue;
    if (!ti.res || ti.res === "desert") continue;

    const p = DICE_P[ti.num] ?? 0;
    const w = weights[ti.res] ?? 1.0;

    score += p * w;
    if (ti.hasRobber) score -= 0.15; // robber penalty
    seen.add(ti.res);
  }

  // small diversity bonus
  score += Math.max(0, seen.size - 1) * 0.05;

  return score;
}

function edgeExpansionScore(game, edgeId) {
  const e = game.board?.edges?.[edgeId];
  if (!e) return -Infinity;

  const n1 = toInt(e.n1);
  const n2 = toInt(e.n2);

  let s = -Infinity;
  if (Number.isFinite(n1)) s = Math.max(s, nodeProductionScore(game, n1, "settlement"));
  if (Number.isFinite(n2)) s = Math.max(s, nodeProductionScore(game, n2, "settlement"));

  // small bonus if it touches a buildable node
  const node1 = game.board?.nodes?.[n1];
  const node2 = game.board?.nodes?.[n2];
  if (node1 && !node1.building && node1.canBuild) s += 0.05;
  if (node2 && !node2.building && node2.canBuild) s += 0.05;

  return s;
}

function getBuildingOwnerId(b) {
  if (!b) return null;
  return b.ownerId ?? b.playerId ?? b.owner ?? null;
}

function getBuildingType(b) {
  if (!b) return "";
  const t = (b.type ?? b.kind ?? b.name ?? (typeof b === "string" ? b : "")).toString().toLowerCase();
  return t;
}

function isSettlementBuilding(b) {
  const t = getBuildingType(b);
  return t.includes("town") || t.includes("settlement") || t === "village";
}

function isCityBuilding(b) {
  const t = getBuildingType(b);
  return t.includes("city");
}

// Candidate sets (availability; legality enforced server-side by applyActionSafely/engine)
function openNodeIds(game) {
  const nodes = game.board?.nodes || [];
  const ids = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n) continue;
    if (!n.building && n.canBuild) ids.push(i);
  }
  return uniq(ids);
}

function openEdgeIds(game) {
  const edges = game.board?.edges || [];
  const ids = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (!e) continue;
    if (e.ownerId == null) ids.push(i);
  }
  return uniq(ids);
}

function upgradableSettlementNodeIds(game, playerId) {
  const nodes = game.board?.nodes || [];
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n?.building) continue;
    const owner = getBuildingOwnerId(n.building);
    if (owner !== playerId) continue;
    if (isSettlementBuilding(n.building) && !isCityBuilding(n.building)) out.push(i);
  }
  return out;
}

function rankedTownNodeIds(game, limit = 12) {
  return openNodeIds(game)
    .map((nodeId) => ({ nodeId, score: nodeProductionScore(game, nodeId, "settlement") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.nodeId);
}

function rankedCityNodeIds(game, playerId, limit = 8) {
  return upgradableSettlementNodeIds(game, playerId)
    .map((nodeId) => ({ nodeId, score: nodeProductionScore(game, nodeId, "city") }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.nodeId);
}

function rankedRoadEdgeIds(game, limit = 16) {
  return openEdgeIds(game)
    .map((edgeId) => ({ edgeId, score: edgeExpansionScore(game, edgeId) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.edgeId);
}

// Robber placement: block opponent expected production
function robberBestHexId(game, currentPlayerId) {
  const tiles = game.board?.tiles || [];
  const nodes = game.board?.nodes || [];

  let best = null;

  for (let tileId = 0; tileId < tiles.length; tileId++) {
    const ti = getTileInfo(game, tileId);
    if (!ti) continue;
    if (ti.hasRobber) continue;
    if (!ti.num || ti.num === 7) continue;

    const p = DICE_P[ti.num] ?? 0;
    if (p <= 0) continue;

    let oppWeight = 0;
    let meWeight = 0;

    for (const n of nodes) {
      if (!n) continue;
      const adj = Array.isArray(n.adjHexes) ? n.adjHexes : [];
      if (!adj.includes(tileId)) continue;
      if (!n.building) continue;

      const owner = getBuildingOwnerId(n.building);
      const isCity = isCityBuilding(n.building);
      const w = isCity ? 2 : 1;

      if (owner === currentPlayerId) meWeight += w;
      else oppWeight += w;
    }

    const score = p * (oppWeight - 0.65 * meWeight);
    if (best == null || score > best.score) best = { tileId, score };
  }

  return best?.tileId ?? Math.max(0, tiles.findIndex((t) => !t?.hasRobber));
}

// --------------------
// 1) Heuristic policy (safe, simple, matches server action types)
// --------------------
function algoPolicy(game, { debug = false } = {}) {
  const player = game.players?.[game.current];
  if (!player) return { action: "endTurn", payload: {}, reason: "Algo: missing player." };

  const pid = safePlayerId(game);

  // must roll first
  if (!player.hasRolled) {
    return { action: "rollDice", payload: {}, reason: "Algo: roll first." };
  }

  // robber move after 7
  if (game.lastRoll === 7) {
    const hexId = robberBestHexId(game, pid);
    return {
      action: "moveRobber",
      payload: { hexId },
      reason: `Algo: rolled 7 → move robber to hex ${hexId} (block opponent EV).`,
    };
  }

  // city
  if (canAfford(player, COSTS.city)) {
    const cityNodes = rankedCityNodeIds(game, pid);
    if (cityNodes.length > 0) {
      const nodeId = cityNodes[0];
      const s = nodeProductionScore(game, nodeId, "city");
      return { action: "buildCity", payload: { nodeId }, reason: `Algo: best City @${nodeId} (EV=${s.toFixed(4)}).` };
    }
  }

  // settlement
  if (canAfford(player, COSTS.town)) {
    const townNodes = rankedTownNodeIds(game);
    if (townNodes.length > 0) {
      const nodeId = townNodes[0];
      const s = nodeProductionScore(game, nodeId, "settlement");
      return { action: "buildTown", payload: { nodeId }, reason: `Algo: best Town @${nodeId} (EV=${s.toFixed(4)}).` };
    }
  }

  // road
  if (canAfford(player, COSTS.road)) {
    const edges = rankedRoadEdgeIds(game);
    if (edges.length > 0) {
      const edgeId = edges[0];
      const s = edgeExpansionScore(game, edgeId);
      return { action: "buildRoad", payload: { edgeId }, reason: `Algo: best Road @${edgeId} (S=${s.toFixed(4)}).` };
    }
  }

  // dev card
  if (canAfford(player, COSTS.dev) && !player.boughtDevCardThisTurn) {
    return { action: "buyDevCard", payload: {}, reason: "Algo: buy Dev Card (fallback)." };
  }

  if (debug) console.log("[algo] pass; resources:", player.resources);
  return { action: "endTurn", payload: {}, reason: "Algo: no strong/available action; end turn." };
}

// --------------------
// 2) Search helpers (approx forward model)
// --------------------
function deepCloneGame(game) {
  return JSON.parse(JSON.stringify(game));
}

function roll2d6() {
  return (1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6));
}

function listCandidateActions(game) {
  const player = game.players?.[game.current];
  if (!player) return [{ action: "endTurn", payload: {} }];

  const pid = safePlayerId(game);
  const actions = [];

  if (!player.hasRolled) {
    actions.push({ action: "rollDice", payload: {} });
    return actions;
  }

  if (game.lastRoll === 7) {
    actions.push({ action: "moveRobber", payload: { hexId: robberBestHexId(game, pid) } });
    actions.push({ action: "endTurn", payload: {} });
    return actions;
  }

  if (canAfford(player, COSTS.city)) {
    for (const nodeId of rankedCityNodeIds(game, pid)) actions.push({ action: "buildCity", payload: { nodeId } });
  }
  if (canAfford(player, COSTS.town)) {
    for (const nodeId of rankedTownNodeIds(game)) actions.push({ action: "buildTown", payload: { nodeId } });
  }
  if (canAfford(player, COSTS.road)) {
    for (const edgeId of rankedRoadEdgeIds(game)) actions.push({ action: "buildRoad", payload: { edgeId } });
  }
  if (canAfford(player, COSTS.dev) && !player.boughtDevCardThisTurn) {
    actions.push({ action: "buyDevCard", payload: {} });
  }

  actions.push({ action: "endTurn", payload: {} });
  return actions;
}

function ensureTurnFields(game) {
  const p = game.players?.[game.current];
  if (!p) return;
  if (typeof p.hasRolled !== "boolean") p.hasRolled = false;
  if (typeof p.boughtDevCardThisTurn !== "boolean") p.boughtDevCardThisTurn = false;
}

function applyActionApprox(game, move) {
  ensureTurnFields(game);

  const p = game.players?.[game.current];
  const pid = safePlayerId(game);
  if (!p) return game;

  switch (move.action) {
    case "rollDice": {
      p.hasRolled = true;
      game.lastRoll = roll2d6();
      return game;
    }

    case "moveRobber": {
      const hexId = Number(move.payload?.hexId);
      const tiles = game.board?.tiles || [];
      for (let i = 0; i < tiles.length; i++) if (tiles[i]) tiles[i].hasRobber = false;
      if (tiles[hexId]) tiles[hexId].hasRobber = true;
      return game;
    }

    case "buildTown": {
      const nodeId = Number(move.payload?.nodeId);
      const n = game.board?.nodes?.[nodeId];
      if (!n || n.building) return game;
      payCost(p, COSTS.town);
      n.building = { type: "town", ownerId: pid };
      return game;
    }

    case "buildCity": {
      const nodeId = Number(move.payload?.nodeId);
      const n = game.board?.nodes?.[nodeId];
      if (!n?.building) return game;
      if (getBuildingOwnerId(n.building) !== pid) return game;
      payCost(p, COSTS.city);
      n.building = { ...n.building, type: "city", ownerId: pid };
      return game;
    }

    case "buildRoad": {
      const edgeId = Number(move.payload?.edgeId);
      const e = game.board?.edges?.[edgeId];
      if (!e || e.ownerId != null) return game;
      payCost(p, COSTS.road);
      e.ownerId = pid;
      return game;
    }

    case "buyDevCard": {
      if (p.boughtDevCardThisTurn) return game;
      payCost(p, COSTS.dev);
      p.boughtDevCardThisTurn = true;
      // lightweight approximation for rollouts
      p.devCards = Array.isArray(p.devCards) ? p.devCards : [];
      p.devCards.push("unknown");
      return game;
    }

    case "endTurn": {
      const n = Number(game.players?.length ?? 0);
      if (n > 0) game.current = (Number(game.current) + 1) % n;

      const np = game.players?.[game.current];
      if (np) {
        np.hasRolled = false;
        np.boughtDevCardThisTurn = false;
      }
      game.lastRoll = null;
      return game;
    }

    default:
      return game;
  }
}

function resourceHeuristicValue(player) {
  const w = { wood: 0.18, brick: 0.18, sheep: 0.15, wheat: 0.2, ore: 0.22 };
  let v = 0;
  for (const [k, wt] of Object.entries(w)) v += getRes(player, k) * wt;
  return v;
}

function boardProductionValue(game, playerId) {
  const nodes = game.board?.nodes || [];
  let v = 0;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!n?.building) continue;
    const owner = getBuildingOwnerId(n.building);
    if (owner !== playerId) continue;
    const isCity = isCityBuilding(n.building);
    v += nodeProductionScore(game, i, isCity ? "city" : "settlement");
  }
  return v;
}

function victoryPointApprox(game, playerId) {
  const players = game.players || [];
  const p = players.find((x) => (x?.id ?? null) === playerId) ?? players?.[playerId];
  const vp = Number(p?.victoryPoints ?? p?.vp);
  if (Number.isFinite(vp)) return vp;

  const nodes = game.board?.nodes || [];
  let approx = 0;
  for (const n of nodes) {
    if (!n?.building) continue;
    if (getBuildingOwnerId(n.building) !== playerId) continue;
    approx += isCityBuilding(n.building) ? 2 : 1;
  }
  return approx;
}

function evaluateState(game, rootPlayerId) {
  const players = game.players || [];
  const rootIdx = players.findIndex((p) => (p?.id ?? null) === rootPlayerId);
  const root = rootIdx >= 0 ? players[rootIdx] : players?.[rootPlayerId];
  if (!root) return 0;

  const myVP = victoryPointApprox(game, rootPlayerId);
  const myProd = boardProductionValue(game, rootPlayerId);
  const myRes = resourceHeuristicValue(root);

  let oppBest = 0;
  for (const p of players) {
    const pid = p?.id ?? null;
    if (pid == null || pid === rootPlayerId) continue;
    const v = 1.25 * victoryPointApprox(game, pid) + 0.85 * boardProductionValue(game, pid);
    oppBest = Math.max(oppBest, v);
  }

  return 2.4 * myVP + 1.2 * myProd + 0.6 * myRes - 0.9 * oppBest;
}

// --------------------
// 3) Minimax (depth-2 alpha-beta)
// --------------------
function minimaxPickAction(game, { depth = 2, debug = false } = {}) {
  const rootPlayerId = safePlayerId(game);

  function isTerminal(g, d) {
    if (d <= 0) return true;
    const players = g.players || [];
    for (const p of players) {
      const pid = p?.id ?? null;
      if (pid == null) continue;
      if (victoryPointApprox(g, pid) >= 10) return true;
    }
    return false;
  }

  function ab(g, d, alpha, beta) {
    if (isTerminal(g, d)) return evaluateState(g, rootPlayerId);

    const moves = listCandidateActions(g);
    const isRootTurn = safePlayerId(g) === rootPlayerId;

    let bestVal = isRootTurn ? -Infinity : Infinity;

    for (const m of moves) {
      const g2 = deepCloneGame(g);
      applyActionApprox(g2, m);
      const val = ab(g2, d - 1, alpha, beta);

      if (isRootTurn) {
        bestVal = Math.max(bestVal, val);
        alpha = Math.max(alpha, bestVal);
      } else {
        bestVal = Math.min(bestVal, val);
        beta = Math.min(beta, bestVal);
      }

      if (beta <= alpha) break;
    }

    return bestVal;
  }

  const moves = listCandidateActions(game);
  let best = moves[0] ?? { action: "endTurn", payload: {} };
  let bestVal = -Infinity;

  for (const m of moves) {
    const g2 = deepCloneGame(game);
    applyActionApprox(g2, m);
    const v = ab(g2, depth - 1, -Infinity, Infinity);
    if (v > bestVal) {
      bestVal = v;
      best = m;
    }
  }

  if (debug) console.log("[minimax] bestVal=", bestVal, "best=", best);
  return { ...best, reason: `Minimax(d=${depth}): picked eval=${bestVal.toFixed(4)}` };
}

// --------------------
// 4) MCTS (real loop)
// --------------------
class MCTSNode {
  constructor(state, move = null, parent = null) {
    this.state = state;
    this.move = move;
    this.parent = parent;
    this.children = [];
    this.untriedMoves = listCandidateActions(state);
    this.visits = 0;
    this.totalValue = 0;
  }

  isFullyExpanded() {
    return this.untriedMoves.length === 0;
  }

  ucb1(c = 1.35) {
    if (this.visits === 0) return Infinity;
    const exploit = this.totalValue / this.visits;
    const explore = c * Math.sqrt(Math.log((this.parent?.visits ?? 1) + 1) / this.visits);
    return exploit + explore;
  }

  bestChild(c = 1.35) {
    let best = null;
    let bestScore = -Infinity;
    for (const ch of this.children) {
      const s = ch.ucb1(c);
      if (s > bestScore) {
        bestScore = s;
        best = ch;
      }
    }
    return best;
  }

  expand() {
    const move = this.untriedMoves.pop();
    const next = deepCloneGame(this.state);
    applyActionApprox(next, move);
    const child = new MCTSNode(next, move, this);
    this.children.push(child);
    return child;
  }
}

function rolloutDefaultPolicy(state, rootPlayerId, rolloutDepth = 4) {
  const s = deepCloneGame(state);
  for (let i = 0; i < rolloutDepth; i++) {
    const m = algoPolicy(s);
    applyActionApprox(s, { action: m.action, payload: m.payload });
    if (m.action === "endTurn") break;
  }
  return evaluateState(s, rootPlayerId);
}

function mctsPickAction(game, { iterations = 220, rolloutDepth = 4, c = 1.35, debug = false } = {}) {
  const rootPlayerId = safePlayerId(game);
  const root = new MCTSNode(deepCloneGame(game));

  for (let i = 0; i < iterations; i++) {
    // 1) Selection
    let node = root;
    while (node.isFullyExpanded() && node.children.length > 0) {
      node = node.bestChild(c);
    }

    // 2) Expansion
    if (!node.isFullyExpanded()) {
      node = node.expand();
    }

    // 3) Simulation
    const value = rolloutDefaultPolicy(node.state, rootPlayerId, rolloutDepth);

    // 4) Backprop
    while (node) {
      node.visits += 1;
      node.totalValue += value;
      node = node.parent;
    }
  }

  // choose robust child (most visits)
  let best = null;
  let bestVisits = -1;
  for (const ch of root.children) {
    if (ch.visits > bestVisits) {
      bestVisits = ch.visits;
      best = ch;
    }
  }

  if (!best) {
    const fallback = algoPolicy(game);
    return { action: fallback.action, payload: fallback.payload, reason: "MCTS: fallback heuristic." };
  }

  const mean = best.totalValue / Math.max(1, best.visits);
  if (debug) console.log("[mcts] bestVisits=", bestVisits, "mean=", mean, "move=", best.move);

  return { ...best.move, reason: `MCTS(it=${iterations}): visits=${bestVisits}, mean=${mean.toFixed(4)}` };
}

// --------------------
// Public API used by server/server.js
// --------------------
function pickAlgorithmAction(game, { algorithm = "mcts", params = {} } = {}) {
  const name = String(algorithm || "mcts").toLowerCase();

  switch (name) {
    case "mcts":
      return mctsPickAction(game, params);
    case "minimax":
      return minimaxPickAction(game, params);
    case "heuristic":
    case "greedy":
    case "tree":
      return algoPolicy(game, params);
    case "none":
    default:
      return algoPolicy(game, params);
  }
}

module.exports = { pickAlgorithmAction };
