import axios from 'axios';

const CATAN_API_BASE = 'http://localhost:4000';
const GEMINI_AI_BASE = 'http://localhost:5100';

async function testSingleAIMove() {
  try {
    console.log('🧪 Testing single AI move...');
    
    // Step 1: Create a game
    console.log('1. Creating game...');
    const gameResponse = await axios.post(`${CATAN_API_BASE}/api/games`, {
      numPlayers: 4
    });
    
    const gameId = gameResponse.data.id;
    console.log(`✅ Game created: ${gameId}`);
    
    // Step 2: Get game state
    console.log('2. Getting game state...');
    const stateResponse = await axios.get(`${CATAN_API_BASE}/api/games/${gameId}`);
    const gameState = stateResponse.data;
    
    console.log(`Current player: ${gameState.current}`);
    console.log(`Players:`, gameState.players.map(p => `Player ${p.id}: ${p.vp || 0} VP`));
    
    // Step 3: Make one AI move
    console.log('3. Making AI move...');
    const aiResponse = await axios.post(`${GEMINI_AI_BASE}/ai/play-turn/${gameId}/0`);
    
    console.log('✅ AI Response:', {
      action: aiResponse.data.decision?.action?.type,
      reasoning: aiResponse.data.decision?.reasoning,
      success: aiResponse.data.catanResult?.ok
    });
    
    // Step 4: Get updated game state
    const updatedState = await axios.get(`${CATAN_API_BASE}/api/games/${gameId}`);
    console.log(`After AI move - Current player: ${updatedState.data.current}`);
    
    return gameId;
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return null;
  }
}

// Run the test
testSingleAIMove().then(gameId => {
  if (gameId) {
    console.log(`\n🎯 Success! Game ${gameId} created and AI made its first move.`);
    console.log(`\nTo continue the game, you can run more AI moves with:`);
    console.log(`curl -X POST http://localhost:5100/ai/play-turn/${gameId}/1`);
    console.log(`curl -X POST http://localhost:5100/ai/play-turn/${gameId}/2`);
    console.log(`curl -X POST http://localhost:5100/ai/play-turn/${gameId}/3`);
  } else {
    console.log('❌ Test failed');
  }
});