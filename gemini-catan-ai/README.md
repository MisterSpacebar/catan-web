# Gemini Catan AI Agent

A Google Gemini-powered AI agent for playing Settlers of Catan, similar to the Claude agent but using Google's Generative AI.

## Features

- **Gemini Pro Integration**: Uses Google's Gemini Pro model for strategic decision making
- **Multiple Personalities**: Aggressive, balanced, or defensive playing styles
- **Mock Mode**: Test without API costs using mock responses
- **Strategic Analysis**: Game phase detection (early/mid/end game)
- **Legal Move Validation**: Only suggests valid actions based on current game state
- **Robust Error Handling**: Fallback strategies when API calls fail

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your settings:
GOOGLE_API_KEY=your_actual_gemini_api_key_here
USE_REAL_GEMINI=false  # Start with false for testing
CATAN_API_BASE=http://localhost:4000
PORT=5100
```

### 3. Get Google API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create a new project or select existing
4. Generate API key
5. Add it to your `.env` file

## Running the Service

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The service will run on `http://localhost:5100` (or your configured PORT).

## API Endpoints

### Health Check
```bash
GET /health
```

### Get AI Decision
```bash
POST /ai/decide
Content-Type: application/json

{
  "gameState": { /* complete game state */ },
  "playerId": 0
}
```

### Play AI Turn
```bash
POST /ai/play-turn/:gameId/:playerId
```

## Usage Examples

### Test the Service
```bash
curl http://localhost:5100/health
```

### Let AI Play a Turn
```bash
# First create a game in the main Catan API
curl -X POST http://localhost:4000/api/games \
  -H "Content-Type: application/json" \
  -d '{"numPlayers": 4}'

# Then let Gemini AI play for player 0
curl -X POST http://localhost:5100/ai/play-turn/GAME_ID/0
```

## Architecture

### Core Components

- **`ai-agent.js`**: Main Gemini AI integration
- **`game-state-parser.js`**: Converts game state to AI-readable format
- **`legal-actions.js`**: Computes valid moves based on game rules
- **`strategy-prompts.js`**: Builds strategic prompts for Gemini
- **`action-mapper.js`**: Parses Gemini responses into game actions

### Personality Types

- **Aggressive**: Risk-taking, VP-focused, opponent-blocking
- **Balanced**: Even mix of growth and defense
- **Defensive**: Conservative, resource-securing, risk-averse

## Testing Workflow

1. **Start with Mock Mode**: Set `USE_REAL_GEMINI=false`
2. **Test API Integration**: Verify endpoints work with mock responses
3. **Enable Real AI**: Set `USE_REAL_GEMINI=true` and add API key
4. **Run Live Tests**: Create games and let AI play

## Error Handling

The AI agent includes robust error handling:

- **API Failures**: Falls back to rule-based decisions
- **Invalid Responses**: Parses alternative response formats
- **Network Issues**: Retries and fallback strategies
- **Game State Errors**: Graceful degradation

## Integration with Main Game

The Gemini AI works with your existing Catan game server:

1. **Catan Game Server**: Runs on port 4000
2. **Gemini AI Service**: Runs on port 5100
3. **Communication**: AI service calls game API to make moves

## Differences from Claude Agent

- **API**: Uses Google Generative AI instead of Anthropic
- **Model**: Gemini Pro instead of Claude 3.5 Sonnet
- **Port**: 5100 instead of 5050 (to run alongside Claude)
- **Response Parsing**: Adapted for Gemini's response format
- **Error Handling**: Enhanced for Gemini-specific edge cases

## Development Notes

- **Mock Mode**: Perfect for development and testing
- **API Costs**: Gemini Pro has generous free tier
- **Rate Limits**: Built-in error handling for API limits
- **Debugging**: Extensive logging for troubleshooting

## Troubleshooting

### Common Issues

1. **"API Key not valid"**: Check your Google API key in `.env`
2. **"Game not found"**: Ensure Catan server is running on port 4000
3. **"No legal actions"**: Check game state and player turn status
4. **"Parsing error"**: AI response format issue, will use fallback

### Debug Mode

Enable detailed logging by setting environment variables:
```bash
DEBUG=true node src/server.js
```

This creates a complete Gemini-powered AI that can compete against your Claude AI!