import axios from 'axios';

const CATAN_API_BASE = 'http://localhost:4000';
const GEMINI_AI_BASE = 'http://localhost:5100';

class MultiAIGameController {
  constructor() {
    this.gameId = null;
    this.gameState = null;
    this.turnHistory = [];
  }

  async createGame(numPlayers = 4) {
    console.log(`🎮 Creating new ${numPlayers}-player game...`);
    
    const response = await axios.post(`${CATAN_API_BASE}/api/games`, {
      numPlayers: numPlayers
    });
    
    this.gameId = response.data.id;
    this.gameState = response.data;
    
    console.log(`✅ Game created with ID: ${this.gameId}`);
    console.log(`🏠 Initial buildings: ${this.countBuildings()} settlements placed`);
    
    return this.gameId;
  }

  async getGameState() {
    const response = await axios.get(`${CATAN_API_BASE}/api/games/${this.gameId}`);
    this.gameState = response.data;
    return this.gameState;
  }

  countBuildings() {
    if (!this.gameState?.board?.nodes) return 0;
    return this.gameState.board.nodes.filter(node => node.building).length;
  }

  async playAITurn(playerId) {
    console.log(`\n🤖 Player ${playerId}'s turn...`);
    
    try {
      // Get fresh game state
      await this.getGameState();
      
      // Check if it's actually this player's turn
      if (this.gameState.current !== playerId) {
        console.log(`⏭️  Not Player ${playerId}'s turn (current: ${this.gameState.current})`);
        return false;
      }

      // Let AI make decision
      const response = await axios.post(
        `${GEMINI_AI_BASE}/ai/play-turn/${this.gameId}/${playerId}`
      );

      const decision = response.data;
      console.log(`🧠 AI Decision: ${decision.decision?.action?.type || 'unknown'}`);
      console.log(`💭 Reasoning: ${decision.decision?.reasoning || 'No reasoning provided'}`);

      // Update game state
      await this.getGameState();
      
      // Log turn summary
      const player = this.gameState.players[playerId];
      console.log(`📊 Player ${playerId} Status: ${player?.vp || 0} VP, Resources: ${this.formatResources(player?.resources)}`);

      this.turnHistory.push({
        player: playerId,
        turn: this.turnHistory.length + 1,
        action: decision.decision?.action?.type,
        reasoning: decision.decision?.reasoning,
        vp: player?.vp || 0
      });

      return true;
    } catch (error) {
      console.error(`❌ Error on Player ${playerId}'s turn:`, error?.response?.data || error.message);
      return false;
    }
  }

  formatResources(resources = {}) {
    return Object.entries(resources)
      .filter(([_, count]) => count > 0)
      .map(([resource, count]) => `${count} ${resource}`)
      .join(', ') || 'none';
  }

  async playFullGame(maxTurns = 100) {
    console.log(`\n🚀 Starting full AI vs AI game!`);
    console.log(`🎯 Win condition: First to 10 Victory Points`);
    console.log(`⏱️  Max turns: ${maxTurns}`);

    let turnCount = 0;
    let winner = null;

    while (turnCount < maxTurns && !winner) {
      turnCount++;
      console.log(`\n=== TURN ${turnCount} ===`);

      // Get current player
      await this.getGameState();
      const currentPlayer = this.gameState.current;

      // Play AI turn
      const success = await this.playAITurn(currentPlayer);
      
      if (!success) {
        console.log(`⚠️  Turn failed, skipping...`);
        continue;
      }

      // Check for winner
      const maxVP = Math.max(...this.gameState.players.map(p => p.vp || 0));
      if (maxVP >= 10) {
        const winnerPlayer = this.gameState.players.find(p => (p.vp || 0) >= 10);
        winner = winnerPlayer;
        console.log(`\n🎉 WINNER: Player ${winner.id} with ${winner.vp} Victory Points!`);
        break;
      }

      // Show scoreboard every 5 turns
      if (turnCount % 5 === 0) {
        this.showScoreboard();
      }

      // Small delay to make it easier to follow
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!winner) {
      console.log(`\n⏰ Game ended after ${maxTurns} turns without a winner`);
      this.showScoreboard();
    }

    this.showGameSummary();
    return winner;
  }

  showScoreboard() {
    console.log(`\n📊 === SCOREBOARD ===`);
    this.gameState.players
      .sort((a, b) => (b.vp || 0) - (a.vp || 0))
      .forEach((player, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣'][index] || `${index + 1}️⃣`;
        console.log(`${medal} Player ${player.id}: ${player.vp || 0} VP - ${this.formatResources(player.resources)}`);
      });
  }

  showGameSummary() {
    console.log(`\n📈 === GAME SUMMARY ===`);
    console.log(`🎲 Total turns played: ${this.turnHistory.length}`);
    
    // Count action types
    const actionCounts = {};
    this.turnHistory.forEach(turn => {
      actionCounts[turn.action] = (actionCounts[turn.action] || 0) + 1;
    });
    
    console.log(`🎯 Actions taken:`);
    Object.entries(actionCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([action, count]) => {
        console.log(`  ${action}: ${count} times`);
      });

    // Final buildings count
    const finalBuildings = this.countBuildings();
    console.log(`🏗️  Final buildings on board: ${finalBuildings}`);
  }
}

// Main execution
async function runAIGame() {
  const controller = new MultiAIGameController();
  
  try {
    // Create game
    await controller.createGame(4);
    
    // Play full game
    const winner = await controller.playFullGame(50); // Max 50 turns
    
    console.log(`\n✅ Game completed successfully!`);
    
  } catch (error) {
    console.error('❌ Game failed:', error.message);
  }
}

// Run the game
runAIGame();