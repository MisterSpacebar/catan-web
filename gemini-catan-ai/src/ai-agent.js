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
      // Try multiple model names in order of preference
      const modelNames = [
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
        "gemini-1.5-pro-latest", 
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
      ];
      
      let modelToUse = modelNames[0]; // Default to first option
      console.log(`GeminiAgent: REAL Gemini mode enabled, trying model: ${modelToUse}`);
      this.model = this.genAI.getGenerativeModel({ model: modelToUse });
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

    // Try different models if the current one fails
    const modelNames = [
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest", 
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    let lastError = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`Trying model: ${modelName}`);
        const modelInstance = this.genAI.getGenerativeModel({ model: modelName });
        const result = await modelInstance.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text().trim();

        const { reasoning, action } = normalizeGeminiDecision(rawText, legalActions);
        console.log(`✅ Success with model: ${modelName}`);
        
        // Update the main model instance for future calls
        this.model = modelInstance;
        return { reasoning, action };
        
      } catch (error) {
        console.error(`❌ Model ${modelName} failed:`, error?.message || error);
        lastError = error;
        continue; // Try next model
      }
    }
    
    // If all models failed, return fallback
    console.error("All Gemini models failed, using fallback action");
    const fallback = legalActions[0];
    return {
      reasoning: `All AI models failed (last error: ${lastError?.message}). Using fallback action: ${fallback.type}`,
      action: fallback
    };
  }
}