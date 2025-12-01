// Helper functions for proper placement validation
function getValidTownPlacements(gameState, playerId) {
  const nodes = gameState?.board?.nodes || [];
  const edges = gameState?.board?.edges || [];
  
  console.log(`Checking valid town placements for player ${playerId}...`);
  
  const validNodes = nodes.filter((node, nodeIndex) => {
    // Must be empty and buildable
    if (node.building) {
      console.log(`Node ${nodeIndex}: has building (${node.building.type})`);
      return false;
    }
    
    if (!node.canBuild) {
      console.log(`Node ${nodeIndex}: canBuild is false`);
      return false;
    }
    
    // Check distance rule: no adjacent nodes can have buildings
    const adjacentNodes = getAdjacentNodes(nodeIndex, edges, nodes);
    const adjacentWithBuildings = adjacentNodes.filter(adjNode => adjNode.building);
    
    if (adjacentWithBuildings.length > 0) {
      console.log(`Node ${nodeIndex}: too close to buildings at nodes ${adjacentWithBuildings.map(n => n.id || nodes.indexOf(n)).join(', ')}`);
      return false;
    }
    
    // Check connectivity: must be connected to player's road network
    // (Skip this check for initial placement phase)
    if (isInitialPlacement(gameState)) {
      console.log(`Node ${nodeIndex}: valid for initial placement`);
      return true;
    }
    
    const connectedPlayerRoads = getConnectedEdges(nodeIndex, edges)
      .filter(edge => edge.ownerId === playerId);
    
    if (connectedPlayerRoads.length === 0) {
      console.log(`Node ${nodeIndex}: not connected to player ${playerId}'s road network`);
      return false;
    }
    
    console.log(`Node ${nodeIndex}: VALID for town placement`);
    return true;
  });
  
  console.log(`Found ${validNodes.length} valid town placement spots:`, validNodes.map((_, i) => nodes.indexOf(validNodes[i])));
  return validNodes;
}

function getValidRoadPlacements(gameState, playerId) {
  const edges = gameState?.board?.edges || [];
  const nodes = gameState?.board?.nodes || [];
  
  return edges.filter(edge => {
    // Must be empty
    if (edge.ownerId !== null) return false;
    
    // Check connectivity: must connect to existing player infrastructure
    // (Skip this check for initial placement phase)
    if (isInitialPlacement(gameState)) return true;
    
    // Must connect to player's existing roads or buildings
    const node1 = nodes[edge.n1];
    const node2 = nodes[edge.n2];
    
    // Connected if either endpoint has player's building
    if ((node1?.building?.ownerId === playerId) || (node2?.building?.ownerId === playerId)) {
      return true;
    }
    
    // Connected if adjacent to player's road
    const adjacentEdges1 = getConnectedEdges(node1, edges);
    const adjacentEdges2 = getConnectedEdges(node2, edges);
    
    const hasAdjacentRoad = [...adjacentEdges1, ...adjacentEdges2]
      .some(adjEdge => adjEdge.ownerId === playerId && adjEdge.id !== edge.id);
    
    return hasAdjacentRoad;
  });
}

function getAdjacentNodes(nodeIndex, edges, nodes) {
  return getConnectedEdges(nodeIndex, edges)
    .map(edge => {
      const otherNodeIndex = edge.n1 === nodeIndex ? edge.n2 : edge.n1;
      return nodes[otherNodeIndex];
    })
    .filter(Boolean);
}

function getConnectedEdges(nodeIndex, edges) {
  return edges.filter(edge => edge.n1 === nodeIndex || edge.n2 === nodeIndex);
}

function isInitialPlacement(gameState) {
  // Simple heuristic: if very few buildings exist, we're in initial placement
  const totalBuildings = (gameState?.board?.nodes || [])
    .filter(node => node.building).length;
  const playerCount = gameState?.players?.length || 4;
  
  // Initial placement: each player places 2 settlements + 2 roads
  return totalBuildings < playerCount * 2;
}

