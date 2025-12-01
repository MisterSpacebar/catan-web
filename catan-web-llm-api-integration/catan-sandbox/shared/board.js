// shared/board.js
const TILE_SIZE = 48; // radius of a hex (px)
const HEX_RADIUS = 2; // standard Catan board (radius 2) => 19 tiles
const WATER_RADIUS = 3; // water extends one more ring around the land

// Harbor types
const HARBORS = [
  { type: "2:1", resource: "wood", ratio: 2 },
  { type: "2:1", resource: "brick", ratio: 2 },
  { type: "2:1", resource: "wheat", ratio: 2 },
  { type: "2:1", resource: "sheep", ratio: 2 },
  { type: "2:1", resource: "ore", ratio: 2 },
  { type: "3:1", resource: "any", ratio: 3 },
  { type: "3:1", resource: "any", ratio: 3 },
  { type: "3:1", resource: "any", ratio: 3 },
  { type: "3:1", resource: "any", ratio: 3 },
];

const RESOURCE_DISTRIBUTION = [
  // Standard-ish: 4/4/4/3/3 + 1 desert
  "wood", "wood", "wood", "wood",
  "sheep", "sheep", "sheep", "sheep",
  "wheat", "wheat", "wheat", "wheat",
  "brick", "brick", "brick",
  "ore", "ore", "ore",
  "desert",
];

const NUMBER_TOKENS = [
  2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
]; // 18 tokens; desert gets none

function randShuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function axialToPixel(q, r, size) {
  // pointy-top axial
  const x = size * Math.sqrt(3) * (q + r / 2);
  const y = size * (3 / 2) * r;
  return { x, y };
}

function hexCorner(center, size, i) {
  // pointy-top hex corners (0..5)
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
}

function generateAxialHexes(radius) {
  // All axial coords within hex distance <= radius
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes; // length 19 for radius=2
}

// Helper function to calculate axial distance between two hexes
function axialDistance(hex1, hex2) {
  return (Math.abs(hex1.q - hex2.q) + Math.abs(hex1.q + hex1.r - hex2.q - hex2.r) + Math.abs(hex1.r - hex2.r)) / 2;
}

// Helper function to check if hex is on the outer edge (adjacent to land)
function isOuterEdgeHex(hex, landSet) {
  const { q, r } = hex;
  // Check all 6 adjacent hexes
  const neighbors = [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 }
  ];
  
  // Must be adjacent to at least one land hex
  return neighbors.some(neighbor => landSet.has(`${neighbor.q},${neighbor.r}`));
}

