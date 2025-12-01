// server/llmAgent.js
// OpenAI helper that turns a CatanGame state into a structured action suggestion.
const OpenAI = require("openai");

// Default to OpenAI's gpt-4o for all agents unless explicitly overridden.
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// Canonical list of supported server actions + expected payload shape hints
const ACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      description: "One of the server-supported action types",
      enum: [
        "rollDice",
        "moveRobber",
        "buildRoad",
        "buildTown",
        "buildCity",
        "harborTrade",
        "buyDevCard",
        "playKnight",
        "playRoadBuilding",
        "playYearOfPlenty",
        "playMonopoly",
        "endTurn",
      ],
    },
    payload: {
      type: "object",
      description: "Arguments for the chosen action. Use only fields that matter for that action.",
      additionalProperties: true,
    },
    reason: {
      type: "string",
      description: "Short natural-language justification for the chosen action",
    },
    confidence: {
      type: "number",
      description: "0-1 confidence score for the action choice",
    },
  },
  required: ["action", "payload", "reason"],
};

function buildSystemPrompt() {
  return [
    "You are an expert Settlers of Catan player. Play strictly by standard rules.",
    "- Always act for the CURRENT player id passed in the snapshot.",
    "- Output ONLY JSON that matches the provided schema (action/payload/reason/confidence). No code fences, no markdown.",
    "- Costs: road=wood+brick, town=wood+brick+wheat+sheep, city=2 wheat + 3 ore, dev card=sheep+wheat+ore.",
    "- Enforce: player must roll before building/trading/buying dev cards; towns/cities cannot be adjacent; roads must connect to player network; respect longest road/largest army.",
    "- Dice on 7: choose moveRobber with hexId away from desert to block opponents; otherwise rollDice before building/trading.",
    "- Strongly prefer productive actions: after rolling (and when legal), prioritize buildRoad/buildTown/buildCity/buyDevCard over moving the robber. Only moveRobber on a 7 or when playing a Knight.",
    "- Robber restriction: only one moveRobber action is allowed per turn. If the robber already moved this turn, do NOT suggest moveRobber again.",
    "- If no productive action exists, endTurn. Prefer growing VP and resource production.",
  ].join("\n");
}

function summarizeGame(game) {
  const robberHexId = game.board.tiles.findIndex((t) => t.hasRobber);
  const openEdges = [];
  game.board.edges.forEach((e, idx) => {
    if (e.ownerId == null) {
      openEdges.push({ id: e.id ?? idx, n1: e.n1, n2: e.n2 });
    }
  });

  const openNodes = [];
  game.board.nodes.forEach((n, idx) => {
    if (!n.building && n.canBuild) {
      openNodes.push({ id: n.id ?? idx, adjHexes: n.adjHexes });
    }
  });

  return {
    gameId: game.id,
    turnIndex: game.current,
    currentPlayer: game.players[game.current],
    lastRoll: game.lastRoll,
    lastProduction: game.lastProduction,
    devCardsRemaining: game.devCardDeck.length,
    tiles: game.board.tiles.map((t, idx) => ({
      id: idx,
      resource: t.resource,
      number: t.number,
      hasRobber: t.hasRobber,
    })),
    openEdges,
    openNodes,
    players: game.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      vp: p.vp,
      resources: p.resources,
      longestRoad: p.longestRoad,
      largestArmy: p.largestArmy,
      knightsPlayed: p.knightsPlayed,
      hasRolled: p.hasRolled,
      boughtDevCardThisTurn: p.boughtDevCardThisTurn,
      devCards: {
        playable: p.devCards.filter((c) => c.canPlay).map((c) => c.type),
        inHand: p.devCards.map((c) => c.type),
      },
    })),
    robberHexId,
  };
}

function getClient(config = {}) {
  if (config.client) return config.client;

  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No API key available for LLM call.");
  }

  // Allow custom endpoints (e.g., Azure or self-hosted OpenAI-compatible APIs)
  const baseURL = config.apiEndpoint
    ? `${config.apiEndpoint.replace(/\/$/, "")}${config.apiEndpoint.includes("/v1") ? "" : "/v1"}`
    : undefined;

  const clientOptions = { apiKey };
  if (baseURL) clientOptions.baseURL = baseURL;

  return new OpenAI(clientOptions);
}

function parseActionResponse(response) {
  const blocks = (response?.output || []).flatMap((o) => o?.content || []);
  const jsonBlock = blocks.find((b) => b.json || b.parsed);
  if (jsonBlock?.json) return jsonBlock.json;
  if (jsonBlock?.parsed) return jsonBlock.parsed;

  const textBlock = blocks.find((b) => typeof b.text === "string");
  if (textBlock?.text) {
    // Strip common Markdown code fences before parsing.
    let cleaned = textBlock.text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim();
    }
    try {
      return JSON.parse(cleaned);
    } catch (err) {
      throw new Error("Model returned non-JSON text: " + textBlock.text);
    }
  }

  throw new Error("Could not parse action from model response.");
}

async function getLLMAction(
  game,
  { llmConfig = {}, model, notes, client, apiKey, apiEndpoint } = {}
) {
  const mergedConfig = {
    ...llmConfig,
    model: model || llmConfig.model || DEFAULT_MODEL,
    apiKey: apiKey || llmConfig.apiKey,
    apiEndpoint: apiEndpoint || llmConfig.apiEndpoint,
    client,
  };

  const openai = getClient(mergedConfig);
  const snapshot = summarizeGame(game);
  const prompt = buildSystemPrompt();

  const response = await openai.responses.create({
    model: mergedConfig.model,
    input: [
      {
        role: "system",
        content: `${prompt}\nReturn ONLY raw JSON conforming to the schema (no markdown, no code fences, no extra text): ${JSON.stringify(
          ACTION_SCHEMA
        )}.`,
      },
      {
        role: "user",
        content: `Decide the next action for player ${snapshot.currentPlayer?.name} (id ${snapshot.currentPlayer?.id}). Optional notes: ${notes || "none"}.\nSnapshot:\n${JSON.stringify(snapshot)}`,
      },
    ],
  });

  const parsed = parseActionResponse(response);

  return {
    ...parsed,
    model: mergedConfig.model,
    snapshot,
    usage: response.usage,
  };
}

module.exports = {
  ACTION_SCHEMA,
  DEFAULT_MODEL,
  buildSystemPrompt,
  getLLMAction,
  summarizeGame,
};
