// server/index.js
const express = require("express");
const cors = require("cors");
const { CatanGame } = require("./CatanGame");

const app = express();
app.use(cors());
app.use(express.json());

const games = new Map(); // gameId -> CatanGame

// Create a game
app.post("/api/games", (req, res) => {
  const { numPlayers } = req.body || {};
  const game = new CatanGame({ numPlayers: numPlayers || 4 });
  games.set(game.id, game);
  res.json(game.getState());
});

// Get a game
app.get("/api/games/:id", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game.getState());
});

// Get log
app.get("/api/games/:id/log", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game.log);
});

// Apply an action
app.post("/api/games/:id/actions", (req, res) => {
  const game = games.get(req.params.id);
  if (!game) return res.status(404).json({ error: "Game not found" });

  const { type, payload } = req.body;

  try {
    let event;
    switch (type) {
      case "rollDice":
        event = game.rollDice();
        break;
      case "buildRoad":
        event = game.buildRoad(payload.edgeId, payload.playerId);
        break;
      case "buildTown":
        event = game.buildTown(payload.nodeId, payload.playerId);
        break;
      case "endTurn":
        event = game.endTurn();
        break;
      default:
        return res.status(400).json({ error: "Unknown action type" });
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
