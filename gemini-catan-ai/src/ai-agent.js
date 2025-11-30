import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { formatGameStateForAI } from "./game-state-parser.js";
import { computeLegalActions } from "./legal-actions.js";
import { buildStrategyPrompt } from "./strategy-prompts.js";
import { normalizeGeminiDecision } from "./action-mapper.js";

dotenv.config();

const USE_REAL_GEMINI = process.env.USE_REAL_GEMINI === "true";

export class GeminiAgent {
  constructor(apiKey, personality = "balanced") {
    this.personality = personality;
    this.apiKey = apiKey;

    if (USE_REAL_GEMINI) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
      console.log("GeminiAgent: REAL Gemini mode enabled");
    } else {
      console.log("GeminiAgent: MOCK mode enabled (no real API calls)");
    }
  }

  async decideAction(gameState, playerId) {
    const { phase, stateDescription } = formatGameStateForAI(gameState, playerId);
    const legalActions = computeLegalActions(gameState, playerId);

    if (!USE_REAL_GEMINI) {
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

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const rawText = response.text().trim();

      const { reasoning, action } = normalizeGeminiDecision(rawText, legalActions);

      return { reasoning, action };
    } catch (error) {
      console.error("Gemini API error:", error);
      
      // Fallback to first legal action
      const fallback = legalActions[0];
      return {
        reasoning: "Fallback due to API error",
        action: fallback
      };
    }
  }
}