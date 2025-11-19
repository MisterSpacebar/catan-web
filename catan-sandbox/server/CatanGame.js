// server/CatanGame.js
const { v4: uuid } = require("uuid");
const { generateBoard } = require("../shared/board");

class CatanGame {
  constructor({ numPlayers = 4 } = {}) {
    this.board = generateBoard();
    this.id = uuid();
    this.numPlayers = numPlayers;
    this.players = this._initPlayers(numPlayers);
    this.current = 0;
    this.lastRoll = null;
    this.log = [];
  }

  // ----- internal helpers -----

  _initPlayers(numPlayers) {
    const colors = ["#1976d2", "#e53935", "#8e24aa", "#ef6c00"];
    return Array.from({ length: numPlayers }, (_, i) => ({
        id: i,
        name: `Player ${i + 1}`,
        color: colors[i],
        resources: { wood: 1, brick: 1, wheat: 1, sheep: 1, ore: 1 }, // your starting resources
        vp: 0,
        devCards: [],
        playedDevCards: [],
        knightsPlayed: 0,
        largestArmy: false,
        longestRoad: false,
        boughtDevCardThisTurn: false,
    }));
  }


  _emit(event) {
    const full = {
      id: uuid(),
      gameId: this.id,
      turn: this.current,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.log.push(full);
    return full;
  }

  // ----- public API -----

  getState() {
    return {
      id: this.id,
      numPlayers: this.numPlayers,
      board: this.board,
      players: this.players,
      current: this.current,
      lastRoll: this.lastRoll,
    };
  }

  rollDice() {
    const d1 = 1 + Math.floor(Math.random() * 6);
    const d2 = 1 + Math.floor(Math.random() * 6);
    const total = d1 + d2;
    this.lastRoll = { d1, d2, total };
    return this._emit({ type: "rollDice", d1, d2, total });
  }

  buildRoad(edgeId, playerId = this.current) {
    const edge = this.board.edges[edgeId];
    if (!edge) throw new Error("Invalid edge");
    if (edge.ownerId != null) throw new Error("Edge already taken");

    edge.ownerId = playerId;

    return this._emit({
      type: "buildRoad",
      playerId,
      edgeId,
    });
  }

  buildTown(nodeId, playerId = this.current) {
    const node = this.board.nodes[nodeId];
    if (!node) throw new Error("Invalid node");
    if (node.building) throw new Error("Node already built on");

    node.building = { ownerId: playerId, type: "town" };

    return this._emit({
      type: "buildTown",
      playerId,
      nodeId,
    });
  }

  endTurn() {
    // mirror your React endTurn’s dev-card behavior
    this.players = this.players.map(p => ({
        ...p,
        devCards: p.devCards.map(card => ({ ...card, canPlay: true })),
        boughtDevCardThisTurn: false,
    }));

    this.current = this.players.length
        ? (this.current + 1) % this.players.length
        : 0;

    this._emit({ type: "endTurn", nextPlayer: this.current });

    // optional: return a small summary or just let the API return getState()
  }
}

module.exports = { CatanGame };
