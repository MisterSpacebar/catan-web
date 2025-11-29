function formatActionForPrompt(action) {
  switch (action.type) {
    case "rollDice":
      return "Roll dice";
    case "buildTown":
      return `Build settlement at node ${action.payload.nodeId} (costs: 1 wood, 1 brick, 1 wheat, 1 sheep)`;
    case "buildRoad":
      return `Build road on edge ${action.payload.edgeId} (costs: 1 wood, 1 brick)`;
    case "buildCity":
      return `Upgrade settlement at node ${action.payload.nodeId} to city (costs: 2 wheat, 3 ore)`;
    case "harborTrade":
      return `Trade 4 ${action.payload.giveResource} for 1 ${action.payload.receiveResource}`;
    case "endTurn":
      return "End turn";
    default:
      return JSON.stringify(action);
  }
}

export function buildStrategyPrompt({ phase, personality, stateDescription, legalActions }) {
  const phaseGuidance = {
    early: "Focus on securing strong settlement spots and diverse resources.",
    mid: "Focus on upgrading to cities and building toward Longest Road.",
    end: "Focus on racing to 10 VP and blocking the leading opponent."
  };

  const personalityGuidance = {
    aggressive: "Play aggressively: prioritize VP-generating moves and blocking.",
    balanced: "Play a balanced strategy: weigh both your growth and opponent threats.",
    defensive: "Play defensively: secure resource production and avoid overextension."
  };

  const actionList = legalActions
    .map((action, index) => `${index + 1}. ${formatActionForPrompt(action)}`)
    .join("\n");

  return `You are an expert Settlers of Catan player.

GAME PHASE: ${phase.toUpperCase()}
STRATEGY: ${phaseGuidance[phase] || ""}
PERSONALITY: ${personalityGuidance[personality] || ""}

${stateDescription}

LEGAL ACTIONS (choose ONE by number):
${actionList}

CRITICAL INSTRUCTIONS:
- Respond with ONLY the number of your chosen action (e.g., "3")
- Do NOT include any other text, explanation, or formatting
- Choose the action that best advances your position given the current game state

YOUR RESPONSE (number only):`;
}
