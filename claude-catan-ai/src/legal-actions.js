export function computeLegalActions(gameState, playerId) {
  const player = gameState?.players?.[playerId];
  const actions = [];

  if (!player) return [{ type: "endTurn", payload: null }];

  const resources = player.resources || {};

  function canAfford(cost) {
    return Object.keys(cost).every((res) => (resources[res] || 0) >= cost[res]);
  }

  // 1. Must roll first
  if (!player.hasRolled) {
    return [{ type: "rollDice", payload: null }];
  }

  // 2. Settlement / town
  if (canAfford({ wood: 1, brick: 1, wheat: 1, sheep: 1 })) {
    const emptyNodes = (gameState?.board?.nodes || [])
      .filter((node) => node.building === null)
      .slice(0, 3);

    emptyNodes.forEach((node) => {
      actions.push({
        type: "buildTown",
        payload: { nodeId: node.id, playerId }
      });
    });
  }

  // 3. Road
  if (canAfford({ wood: 1, brick: 1 })) {
    const emptyEdges = (gameState?.board?.edges || [])
      .filter((edge) => edge.ownerId == null)
      .slice(0, 3);

    emptyEdges.forEach((edge) => {
      actions.push({
        type: "buildRoad",
        payload: { edgeId: edge.id, playerId, free: false }
      });
    });
  }

  // 4. City
  if (canAfford({ wheat: 2, ore: 3 })) {
    const playerTowns = (gameState?.board?.nodes || [])
      .filter(
        (node) =>
          node.building &&
          node.building.ownerId === playerId &&
          node.building.type === "town"
      )
      .slice(0, 2);

    playerTowns.forEach((node) => {
      actions.push({
        type: "buildCity",
        payload: { nodeId: node.id, playerId }
      });
    });
  }

  // 5. Harbor trades
  for (const res of ["wood", "brick", "wheat", "sheep", "ore"]) {
    if ((resources[res] || 0) >= 4) {
      const others = ["wood", "brick", "wheat", "sheep", "ore"].filter((r) => r !== res);
      others.forEach((receiveResource) => {
        actions.push({
          type: "harborTrade",
          payload: { playerId, giveResource: res, receiveResource }
        });
      });
    }
  }

  // 6. Always can end turn
  actions.push({ type: "endTurn", payload: null });

  return actions;
}