export function computeLegalActions(gameState, playerId) {
  const player = gameState?.players?.[playerId];
  const actions = [];

  if (!player) return [{ type: "endTurn", payload: null }];

  const resources = player.resources || {};

  function canAfford(cost) {
    return Object.keys(cost).every((res) => (resources[res] || 0) >= cost[res]);
  }

  // 1. Check game phase and enforce proper turn order
  
  // During setup phase, different rules apply
  if (gameState?.phase === 'setup' || gameState?.currentPhase === 'setup' || isInitialPlacement(gameState)) {
    console.log("In setup phase - allowing placement actions");
    // In setup, players place settlements and roads without rolling
    const validNodes = getValidTownPlacements(gameState, playerId);
    const validEdges = getValidRoadPlacements(gameState, playerId);
    
    if (validNodes.length > 0) {
      validNodes.slice(0, 2).forEach((node) => {
        actions.push({
          type: "buildTown",
          payload: { nodeId: node.id, playerId }
        });
      });
    }
    
    if (validEdges.length > 0) {
      validEdges.slice(0, 2).forEach((edge) => {
        actions.push({
          type: "buildRoad", 
          payload: { edgeId: edge.id, playerId, free: true }
        });
      });
    }
    
    actions.push({ type: "endTurn", payload: null });
    return actions;
  }

  // 2. Must roll dice first in regular play (unless already rolled this turn)
  const needsToRoll = !player.hasRolled && 
                      !gameState?.diceRolledThisTurn && 
                      gameState?.phase !== 'robber' &&
                      gameState?.currentPhase !== 'robber';
                      
  if (needsToRoll) {
    console.log("Player must roll dice first");
    return [{ type: "rollDice", payload: null }];
  }
  
  console.log("Dice already rolled this turn, allowing other actions");

  // 3. Settlement / town (with proper validation)
  if (canAfford({ wood: 1, brick: 1, wheat: 1, sheep: 1 })) {
    const validNodes = getValidTownPlacements(gameState, playerId);
    
    validNodes.slice(0, 3).forEach((node) => { // Limit to first 3 for simplicity
      actions.push({
        type: "buildTown",
        payload: { nodeId: node.id, playerId }
      });
    });
  }

  // 4. Road (with proper validation)
  if (canAfford({ wood: 1, brick: 1 })) {
    const validEdges = getValidRoadPlacements(gameState, playerId);
    
    validEdges.slice(0, 3).forEach((edge) => { // Limit to first 3 for simplicity
      actions.push({
        type: "buildRoad",
        payload: { edgeId: edge.id, playerId, free: false }
      });
    });
  }

  // 5. City (upgrade from town)
  if (canAfford({ wheat: 2, ore: 3 })) {
    const playerTowns = (gameState?.board?.nodes || [])
      .filter(
        (node) =>
          node.building &&
          node.building.ownerId === playerId &&
          node.building.type === "town"
      )
      .slice(0, 2); // Limit to first 2 for simplicity

    playerTowns.forEach((node) => {
      actions.push({
        type: "buildCity",
        payload: { nodeId: node.id, playerId }
      });
    });
  }

  // 6. Harbor trades (simplified 4:1 trades)
  for (const res of ["wood", "brick", "wheat", "sheep", "ore"]) {
    if ((resources[res] || 0) >= 4) {
      const others = ["wood", "brick", "wheat", "sheep", "ore"].filter((r) => r !== res);
      // Only add one trade option per resource to keep it simple
      if (others.length > 0) {
        actions.push({
          type: "harborTrade",
          payload: { playerId, giveResource: res, receiveResource: others[0] }
        });
      }
    }
  }

  // 7. Buy development card
  if (canAfford({ sheep: 1, wheat: 1, ore: 1 })) {
    actions.push({
      type: "buyDevCard",
      payload: { playerId }
    });
  }

  // 8. Move robber (ONLY in specific situations)
  // Check if we're in a robber-movement phase or have rolled 7 this turn
  const shouldMoveRobber = 
    gameState?.phase === 'robber' ||  // Game is in robber phase
    gameState?.currentPhase === 'robber' ||  // Alternative phase name
    gameState?.mustMoveRobber === true ||  // Explicit flag
    (gameState?.dice && Array.isArray(gameState.dice) && 
     gameState.dice.length === 2 && 
     (gameState.dice[0] + gameState.dice[1]) === 7 && 
     gameState?.robberMovedThisTurn !== true) ||  // Just rolled 7 and haven't moved yet
    (gameState?.lastDiceRoll === 7 && gameState?.robberMovedThisTurn !== true);  // Alternative dice tracking

  if (shouldMoveRobber) {
    console.log("Robber movement required - dice total was 7 or in robber phase");
    const hexes = gameState?.board?.tiles || gameState?.board?.hexes || [];
    const nonRobberHex = hexes.find((tile, index) => 
      !tile.hasRobber && 
      tile.resource !== 'water' && 
      tile.resource !== null
    );
    if (nonRobberHex) {
      const hexIndex = hexes.indexOf(nonRobberHex);
      actions.push({
        type: "moveRobber",
        payload: { hexId: hexIndex }
      });
    }
  } else {
    console.log("No robber movement needed - not rolled 7 or already moved");
  }

  // 9. Always can end turn
  actions.push({ type: "endTurn", payload: null });

  // Safety check: ensure we always have at least one action
  if (actions.length === 0) {
    console.warn("No legal actions computed, falling back to endTurn");
    return [{ type: "endTurn", payload: null }];
  }

  console.log(`Computed ${actions.length} legal actions for player ${playerId}:`, 
    actions.map(a => a.type).join(', '));

  return actions;
}