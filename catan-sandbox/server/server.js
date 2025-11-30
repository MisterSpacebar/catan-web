// server/server.js (Express API for CatanGame)
const express = require("express");
const cors = require("cors");
const { CatanGame } = require("./CatanGame");
const { getLLMAction, DEFAULT_MODEL } = require("./llmAgent");

const app = express();
app.use(cors());
app.use(express.json());

const games = new Map(); // gameId -> CatanGame

function performAction(game, type, payload = {}) {
  switch (type) {
    case "rollDice":
      return game.rollDice();
    case "moveRobber":
      return game.moveRobber(payload.hexId);
    case "buildRoad":
      return game.buildRoad(payload.edgeId, payload.playerId, {
        free: !!payload.free,
      });
    case "buildTown":
      return game.buildTown(payload.nodeId, payload.playerId);
    case "buildCity":
      return game.buildCity(payload.nodeId, payload.playerId);
    case "harborTrade":
      return game.tradeHarbor(
        payload.playerId,
        payload.giveResource,
        payload.receiveResource
      );
    case "buyDevCard":
      return game.buyDevCard(payload.playerId);
    case "playKnight":
      return game.playKnight(payload.playerId);
    case "playRoadBuilding":
      return game.playRoadBuilding(payload.playerId);
    case "playYearOfPlenty":
      return game.playYearOfPlenty(
        payload.playerId,
        payload.resource1,
        payload.resource2
      );
    case "playMonopoly":
      return game.playMonopoly(payload.playerId, payload.resource);
    case "endTurn":
      return game.endTurn();
    default:
      throw new Error("Unknown action type");
  }
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Catan API is running!",
    version: "1.0.0",
    endpoints: {
      "POST /api/games": "Create a new game",
      "GET /api/games": "List all games",
      "GET /api/games/:id": "Get game state",
      "POST /api/games/:id/actions": "Perform game action",
      "DELETE /api/games": "Clear all games",
      "DELETE /api/games/:id": "Delete specific game"
    },
    activeGames: games.size
  });
});

// Create a new game
app.post("/api/games", (req, res) => {
  const { numPlayers } = req.body || {};
  const game = new CatanGame({ numPlayers: numPlayers || 4 });
  games.set(game.id, game);
  res.json(game.getState());
});

// List all games
app.get("/api/games", (req, res) => {
  const gameList = Array.from(games.values()).map(game => {
    const state = game.getState();
    return {
      id: game.id,
      numPlayers: game.numPlayers,
      currentPlayer: game.current,
      playerNames: game.players.map(p => p.name),
      winner: state.winner,
      createdAt: game.log[0]?.timestamp || new Date().toISOString()
    };
  });
  res.json(gameList);
});

// Clear all games
app.delete("/api/games", (req, res) => {
  const gameCount = games.size;
  games.clear();
  res.json({ 
    message: `Cleared ${gameCount} games from server memory`,
    previousCount: gameCount,
    currentCount: games.size
  });
});

// Delete a specific game
app.delete("/api/games/:id", (req, res) => {
  const gameId = req.params.id;
  const existed = games.has(gameId);
  games.delete(gameId);
  
  if (existed) {
    res.json({ 
      message: `Game ${gameId} deleted successfully`,
      gameId: gameId
    });
  } else {
    res.status(404).json({ error: "Game not found" });
  }
});

// Get current state
app.get("/api/games/:id", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game.getState());
});

// Get event log
app.get("/api/games/:id/log", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game.log);
});

// Apply an action
app.post("/api/games/:id/actions", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const { type, payload = {} } = req.body || {};

  try {
    const event = performAction(game, type, payload);
    res.json({ ok: true, event, state: game.getState() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Ask the LLM to choose and optionally apply an action for the current player
app.post("/api/games/:id/llm-turn", async (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });

  try {
    const { model = DEFAULT_MODEL, notes, autoApply = true } = req.body || {};
    const action = await getLLMAction(game, { model, notes });

    let event = null;
    if (autoApply !== false) {
      event = performAction(game, action.action, action.payload || {});
    }

    if (typeof game._emit === "function") {
      game._emit({
        type: "llmDecision",
        model: action.model,
        action: action.action,
        payload: action.payload,
        reason: action.reason,
      });
    }

    res.json({
      ok: true,
      action,
      event,
      state: game.getState(),
    });
  } catch (err) {
    console.error("LLM turn failed:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Catan API listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, games, performAction };
