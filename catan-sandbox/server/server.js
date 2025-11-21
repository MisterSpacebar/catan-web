// server/server.js (Express API for CatanGame)
const express = require("express");
const cors = require("cors");
const { CatanGame } = require("./CatanGame");

const app = express();
app.use(cors());
app.use(express.json());

const games = new Map(); // gameId -> CatanGame

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Catan API is running!",
    version: "1.0.0",
    endpoints: {
      "POST /api/games": "Create a new game",
      "GET /api/games/:id": "Get game state",
      "POST /api/games/:id/actions": "Perform game action"
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
    let event;

    switch (type) {
      case "rollDice":
        event = game.rollDice();
        break;

      case "moveRobber":
        event = game.moveRobber(payload.hexId);
        break;

      case "buildRoad":
        event = game.buildRoad(payload.edgeId, payload.playerId, {
          free: !!payload.free,
        });
        break;

      case "buildTown":
        event = game.buildTown(payload.nodeId, payload.playerId);
        break;

      case "buildCity":
        event = game.buildCity(payload.nodeId, payload.playerId);
        break;

      case "harborTrade":
        event = game.tradeHarbor(
          payload.playerId,
          payload.giveResource,
          payload.receiveResource
        );
        break;

      case "buyDevCard":
        event = game.buyDevCard(payload.playerId);
        break;

      case "playKnight":
        event = game.playKnight(payload.playerId);
        break;

      case "playRoadBuilding":
        event = game.playRoadBuilding(payload.playerId);
        break;

      case "playYearOfPlenty":
        event = game.playYearOfPlenty(
          payload.playerId,
          payload.resource1,
          payload.resource2
        );
        break;

      case "playMonopoly":
        event = game.playMonopoly(payload.playerId, payload.resource);
        break;

      case "endTurn":
        event = game.endTurn();
        break;

      default:
        return res.status(400).json({ ok: false, error: "Unknown action type" });
    }

    res.json({ ok: true, event, state: game.getState() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Catan API listening on http://localhost:${PORT}`);
});
