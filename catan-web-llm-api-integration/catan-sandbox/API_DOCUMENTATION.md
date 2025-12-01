# Catan Web Game API Documentation

This document provides comprehensive documentation for the Catan Web Game REST API, including all available endpoints, request/response formats, and usage examples.

## Base Information

- **Base URL**: `http://localhost:4000`
- **Content-Type**: `application/json`
- **CORS**: Enabled for cross-origin requests

## Quick Start

1. **Start the server**: `node server/server.js` (runs on port 4000)
2. **Test the API**: Visit `http://localhost:4000` for health check
3. **Use the test interface**: Open `test.html` in browser for interactive testing

## Testing

1. **Start the server**: `node server/server.js`
2. **Test the API**: Visit `http://localhost:8080/test.html`

---

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check and API info |
| `POST` | `/api/games` | Create a new game |
| `GET` | `/api/games` | List all active games |
| `GET` | `/api/games/:id` | Get specific game state |
| `GET` | `/api/games/:id/log` | Get game event log |
| `POST` | `/api/games/:id/actions` | Perform game action |
| `DELETE` | `/api/games` | Clear all games |
| `DELETE` | `/api/games/:id` | Delete specific game |

---

## Detailed Endpoint Documentation

### 1. Health Check

**`GET /`**

Returns server status and available endpoints.

**Response:**
```json
{
  "message": "Catan API is running!",
  "version": "1.0.0",
  "endpoints": {
    "POST /api/games": "Create a new game",
    "GET /api/games": "List all games",
    "GET /api/games/:id": "Get game state",
    "POST /api/games/:id/actions": "Perform game action",
    "DELETE /api/games": "Clear all games",
    "DELETE /api/games/:id": "Delete specific game"
  },
  "activeGames": 2
}
```

---

### 2. Create New Game

**`POST /api/games`**

Creates a new Catan game instance with randomized board.

**Request Body (Optional):**
```json
{
  "numPlayers": 4
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "numPlayers": 4,
  "board": {
    "tiles": [...],
    "nodes": [...],
    "edges": [...]
  },
  "players": [
    {
      "id": 0,
      "name": "Player 1",
      "color": "#1976d2",
      "resources": { "wood": 1, "brick": 1, "wheat": 1, "sheep": 1, "ore": 1 },
      "vp": 2,
      "devCards": [],
      "playedDevCards": [],
      "knightsPlayed": 0,
      "largestArmy": false,
      "longestRoad": false,
      "boughtDevCardThisTurn": false,
      "hasRolled": false
    }
  ],
  "current": 0,
  "lastRoll": null,
  "lastProduction": null,
  "winner": null
}
```

---

### 3. List Games

**`GET /api/games`**

