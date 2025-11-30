export function normalizeGeminiDecision(rawText, legalActions) {
  try {
    // Clean the response text
    const cleanedText = rawText.trim().replace(/[^\d]/g, '');
    
    if (!cleanedText) {
      throw new Error("No number found in response");
    }

    const choiceNum = parseInt(cleanedText, 10);
    const idx = choiceNum - 1;

    if (Number.isNaN(choiceNum) || idx < 0 || idx >= legalActions.length) {
      throw new Error(`Choice ${choiceNum} is out of range (1-${legalActions.length})`);
    }

    const chosenAction = legalActions[idx];

    return {
      reasoning: `Gemini chose action #${choiceNum}: ${chosenAction.type}`,
      action: chosenAction
    };
  } catch (err) {
    console.error("Failed to parse Gemini response:", err?.message || err);
    console.error("Raw response was:", rawText);

    // Fallback strategy: prioritize actions by importance
    const fallback =
      legalActions.find((a) => a.type === "rollDice") ||
      legalActions.find((a) => a.type === "buildTown") ||
      legalActions.find((a) => a.type === "buildCity") ||
      legalActions.find((a) => a.type === "buildRoad") ||
      legalActions.find((a) => a.type === "endTurn") ||
      legalActions[0];

    return {
      reasoning: `Fallback due to parsing error: ${err?.message || err}. Selected ${fallback?.type}`,
      action: fallback
    };
  }
}