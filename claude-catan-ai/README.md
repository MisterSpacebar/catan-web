# Claude Catan AI

A lightweight Node.js middleware that uses Claude to choose the next Settlers of Catan action, then executes it against the existing Catan API running on port 4000.

## Prerequisites
- Node.js 18+
- Running Catan API at `http://localhost:4000`

## Setup
```bash
cd claude-catan-ai
npm install
cp .env.example .env   # add your ANTHROPIC_API_KEY
```

## Configuration
Set these in `.env`:
- `ANTHROPIC_API_KEY` – your Claude key
- `CATAN_API_BASE` – defaults to `http://localhost:4000`
- `PORT` – defaults to `5050`
- `USE_REAL_CLAUDE` – set to `true` to call the Anthropic API, `false` for mock mode (no external calls)

## Run
```bash
npm run dev   # nodemon on port 5050
# or
npm start
```

## Endpoints
- `GET /health` – basic readiness check
- `POST /ai/decide` – body `{ "gameState": { ... }, "playerId": 0 }`; returns Claude's reasoning + chosen action
- `POST /ai/play-turn/:gameId/:playerId` – fetches game state from the Catan API, asks Claude for an action, applies it via Catan API, returns both the decision and the game API response

## Quick Test Flow
```bash
# Terminal 1: Catan API
cd ../catan-sandbox
node server/server.js

# Terminal 2: Claude AI service
cd ../claude-catan-ai
npm run dev

# Terminal 3: Play one AI turn (replace GAME_ID from create response)
curl -X POST http://localhost:4000/api/games -H "Content-Type: application/json" -d '{"numPlayers":4}'
curl -X POST http://localhost:5000/ai/play-turn/GAME_ID/0 -H "Content-Type: application/json" -d '{}'
```
