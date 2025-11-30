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
    case "buyDevCard":
      return "Buy development card (costs: 1 sheep, 1 wheat, 1 ore)";
    case "moveRobber":
      return `Move robber to hex ${action.payload.hexId}`;
    case "endTurn":
      return "End turn";
    default:
      return JSON.stringify(action);
  }
}

export function buildStrategyPrompt({ phase, personality, stateDescription, legalActions }) {
  const phaseGuidance = {
    early: "Focus on securing strong settlement spots and diverse resource production. Prioritize expansion over upgrades.",
    mid: "Focus on upgrading settlements to cities for better resource generation. Consider building toward Longest Road.",
    end: "Focus on racing to 10 VP and blocking the leading opponent. Every decision is critical."
  };

  const personalityGuidance = {
    aggressive: "Play aggressively: prioritize VP-generating moves, block opponents, and take calculated risks.",
    balanced: "Play a balanced strategy: weigh both your growth opportunities and opponent threats equally.",
    defensive: "Play defensively: secure consistent resource production and avoid risky moves that could backfire."
  };

  const actionList = legalActions
    .map((action, index) => `${index + 1}. ${formatActionForPrompt(action)}`)
    .join("\n");

  return `You are an expert Settlers of Catan player with deep board analysis capabilities.

CURRENT SITUATION:
Game Phase: ${phase.toUpperCase()}
Strategy Focus: ${phaseGuidance[phase] || ""}
Playing Style: ${personalityGuidance[personality] || ""}

DETAILED GAME STATE:
${stateDescription}

AVAILABLE ACTIONS (choose ONE by number):
${actionList}

STRATEGIC DECISION FRAMEWORK:
- BUILD SETTLEMENTS: Choose high-scoring nodes with good dice numbers (6,8 are best) and diverse resources
- BUILD ROADS: Connect to valuable unoccupied nodes or extend toward strategic positions  
- BUILD CITIES: Upgrade settlements on your best resource-producing spots first
- RESOURCE TRADES: Balance your hand to afford key buildings
- END TURN: Only when no beneficial actions remain

CRITICAL CONSIDERATIONS:
- Settlement placement is PERMANENT - choose wisely based on the board analysis above
- Roads must connect to your existing network (buildings or roads)
- Block opponents from high-value spots when possible
- Resource diversity beats specialization in most phases

Respond with ONLY the number of your chosen action (e.g., "3"). No explanation needed.

YOUR CHOICE:`;
}