Returns list of all active games with summary information.

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "numPlayers": 4,
    "currentPlayer": 0,
    "playerNames": ["Player 1", "Player 2", "Player 3", "Player 4"],
    "winner": null,
    "createdAt": "2025-11-24T12:00:00.000Z"
  }
]
```

---

### 4. Get Game State

**`GET /api/games/:id`**

Returns the complete current state of a specific game.

**Response:** Same as Create New Game response above.

**Error Response (404):**
```json
{
  "error": "Game not found"
}
```

---

### 5. Get Game Log

**`GET /api/games/:id/log`**

Returns the complete event history for a game.

**Response:**
```json
[
  {
    "timestamp": "2025-11-24T12:00:00.000Z",
    "type": "rollDice",
    "d1": 3,
    "d2": 4,
    "total": 7
  },
  {
    "timestamp": "2025-11-24T12:00:05.000Z",
    "type": "moveRobber",
    "hexId": 5
  }
]
```

---

### 6. Game Actions

**`POST /api/games/:id/actions`**

Performs various game actions. All actions follow the same request structure but with different payloads.

**Request Structure:**
```json
{
  "type": "actionType",
  "payload": { /* action-specific data */ }
}
```

**Success Response:**
```json
{
  "ok": true,
  "event": { /* event object */ },
  "state": { /* complete game state */ }
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message explaining what went wrong"
}
```

#### Available Actions:

##### Roll Dice
```json
{
  "type": "rollDice"
}
```
*Note: No payload needed. Player must not have already rolled this turn.*

##### Move Robber
```json
{
  "type": "moveRobber",
  "payload": {
    "hexId": 5
  }
}
```

##### Build Road
```json
{
  "type": "buildRoad",
  "payload": {
    "edgeId": 42,
    "playerId": 0,
    "free": false
  }
}
```
*Note: `free` is optional (defaults to false). Used for Road Building dev card.*

##### Build Town/Settlement
```json
{
  "type": "buildTown",
  "payload": {
    "nodeId": 15,
    "playerId": 0
  }
}
```

##### Build City
```json
{
  "type": "buildCity",
  "payload": {
    "nodeId": 15,
    "playerId": 0
  }
}
```

##### Harbor Trade
```json
{
  "type": "harborTrade",
  "payload": {
    "playerId": 0,
    "giveResource": "wood",
    "receiveResource": "wheat"
  }
}
```

##### Buy Development Card
```json
{
  "type": "buyDevCard",
  "payload": {
    "playerId": 0
  }
}
```

##### Play Knight
```json
{
  "type": "playKnight",
  "payload": {
    "playerId": 0
  }
}
```

##### Play Year of Plenty
```json
{
  "type": "playYearOfPlenty",
  "payload": {
    "playerId": 0,
    "resource1": "wood",
    "resource2": "wheat"
  }
}
```

##### Play Monopoly
```json
{
  "type": "playMonopoly",
  "payload": {
    "playerId": 0,
    "resource": "wheat"
  }
}
```

##### Play Road Building
```json
{
  "type": "playRoadBuilding",
  "payload": {
    "playerId": 0
  }
}
```
*Note: After playing this card, use `buildRoad` with `"free": true` twice.*

##### End Turn
```json
{
  "type": "endTurn"
}
```

---

### 7. Delete Operations

#### Clear All Games
**`DELETE /api/games`**

Removes all games from server memory.

**Response:**
```json
{
  "message": "Cleared 3 games from server memory",
  "previousCount": 3,
  "currentCount": 0
}
```

#### Delete Specific Game
**`DELETE /api/games/:id`**

Removes a specific game from server memory.

**Response:**
```json
{
  "message": "Game 550e8400-e29b-41d4-a716-446655440000 deleted successfully",
  "gameId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (404):**
```json
{
  "error": "Game not found"
}
```

---

## Data Structures

### Game Board Structure

The game board contains three main components:

#### Tiles (Hexes)
```json
{
  "q": 0, "r": 0,           // Axial coordinates
  "center": {"x": 0, "y": 0}, // Pixel coordinates
  "resource": "wood",        // "wood", "brick", "wheat", "sheep", "ore", "desert", "water"
  "number": 8,              // Dice roll number (2-12, null for desert/water)
  "hasRobber": false,       // Whether robber is on this tile
  "isWater": false,         // Whether this is a water tile
  "harbor": null            // Harbor info if present
}
```

#### Nodes (Settlement/City spots)
```json
{
  "id": 0,
  "x": 100, "y": 150,      // Pixel coordinates
  "adjHexes": [0, 1, 2],   // Adjacent tile indices
  "building": null,         // null or {"ownerId": 0, "type": "town"/"city"}
  "harbors": [],           // Array of harbor objects
  "canBuild": true         // Whether building is allowed here
}
```

#### Edges (Road spots)
```json
{
  "id": 0,
  "n1": 5, "n2": 6,        // Connected node IDs
  "ownerId": null          // null or player ID who owns the road
}
```

### Player Structure
```json
{
  "id": 0,
  "name": "Player 1",
  "color": "#1976d2",
  "resources": {
    "wood": 2, "brick": 1, "wheat": 3, "sheep": 0, "ore": 1
  },
  "vp": 4,                    // Victory points
  "devCards": [               // Unplayed development cards
    {"type": "knight", "canPlay": true}
  ],
  "playedDevCards": [],       // Cards played this turn
  "knightsPlayed": 2,         // Total knights played (for largest army)
  "largestArmy": false,       // Has largest army bonus
  "longestRoad": true,        // Has longest road bonus
  "boughtDevCardThisTurn": false,
  "hasRolled": false          // Has rolled dice this turn
}
```

---

## Game Rules Implementation

### Building Rules
- **Roads**: Must connect to existing roads or buildings. Cost: 1 wood + 1 brick.
- **Towns**: Must be on empty node with no adjacent buildings. Cost: 1 wood + 1 brick + 1 wheat + 1 sheep.
- **Cities**: Upgrade existing town. Cost: 2 wheat + 3 ore.

### Victory Conditions
- **10 Victory Points** wins the game
- **VP Sources**: Towns (1), Cities (2), Longest Road (2), Largest Army (2), Victory Point cards (1 each)

### Turn Sequence
1. **Roll dice** (required first action)
2. **Collect resources** (automatic if not 7)
3. **Move robber** (if rolled 7)
4. **Build/Trade/Play cards** (optional, any order)
5. **End turn** (advances to next player)

### Trading
- **Harbor trades** use player's best available ratio (4:1 default, 3:1 generic harbors, 2:1 specific resource harbors)
- **Player trades** not implemented in current API

---

## Testing Tools

### Interactive Test Interface
Open `test.html` in your browser for a comprehensive testing interface that includes:

- **Game Management**: Create, list, and clear games
- **ASCII Board Visualization**: Visual coordinate mapping for nodes, edges, and hexes
- **Building Actions**: Test settlement, city, and road building
- **Game Actions**: Roll dice, move robber, end turns
- **Strategic Guides**: Robber placement recommendations
- **Detailed Logging**: Expandable/collapsible action logs

### Example Usage Flow
```bash
# 1. Start server
cd server && node server.js

# 2. Create game
curl -X POST http://localhost:4000/api/games \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 4}'

# 3. Roll dice (use game ID from step 2)
curl -X POST http://localhost:4000/api/games/GAME_ID/actions \
  -H "Content-Type: application/json" \
  -d '{"type": "rollDice"}'

# 4. Build a town
curl -X POST http://localhost:4000/api/games/GAME_ID/actions \
  -H "Content-Type: application/json" \
  -d '{"type": "buildTown", "payload": {"nodeId": 15, "playerId": 0}}'
```

---

## Error Handling

Common error scenarios and their responses:

### Game Not Found (404)
```json
{"error": "Game not found"}
```

### Invalid Action (400)
```json
{"ok": false, "error": "Cannot build here: distance rule violation"}
```

### Insufficient Resources (400)
```json
{"ok": false, "error": "Cannot afford this action: need 1 wood, 1 brick"}
```

### Turn State Errors (400)
```json
{"ok": false, "error": "Must roll dice first"}
```

---

## Development Notes

- **Game State**: Stored in server memory (Map). Cleared on server restart.
- **Persistence**: No database persistence. Use DELETE endpoints to clear test data.
- **Multiplayer**: Each game supports 3-4 players. No real-time synchronization implemented.
- **Board Generation**: Randomized tile placement and number distribution on game creation.
- **Initial Setup**: Automatic placement of initial settlements and roads for faster testing.

For interactive testing and coordinate mapping, use the provided `test.html` interface which includes ASCII board visualization and API testing tools.