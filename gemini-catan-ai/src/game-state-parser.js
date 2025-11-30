function formatResources(resources = {}) {
  const order = ["wood", "brick", "wheat", "sheep", "ore"];
  return order
    .map((res) => `${resources[res] || 0} ${res}`)
    .join(", ");
}

function analyzeBoardState(gameState, playerId) {
  const board = gameState?.board;
  if (!board) return "BOARD ANALYSIS: No board data available.";

  const nodes = board.nodes || [];
  const edges = board.edges || [];
  const tiles = board.tiles || [];

  // Analyze your buildings
  const myBuildings = nodes.filter(node => 
    node.building && node.building.ownerId === playerId
  );
  
  const myTowns = myBuildings.filter(b => b.building.type === 'town');
  const myCities = myBuildings.filter(b => b.building.type === 'city');
  const myRoads = edges.filter(edge => edge.ownerId === playerId);

  // Analyze available spots
  const availableNodes = nodes.filter(node => 
    !node.building && node.canBuild
  );

  // Check which available nodes are actually legal (not too close to others)
  const legalTownSpots = availableNodes.filter(node => {
    // Get adjacent nodes
    const adjacentEdges = edges.filter(edge => 
      edge.n1 === node.id || edge.n2 === node.id
    );
    const adjacentNodeIds = adjacentEdges.map(edge => 
      edge.n1 === node.id ? edge.n2 : edge.n1
    );
    const adjacentNodes = adjacentNodeIds.map(id => nodes[id]).filter(Boolean);
    
    // Check if any adjacent nodes have buildings (illegal)
    const hasAdjacentBuilding = adjacentNodes.some(adjNode => adjNode.building);
    return !hasAdjacentBuilding;
  });

  // Analyze resource production
  const resourceAnalysis = analyzeResourceProduction(myBuildings, tiles);

  // Find strategic spots (high-value intersections)
  const strategicSpots = legalTownSpots
    .map(node => ({
      id: node.id,
      resources: getNodeResources(node, tiles),
      diceNumbers: getNodeDiceNumbers(node, tiles),
      score: calculateNodeScore(node, tiles)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 spots

  let analysis = "BOARD ANALYSIS:\n";
  analysis += `Your Buildings: ${myTowns.length} towns, ${myCities.length} cities, ${myRoads.length} roads\n`;
  analysis += `Legal Building Spots: ${legalTownSpots.length} available (out of ${availableNodes.length} total spots)\n`;
  analysis += `Resource Production: ${resourceAnalysis}\n`;

  if (strategicSpots.length > 0) {
    analysis += `Best Available Spots:\n`;
    strategicSpots.forEach((spot, i) => {
      analysis += `   ${i+1}. Node ${spot.id}: [${spot.resources.join(', ')}] dice ${spot.diceNumbers.join(',')} (score: ${spot.score})\n`;
    });
  }

  // Add opponent threat analysis
  const opponentBuildings = nodes.filter(node => 
    node.building && node.building.ownerId !== playerId
  );
  analysis += `⚠️  Opponent Buildings: ${opponentBuildings.length} total\n`;

  return analysis;
}

function analyzeResourceProduction(myBuildings, tiles) {
  const production = { wood: 0, brick: 0, wheat: 0, sheep: 0, ore: 0 };
  
  myBuildings.forEach(building => {
    const adjacentHexes = building.adjHexes || [];
    adjacentHexes.forEach(hexIndex => {
      const tile = tiles[hexIndex];
      if (tile && tile.resource && tile.resource !== 'desert' && tile.resource !== 'water') {
        const multiplier = building.building.type === 'city' ? 2 : 1;
        production[tile.resource] = (production[tile.resource] || 0) + multiplier;
      }
    });
  });

  const resourceList = Object.entries(production)
    .filter(([_, count]) => count > 0)
    .map(([resource, count]) => `${count} ${resource}`)
    .join(', ');

  return resourceList || 'No production yet';
}

function getNodeResources(node, tiles) {
  const adjacentHexes = node.adjHexes || [];
  return adjacentHexes
    .map(hexIndex => tiles[hexIndex])
    .filter(tile => tile && tile.resource && tile.resource !== 'desert' && tile.resource !== 'water')
    .map(tile => tile.resource);
}

function getNodeDiceNumbers(node, tiles) {
  const adjacentHexes = node.adjHexes || [];
  return adjacentHexes
    .map(hexIndex => tiles[hexIndex])
    .filter(tile => tile && tile.number)
    .map(tile => tile.number);
}

function calculateNodeScore(node, tiles) {
  const diceNumbers = getNodeDiceNumbers(node, tiles);
  const resources = getNodeResources(node, tiles);
  
  // Score based on dice probability (6,8 are best, 2,12 are worst)
  const diceScore = diceNumbers.reduce((score, num) => {
    const probability = {
      2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 0, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1
    }[num] || 0;
    return score + probability;
  }, 0);

  // Bonus for resource diversity
  const diversityBonus = new Set(resources).size * 2;

  return diceScore + diversityBonus;
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

  // Add detailed board analysis
  const boardAnalysis = analyzeBoardState(gameState, playerId);

  const stateDescription = `You are ${player.name || `Player ${player.id + 1}`} (${player.color || "unknown color"}) with ${
    player.vp || 0
  } VP.\nResources: ${formatResources(player.resources)}.\nYou have ${player.hasRolled ? "already" : "NOT"} rolled this turn.\n\nOpponents:\n${opponentLines || "  - none"}\n\nGame Phase: ${phaseText[phase]}\nCurrent turn player: ${
    players.find((p) => p.id === gameState.current)?.name || `Player ${gameState.current}`
  }.\n\n${boardAnalysis}`;

  return {
    phase,
    stateDescription
  };
}