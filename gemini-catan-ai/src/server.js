import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { GeminiAgent } from "./ai-agent.js";

dotenv.config();

const app = express();
app.use(express.json());

// Add CORS headers to allow browser requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const PORT = process.env.PORT || 5100;
const CATAN_API_BASE = process.env.CATAN_API_BASE || "http://localhost:4000";

console.log("USE_REAL_GEMINI =", process.env.USE_REAL_GEMINI);

const agent = new GeminiAgent(process.env.GOOGLE_API_KEY, "balanced");

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Gemini Catan AI service running" });
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
    console.log("Gemini decision", decision);

    let actionPayload = decision.action || {};

    // Try the AI's chosen action first with intelligent retry
    let catanResp;
    let finalDecision = decision;
    let attemptCount = 0;
    const maxAttempts = 3;
    
    while (!catanResp && attemptCount < maxAttempts) {
      attemptCount++;
      
      try {
        console.log(`Attempt ${attemptCount}: Trying action:`, actionPayload.type);
        catanResp = await axios.post(
          `${CATAN_API_BASE}/api/games/${gameId}/actions`,
          actionPayload,
          { headers: { "Content-Type": "application/json" } }
        );
        break; // Success!
        
      } catch (actionError) {
        console.log(`Attempt ${attemptCount} failed:`, actionError?.response?.data?.error || actionError.message);
        
        if (attemptCount >= maxAttempts) {
          // Last attempt - try guaranteed safe actions
          const safeActions = [
            { type: "rollDice", payload: null },
            { type: "endTurn", payload: null }
          ];
          
          for (const safeAction of safeActions) {
            try {
              console.log("Final fallback attempt:", safeAction.type);
              catanResp = await axios.post(
                `${CATAN_API_BASE}/api/games/${gameId}/actions`,
                safeAction,
                { headers: { "Content-Type": "application/json" } }
              );
              
              finalDecision = {
                reasoning: `All AI attempts failed. Error: "${actionError?.response?.data?.error}". Using safe fallback: ${safeAction.type}`,
                action: safeAction
              };
              break;
            } catch (safeError) {
              console.log(`Safe action ${safeAction.type} failed:`, safeError?.response?.data || safeError.message);
            }
          }
          
          if (!catanResp) {
            throw new Error(`All retry attempts failed. Last error: ${actionError?.response?.data?.error || actionError.message}`);
          }
        } else {
          // Retry with a different action - get fresh legal actions and pick next best
          console.log("Getting fresh game state for retry...");
          const freshStateResp = await axios.get(`${CATAN_API_BASE}/api/games/${gameId}`);
          const freshGameState = freshStateResp.data;
          
          // Get new legal actions and filter out the one that failed
          const { computeLegalActions } = await import('./legal-actions.js');
          const legalActions = computeLegalActions(freshGameState, Number(playerId));
          
          // Find a different action to try
          const nextAction = legalActions.find(action => 
            action.type !== actionPayload.type || 
            JSON.stringify(action.payload) !== JSON.stringify(actionPayload.payload)
          );
          
          if (nextAction) {
            console.log(`Retrying with different action: ${nextAction.type}`);
            actionPayload = nextAction;
            finalDecision = {
              reasoning: `Original action "${decision.action.type}" failed: "${actionError?.response?.data?.error}". Trying alternative: "${nextAction.type}"`,
              action: nextAction
            };
          } else {
            console.log("No alternative actions available, trying safe fallbacks");
            actionPayload = { type: "endTurn", payload: null };
            finalDecision = {
              reasoning: `No valid alternatives found. Ending turn. Error was: "${actionError?.response?.data?.error}"`,
              action: actionPayload
            };
          }
        }
      }
    }

    res.json({ decision: finalDecision, catanResult: catanResp.data });
  } catch (err) {
    console.error("/ai/play-turn error", err?.response?.data || err?.message || err);

    res.status(500).json({
      error: "Failed to play AI turn",
      details: err?.response?.data || err?.message || "Unknown error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Gemini Catan AI service listening on port ${PORT}`);
  console.log(`AI server listening on http://localhost:${PORT}`);
});