function generateBoard() {
  // 1) Generate land tiles (radius 2) and water tiles (radius 3)
  const landHexes = generateAxialHexes(HEX_RADIUS);
  const allHexes = generateAxialHexes(WATER_RADIUS);
  
  // Separate land and water hexes
  const landSet = new Set(landHexes.map(({ q, r }) => `${q},${r}`));
  const waterHexes = allHexes.filter(({ q, r }) => !landSet.has(`${q},${r}`));
  
  // Find outer edge water hexes (adjacent to land)
  const outerEdgeHexes = waterHexes.filter(hex => isOuterEdgeHex(hex, landSet));
  
  // Shuffle resources & numbers for land tiles
  const resources = randShuffle(RESOURCE_DISTRIBUTION);
  const numbers = randShuffle(NUMBER_TOKENS);
  
  // Place harbors with proper spacing
  const harbors = [...HARBORS];
  const harborPlacements = [];
  const shuffledEdgeHexes = randShuffle([...outerEdgeHexes]);
  
  for (const harbor of harbors) {
    // Find a valid placement (at least distance 2 from other harbors)
    const validHex = shuffledEdgeHexes.find(hex => {
      return harborPlacements.every(placedHex => axialDistance(hex, placedHex) >= 2);
    });
    
    if (validHex) {
      harborPlacements.push(validHex);
      validHex.harbor = harbor;
    }
  }

  // Assign land tiles
  let numberIdx = 0;
  const landTiles = landHexes.map(({ q, r }) => {
    const resource = resources.pop();
    const center = axialToPixel(q, r, TILE_SIZE);
    let number = null;
    if (resource !== "desert") {
      number = numbers[numberIdx++];
    }
    return { q, r, center, resource, number, hasRobber: resource === "desert", isWater: false };
  });

  // Assign water tiles
  const waterTiles = waterHexes.map(({ q, r, harbor }) => {
    const center = axialToPixel(q, r, TILE_SIZE);
    return { q, r, center, resource: "water", number: null, hasRobber: false, isWater: true, harbor: harbor || null };
  });

  // Combine all tiles
  const tiles = [...landTiles, ...waterTiles];

  // 2) Build nodes (corners) & edges from tile geometry
  const nodeMap = new Map(); // key -> nodeId
  const nodes = []; // {id, x, y, adjHexes:[], building:null|{ownerId,type}, harbors:[], canBuild:boolean}
  const edges = []; // {id, n1, n2, ownerId:null}
  const edgeMap = new Map(); // "minId-maxId" -> edgeId

  const roundKey = (x, y) => `${Math.round(x * 1000) / 1000}_${Math.round(y * 1000) / 1000}`;

  tiles.forEach((tile, hexIdx) => {
    const corners = Array.from({ length: 6 }, (_, i) => hexCorner(tile.center, TILE_SIZE, i));

    // Ensure nodes
    const nodeIds = corners.map((pt) => {
      const key = roundKey(pt.x, pt.y);
      if (!nodeMap.has(key)) {
        const id = nodes.length;
        nodeMap.set(key, id);
        nodes.push({ id, x: pt.x, y: pt.y, adjHexes: [hexIdx], building: null, harbors: [], canBuild: false });
        return id;
      } else {
        const id = nodeMap.get(key);
        const node = nodes[id];
        // add adjacency if missing
        if (!node.adjHexes.includes(hexIdx)) node.adjHexes.push(hexIdx);
        // add harbor if this water tile has one
        if (tile.harbor && !node.harbors.some(h => h.type === tile.harbor.type && h.resource === tile.harbor.resource)) {
          node.harbors.push(tile.harbor);
        }
        return id;
      }
    });

    // If this is a water tile with a harbor, add harbor to its corner nodes
    if (tile.harbor) {
      nodeIds.forEach(nodeId => {
        const node = nodes[nodeId];
        if (!node.harbors.some(h => h.type === tile.harbor.type && h.resource === tile.harbor.resource)) {
          node.harbors.push(tile.harbor);
        }
      });
    }

    // Ensure edges (six per tile)
    const E = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]];
    E.forEach(([a, b]) => {
      const n1 = nodeIds[a];
      const n2 = nodeIds[b];
      const key = n1 < n2 ? `${n1}-${n2}` : `${n2}-${n1}`;
      if (!edgeMap.has(key)) {
        const id = edges.length;
        edgeMap.set(key, id);
        edges.push({ id, n1, n2, ownerId: null });
      }
    });
  });

  // Mark nodes as buildable if they're adjacent to at least one land tile
  nodes.forEach(node => {
    node.canBuild = node.adjHexes.some(hexIdx => !tiles[hexIdx].isWater);
  });

  // Before filtering, transfer harbors from water-only nodes to nearby land-adjacent nodes
  const waterOnlyNodes = nodes.filter(node => !node.canBuild && node.harbors.length > 0);
  waterOnlyNodes.forEach(waterNode => {
    // Find the closest land-adjacent node
    const nearbyLandNodes = nodes.filter(node => 
      node.canBuild && 
      Math.abs(node.x - waterNode.x) < TILE_SIZE * 1.5 && 
      Math.abs(node.y - waterNode.y) < TILE_SIZE * 1.5
    );
    
    if (nearbyLandNodes.length > 0) {
      // Transfer harbors to the closest land node
      const closestNode = nearbyLandNodes.reduce((closest, current) => {
        const closestDist = Math.sqrt((closest.x - waterNode.x) ** 2 + (closest.y - waterNode.y) ** 2);
        const currentDist = Math.sqrt((current.x - waterNode.x) ** 2 + (current.y - waterNode.y) ** 2);
        return currentDist < closestDist ? current : closest;
      });
      
      // Add harbors to the closest land node (avoiding duplicates)
      waterNode.harbors.forEach(harbor => {
        if (!closestNode.harbors.some(h => h.type === harbor.type && h.resource === harbor.resource)) {
          closestNode.harbors.push(harbor);
        }
      });
    }
  });

  // Filter out nodes that are only adjacent to water tiles
  // Keep only nodes that are adjacent to at least one land tile
  const filteredNodes = nodes.filter(node => {
    // Keep nodes that are buildable (adjacent to land)
    return node.canBuild;
  });

  // Create a mapping from old node IDs to new node IDs
  const nodeIdMapping = new Map();
  filteredNodes.forEach((node, newIndex) => {
    nodeIdMapping.set(node.id, newIndex);
    node.id = newIndex; // Update to new sequential ID
  });

  // Filter out edges that connect to removed nodes
  // Only keep edges where both nodes are connected to land (both survived filtering)
  const filteredEdges = edges.filter(edge => {
    const hasNode1 = nodeIdMapping.has(edge.n1);
    const hasNode2 = nodeIdMapping.has(edge.n2);
    return hasNode1 && hasNode2;
  }).map((edge, newIndex) => ({
    ...edge,
    id: newIndex,
    n1: nodeIdMapping.get(edge.n1),
    n2: nodeIdMapping.get(edge.n2)
  }));

  return { tiles, nodes: filteredNodes, edges: filteredEdges };
}

export {
  TILE_SIZE,
  HEX_RADIUS,
  WATER_RADIUS,
  HARBORS,
  RESOURCE_DISTRIBUTION,
  NUMBER_TOKENS,
  randShuffle,        // optional to export
  axialToPixel,       // optional
  hexCorner,          // optional
  generateAxialHexes, // optional
  axialDistance,      // optional
  isOuterEdgeHex,     // optional
  generateBoard,
};
