function formatResources(resources = {}) {
  const order = ["wood", "brick", "wheat", "sheep", "ore"];
  return order
    .map((res) => `${resources[res] || 0} ${res}`)
    .join(", ");
}

export function formatGameStateForAI(gameState, playerId) {
  const players = gameState?.players || [];
  const player = players.find((p) => p.id === playerId) || players[playerId];
  if (!player) {
    return {
      phase: "early",
      stateDescription: `Player ${playerId} not found. Defaulting to conservative action.`
    };
  }

  const maxVp = Math.max(...players.map((p) => p.vp || 0), 0);
  let phase = "early";
  if (maxVp >= 8) phase = "end";
  else if (maxVp >= 5) phase = "mid";

  const phaseText = {
    early: "Early game (focus on securing good spots and diverse resources).",
    mid: "Mid game (upgrade to cities and build toward Longest Road).",
    end: "End game (race to 10 VP and block leaders)."
  };

  const opponents = players
    .filter((p) => p.id !== playerId)
    .map((p) => ({ name: p.name || `Player ${p.id + 1}`, vp: p.vp || 0, id: p.id }));

  const leadingVp = Math.max(...opponents.map((o) => o.vp), player.vp || 0);

  const opponentLines = opponents
    .map((o) => {
      const marker = o.vp === leadingVp && o.vp > (player.vp || 0) ? " (LEADING)" : "";
      return `  - ${o.name}: ${o.vp} VP${marker}`;
    })
    .join("\n");

  const stateDescription = `You are ${player.name || `Player ${player.id + 1}`} (${player.color || "unknown color"}) with ${
    player.vp || 0
  } VP.\nResources: ${formatResources(player.resources)}.\nYou have ${player.hasRolled ? "already" : "NOT"} rolled this turn.\n\nOpponents:\n${opponentLines || "  - none"}\n\nGame Phase: ${phaseText[phase]}\nCurrent turn player: ${
    players.find((p) => p.id === gameState.current)?.name || `Player ${gameState.current}`
  }.`;

  return {
    phase,
    stateDescription
  };
}
