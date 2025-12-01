// server/server.js (Express API for CatanGame)
const express = require("express");
const cors = require("cors");
const { CatanGame } = require("./CatanGame");
const { getLLMAction, DEFAULT_MODEL, resolveApiKey } = require("./llmAgent");

const app = express();
app.use(cors());
app.use(express.json());

const games = new Map(); // gameId -> CatanGame
const VERIFY_TIMEOUT_MS = 6000;
const MAX_LLM_ATTEMPTS = 3;
const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

function buildVerificationRequest(provider, apiKey, apiEndpoint) {
  const trimmedEndpoint = (apiEndpoint || "").replace(/\/$/, "");

  switch (provider) {
    case "openai":
      return {
        url: `${trimmedEndpoint || "https://api.openai.com"}/v1/models`,
        options: {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      };
    case "anthropic": {
      const base = (trimmedEndpoint || "https://api.anthropic.com").replace(/\/v1$/, "");
      return {
        url: `${base}/v1/models`,
        options: {
          method: "GET",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
        },
      };
    }
    case "google": {
      const endpoint = trimmedEndpoint || GEMINI_OPENAI_BASE;
      return {
        // Use the OpenAI-compatible surface for Gemini verification so it aligns with our client calls.
        url: `${endpoint}/models`,
        options: {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "x-goog-api-key": apiKey,
          },
        },
      };
    }
    case "xai":
    case "deepseek":
    case "meta":
    case "mistral":
    case "openrouter":
      return {
        url: `${trimmedEndpoint || "https://api.openai.com"}/v1/models`,
        options: {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      };
    case "huggingface":
      return {
        url: `${trimmedEndpoint || "https://api-inference.huggingface.co"}/models`,
        options: {
          method: "GET",
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      };
    case "ollama":
      return {
        url: `${trimmedEndpoint || "http://localhost:11434"}/api/tags`,
        options: { method: "GET" },
      };
    default:
      return {
        url: `${trimmedEndpoint || "https://api.openai.com"}/v1/models`,
        options: {
          method: "GET",
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        },
      };
  }
}

async function verifyApiKey(provider, apiKey, apiEndpoint) {
  const request = buildVerificationRequest(provider, apiKey, apiEndpoint);
  if (!request) throw new Error("Unsupported provider");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const response = await fetch(request.url, { ...(request.options || {}), signal: controller.signal });
    const detail = await response.text().catch(() => "");
    return {
      ok: response.ok,
      status: response.status,
      detail: detail?.slice(0, 300),
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
  const { numPlayers, playerConfigs = [] } = req.body || {};
  const game = new CatanGame({ numPlayers: numPlayers || 4, playerConfigs });
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
    const { model, provider, notes, autoApply = true, apiKey, apiEndpoint } = req.body || {};
    const agentConfig = typeof game.getPlayerAgent === "function"
      ? game.getPlayerAgent(game.current)
      : null;

    const llmConfig = {
      ...(agentConfig || {}),
      provider: provider || agentConfig?.provider || "openai",
      model: model || agentConfig?.model || DEFAULT_MODEL,
      apiKey: apiKey || agentConfig?.apiKey,
      apiEndpoint: apiEndpoint || agentConfig?.apiEndpoint,
    };

    const resolvedApiKey = resolveApiKey(llmConfig);
    llmConfig.apiKey = resolvedApiKey;

    if (!resolvedApiKey) {
      return res.status(400).json({
        ok: false,
        error: `No API key configured for provider ${llmConfig.provider}.`,
      });
    }

    let action = null;
    let event = null;
    let lastError = null;

    for (let attempt = 0; attempt < MAX_LLM_ATTEMPTS; attempt += 1) {
      try {
        const augmentedNotes =
          lastError && notes
            ? `${notes} | Previous error: ${lastError}`
            : lastError
              ? `Previous error: ${lastError}`
              : notes;

        action = await getLLMAction(game, { llmConfig, notes: augmentedNotes });

        if (autoApply !== false) {
          event = performAction(game, action.action, action.payload || {});
        }

        // Success
        lastError = null;
        break;
      } catch (err) {
        lastError = err.message;
        action = null;
        event = null;
      }
    }

    if (lastError) {
      return res.status(400).json({
        ok: false,
        error: lastError,
        attempts: MAX_LLM_ATTEMPTS,
      });
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

// API key verification
app.post("/api/llm/verify-key", async (req, res) => {
  const { provider, apiKey, apiEndpoint } = req.body || {};

  if (!provider) {
    return res.status(400).json({ ok: false, error: "Provider is required for verification." });
  }

  const requiresKey = provider !== "ollama";
  if (requiresKey && !apiKey) {
    return res.status(400).json({ ok: false, error: "API key is required for this provider." });
  }

  try {
    const result = await verifyApiKey(provider, apiKey, apiEndpoint);
    if (result.ok) {
      return res.json({
        ok: true,
        status: result.status,
        message: "Provider accepted the credentials.",
      });
    }

    return res.status(result.status === 401 ? 401 : 400).json({
      ok: false,
      error: result.status === 401 ? "Provider rejected API key." : `Verification failed (${result.status})`,
      detail: result.detail,
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: "Unable to verify API key.",
      detail: err.message,
    });
  }
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Catan API listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, games, performAction };
