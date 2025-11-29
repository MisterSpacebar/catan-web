import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { formatGameStateForAI } from "./game-state-parser.js";
import { computeLegalActions } from "./legal-actions.js";
import { buildStrategyPrompt } from "./strategy-prompts.js";
import { normalizeClaudeDecision } from "./action-mapper.js";

dotenv.config();

const USE_REAL_CLAUDE = process.env.USE_REAL_CLAUDE === "true";

export class ClaudeAgent {
  constructor(apiKey, personality = "balanced") {
    this.personality = personality;
    this.apiKey = apiKey;

    if (USE_REAL_CLAUDE) {
      this.client = new Anthropic({ apiKey });
      console.log("ClaudeAgent: REAL Claude mode enabled");
    } else {
      console.log("ClaudeAgent: MOCK mode enabled (no real API calls)");
    }
  }

  async decideAction(gameState, playerId) {
    const { phase, stateDescription } = formatGameStateForAI(gameState, playerId);
    const legalActions = computeLegalActions(gameState, playerId);

    if (!USE_REAL_CLAUDE) {
      const chosenAction = legalActions[0];
      return {
        reasoning: `Mock mode: selected the first legal action (${chosenAction.type}).`,
        action: chosenAction
      };
    }

    const prompt = buildStrategyPrompt({
      phase,
      personality: this.personality,
      stateDescription,
      legalActions
    });

    const response = await this.client.messages.create({
      model: "claude-3.5-sonnet",
      max_tokens: 50,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const rawText = response.content[0].text.trim();
    const { reasoning, action } = normalizeClaudeDecision(rawText, legalActions);

    return { reasoning, action };
  }
}
