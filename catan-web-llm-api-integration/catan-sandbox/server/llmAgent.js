// server/llmAgent.js
// OpenAI helper that turns a CatanGame state into a structured action suggestion.
const OpenAI = require("openai");
const Anthropic = require("@anthropic-ai/sdk");

// Default to OpenAI's gpt-4o for all agents unless explicitly overridden.
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const ANTHROPIC_VERSION = "2023-06-01";

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

function tryParseJson(text) {
  let cleaned = (text || "").trim();
  if (!cleaned) throw new Error("Model returned empty response.");
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim();
  }
  return JSON.parse(cleaned);
}

function parseChatCompletionResponse(response) {
  const choice = response?.choices?.[0];
  const message = choice?.message;
  let text = "";

  if (typeof message?.content === "string") {
    text = message.content;
  } else if (Array.isArray(message?.content)) {
    text = message.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        if (typeof part?.content === "string") return part.content;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  if (!text) throw new Error("Model returned empty message.");

  try {
    return tryParseJson(text);
  } catch (err) {
    throw new Error("Model returned non-JSON text: " + text);
  }
}

function resolveApiKey(config = {}) {
  if (config.apiKey) return config.apiKey;
  if (config.provider === "google" && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  if (config.provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }
  return process.env.OPENAI_API_KEY;
}

function resolveBaseURL(config = {}) {
  const endpoint =
    config.apiEndpoint || (config.provider === "google" ? GEMINI_OPENAI_BASE : null);
  if (!endpoint) return undefined;
  const trimmed = endpoint.replace(/\/$/, "");
  if (config.provider === "anthropic") return trimmed;
  if (trimmed.includes("/openai")) return trimmed;
  if (trimmed.includes("/v1")) return trimmed;
  return `${trimmed}/v1`;
}

function getClient(config = {}) {
  if (config.client) return { client: config.client, kind: config.provider || "openai" };

  const provider = config.provider || "openai";
  const apiKey = resolveApiKey({ ...config, provider });
  if (!apiKey) {
    throw new Error("No API key available for LLM call.");
  }

  if (provider === "anthropic") {
    const baseURL = config.apiEndpoint
      ? config.apiEndpoint.replace(/\/$/, "").replace(/\/v1$/, "")
      : undefined;
    const clientOptions = {
      apiKey,
      maxRetries: 2,
      anthropicVersion: ANTHROPIC_VERSION,
    };
    if (baseURL) clientOptions.baseURL = baseURL;
    return { client: new Anthropic(clientOptions), kind: "anthropic" };
  }

  // Allow custom endpoints (e.g., Azure/Gemini/OpenAI-compatible APIs)
  const baseURL = resolveBaseURL({ ...config, provider });

  const clientOptions = { apiKey };
  if (baseURL) clientOptions.baseURL = baseURL;

  // Gemini's OpenAI-compatible endpoint accepts either Authorization or x-goog-api-key headers.
  if (provider === "google") {
    clientOptions.defaultHeaders = { "x-goog-api-key": apiKey };
  }

  return { client: new OpenAI(clientOptions), kind: "openai" };
}

function parseActionResponse(response) {
  const blocks = (response?.output || []).flatMap((o) => o?.content || []);
  const jsonBlock = blocks.find((b) => b.json || b.parsed);
  if (jsonBlock?.json) return jsonBlock.json;
  if (jsonBlock?.parsed) return jsonBlock.parsed;

  const textBlock = blocks.find((b) => typeof b.text === "string");
  if (textBlock?.text) {
    try {
      return tryParseJson(textBlock.text);
    } catch (err) {
      throw new Error("Model returned non-JSON text: " + textBlock.text);
    }
  }

  throw new Error("Could not parse action from model response.");
}

function parseAnthropicResponse(response) {
  const textBlock = Array.isArray(response?.content)
    ? response.content.find((part) => part?.type === "text")
    : null;
  const text = textBlock?.text || "";
  if (!text) throw new Error("Model returned empty message.");
  try {
    return tryParseJson(text);
  } catch (err) {
    throw new Error("Model returned non-JSON text: " + text);
  }
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

  const { client: llmClient, kind } = getClient(mergedConfig);
  const snapshot = summarizeGame(game);
  const prompt = buildSystemPrompt();
  const systemMessage = `${prompt}\nReturn ONLY raw JSON conforming to the schema (no markdown, no code fences, no extra text): ${JSON.stringify(
    ACTION_SCHEMA
  )}.`;
  const userMessage = `Decide the next action for player ${snapshot.currentPlayer?.name} (id ${
    snapshot.currentPlayer?.id
  }). Optional notes: ${notes || "none"}.\nSnapshot:\n${JSON.stringify(snapshot)}`;

  let parsed = null;
  let usage = null;

  if (kind === "anthropic") {
    const completion = await llmClient.messages.create({
      model: mergedConfig.model,
      system: systemMessage,
      messages: [{ role: "user", content: userMessage }],
      max_tokens: 600,
    });
    parsed = parseAnthropicResponse(completion);
    usage = completion.usage;
  } else if (mergedConfig.provider === "google") {
    const completion = await llmClient.chat.completions.create({
      model: mergedConfig.model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
    });
    parsed = parseChatCompletionResponse(completion);
    usage = completion.usage;
  } else {
    const response = await llmClient.responses.create({
      model: mergedConfig.model,
      input: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
    });
    parsed = parseActionResponse(response);
    usage = response.usage;
  }

  return {
    ...parsed,
    model: mergedConfig.model,
    snapshot,
    usage,
  };
}

module.exports = {
  ACTION_SCHEMA,
  DEFAULT_MODEL,
  buildSystemPrompt,
  getLLMAction,
  summarizeGame,
  resolveApiKey,
};
