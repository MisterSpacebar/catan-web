import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { ClaudeAgent } from "./ai-agent.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;
const CATAN_API_BASE = process.env.CATAN_API_BASE || "http://localhost:4000";

console.log("USE_REAL_CLAUDE =", process.env.USE_REAL_CLAUDE);

const agent = new ClaudeAgent(process.env.ANTHROPIC_API_KEY, "balanced");

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Claude Catan AI service running" });
});

app.post("/ai/decide", async (req, res) => {
  try {
    const { gameState, playerId } = req.body || {};
    if (!gameState || playerId == null) {
      return res.status(400).json({ error: "gameState and playerId are required" });
    }

    const decision = await agent.decideAction(gameState, Number(playerId));
    console.log("/ai/decide decision", decision);

    res.json({ decision });
  } catch (err) {
    console.error("/ai/decide error", err);
    res.status(500).json({ error: "Failed to decide action", details: err?.message || err });
  }
});

app.post("/ai/play-turn/:gameId/:playerId", async (req, res) => {
  const { gameId, playerId } = req.params;
  console.log(`Received play-turn for game ${gameId} player ${playerId}`);

  try {
    const stateResp = await axios.get(`${CATAN_API_BASE}/api/games/${gameId}`);
    const gameState = stateResp.data;

    const decision = await agent.decideAction(gameState, Number(playerId));
    console.log("Claude decision", decision);

    const actionPayload = decision.action || {};

    const catanResp = await axios.post(
      `${CATAN_API_BASE}/api/games/${gameId}/actions`,
      actionPayload,
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({ decision, catanResult: catanResp.data });
  } catch (err) {
    console.error("/ai/play-turn error", err?.response?.data || err?.message || err);

    res.status(500).json({
      error: "Failed to play AI turn",
      details: err?.response?.data || err?.message || "Unknown error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Claude Catan AI service listening on port ${PORT}`);
  console.log(`AI server listening on http://localhost:${PORT}`);
});
