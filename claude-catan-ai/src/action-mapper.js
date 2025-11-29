export function normalizeClaudeDecision(rawText, legalActions) {
  try {
    const match = rawText.match(/\d+/);
    if (!match) {
      throw new Error("No number found in response");
    }

    const choiceNum = parseInt(match[0], 10);
    const idx = choiceNum - 1;

    if (Number.isNaN(choiceNum) || idx < 0 || idx >= legalActions.length) {
      throw new Error(`Choice ${choiceNum} is out of range (1-${legalActions.length})`);
    }

    const chosenAction = legalActions[idx];

    return {
      reasoning: `Claude chose action #${choiceNum}`,
      action: chosenAction
    };
  } catch (err) {
    console.error("Failed to parse Claude response:", err?.message || err);

    const fallback =
      legalActions.find((a) => a.type === "rollDice") ||
      legalActions.find((a) => a.type === "endTurn") ||
      legalActions[0];

    return {
      reasoning: "Fallback due to parsing error",
      action: fallback
    };
  }
}
