import type { Deck } from '../models/deck';
import type { Card } from '../models/card';
import type { CardInstance, GameState, PlayerIndex } from './gameState';
import { createBoardMonster, MAX_BATTLEFIELD } from './gameState';
import {
  appendLog,
  assertGameActive,
  energyForTurnCount,
  expandDeckEntries,
  getActivePlayer,
  inactiveIndex,
  isBattlefieldFull,
  openingSetup,
  updatePlayer,
} from './helpers';

export function createNewGame(
  player1Deck: CardInstance[],
  player2Deck: CardInstance[],
): GameState {
  const setup = openingSetup(player1Deck, player2Deck);
  return checkWinner({
    players: setup.players,
    activePlayerIndex: 0,
    turnNumber: 1,
    playerTurnCounts: setup.playerTurnCounts,
    winner: null,
    deckOutPlayer: null,
    gameLog: setup.gameLog,
  });
}

export function createNewGameFromDecks(
  deck1: Deck,
  deck2: Deck,
  cards: Card[],
): GameState {
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const p1 = expandDeckEntries(deck1.entries, cardsById);
  const p2 = expandDeckEntries(deck2.entries, cardsById);
  return createNewGame(p1, p2);
}

export function drawCard(state: GameState, playerIndex: PlayerIndex): GameState {
  assertGameActive(state);
  const player = state.players[playerIndex];
  const label = playerIndex === 0 ? 'Player 1' : 'Player 2';

  if (player.deck.length === 0) {
    let next = appendLog(state, `${label} could not draw — deck is empty!`);
    next = { ...next, deckOutPlayer: playerIndex };
    return checkWinner(next);
  }

  const card = player.deck[0];
  let next = updatePlayer(state, playerIndex, (p) => ({
    ...p,
    deck: p.deck.slice(1),
    hand: [...p.hand, card],
  }));
  next = appendLog(next, `${label} drew a card.`);
  return next;
}

export function destroyMonster(
  state: GameState,
  playerIndex: PlayerIndex,
  instanceId: string,
): GameState {
  return updatePlayer(state, playerIndex, (player) => {
    const monster = player.battlefield.find((m) => m.instanceId === instanceId);
    if (!monster) return player;
    return {
      ...player,
      battlefield: player.battlefield.filter((m) => m.instanceId !== instanceId),
      discardPile: [
        ...player.discardPile,
        { instanceId: monster.instanceId, card: monster.card },
      ],
    };
  });
}

export function checkWinner(state: GameState): GameState {
  if (state.winner !== null) return state;

  const [p0, p1] = state.players;

  if (state.deckOutPlayer !== null) {
    const loser = state.deckOutPlayer;
    const winner = loser === 0 ? 1 : 0;
    const loserLabel = loser === 0 ? 'Player 1' : 'Player 2';
    const winnerLabel = winner === 0 ? 'Player 1' : 'Player 2';
    return {
      ...state,
      winner,
      gameLog: [
        ...state.gameLog,
        `${loserLabel} ran out of cards to draw.`,
        `${winnerLabel} wins!`,
      ],
    };
  }

  if (p0.health <= 0 && p1.health <= 0) {
    return {
      ...state,
      winner: null,
      gameLog: [...state.gameLog, 'Both players at 0 health — draw!'],
    };
  }

  if (p0.health <= 0) {
    return {
      ...state,
      winner: 1,
      gameLog: [...state.gameLog, 'Player 2 wins!'],
    };
  }

  if (p1.health <= 0) {
    return {
      ...state,
      winner: 0,
      gameLog: [...state.gameLog, 'Player 1 wins!'],
    };
  }

  return state;
}

export function startTurn(state: GameState): GameState {
  assertGameActive(state);
  const idx = state.activePlayerIndex;
  const label = idx === 0 ? 'Player 1' : 'Player 2';

  const newTurnCounts = [...state.playerTurnCounts] as [number, number];
  newTurnCounts[idx] += 1;
  const turnCount = newTurnCounts[idx];
  const maxEnergy = energyForTurnCount(turnCount);

  let next: GameState = { ...state, playerTurnCounts: newTurnCounts };

  next = updatePlayer(next, idx, (p) => ({
    ...p,
    maxEnergy,
    energy: maxEnergy,
    battlefield: p.battlefield.map((m) => ({
      ...m,
      canAttack: true,
      hasAttacked: false,
    })),
  }));

  next = drawCard(next, idx);
  if (next.winner !== null) return next;

  next = appendLog(next, `${label} started turn ${turnCount} (${maxEnergy} energy).`);
  return next;
}

export function endTurn(state: GameState): GameState {
  assertGameActive(state);
  const idx = state.activePlayerIndex;
  const label = idx === 0 ? 'Player 1' : 'Player 2';

  let next: GameState = {
    ...state,
    activePlayerIndex: idx === 0 ? 1 : 0,
    turnNumber: state.turnNumber + 1,
  };

  next = appendLog(next, `${label} ended their turn.`);
  next = startTurn(next);
  return next;
}

export function playMonster(state: GameState, cardInstanceId: string): GameState {
  assertGameActive(state);
  const idx = state.activePlayerIndex;
  const player = getActivePlayer(state);
  const label = idx === 0 ? 'Player 1' : 'Player 2';

  if (isBattlefieldFull(player)) {
    throw new Error(`Battlefield is full (max ${MAX_BATTLEFIELD}).`);
  }

  const instance = player.hand.find((c) => c.instanceId === cardInstanceId);
  if (!instance) throw new Error('Card is not in hand.');
  if (player.energy < instance.card.cost) throw new Error('Not enough energy.');

  const monster = createBoardMonster(instance);

  let next = updatePlayer(state, idx, (p) => ({
    ...p,
    energy: p.energy - instance.card.cost,
    hand: p.hand.filter((c) => c.instanceId !== cardInstanceId),
    battlefield: [...p.battlefield, monster],
  }));

  next = appendLog(
    next,
    `${label} played ${instance.card.name}.`,
  );
  return next;
}

export function attackMonster(
  state: GameState,
  attackerInstanceId: string,
  defenderInstanceId: string,
): GameState {
  assertGameActive(state);
  const atkIdx = state.activePlayerIndex;
  const defIdx = inactiveIndex(state);

  const attacker = state.players[atkIdx].battlefield.find(
    (m) => m.instanceId === attackerInstanceId,
  );
  const defender = state.players[defIdx].battlefield.find(
    (m) => m.instanceId === defenderInstanceId,
  );

  if (!attacker) throw new Error('Attacker not on your battlefield.');
  if (!defender) throw new Error('Defender not found.');
  if (!attacker.canAttack) throw new Error('Monster cannot attack this turn.');
  if (attacker.hasAttacked) throw new Error('Monster already attacked.');

  const damageToDefender = attacker.card.attack;
  const damageToAttacker = defender.card.attack;

  let next = updatePlayer(state, atkIdx, (p) => ({
    ...p,
    battlefield: p.battlefield.map((m) =>
      m.instanceId === attackerInstanceId
        ? {
            ...m,
            currentHealth: m.currentHealth - damageToAttacker,
            hasAttacked: true,
          }
        : m,
    ),
  }));

  next = updatePlayer(next, defIdx, (p) => ({
    ...p,
    battlefield: p.battlefield.map((m) =>
      m.instanceId === defenderInstanceId
        ? { ...m, currentHealth: m.currentHealth - damageToDefender }
        : m,
    ),
  }));

  next = appendLog(next, `${attacker.card.name} attacked ${defender.card.name}.`);

  const deadAtk = next.players[atkIdx].battlefield.filter((m) => m.currentHealth <= 0);
  const deadDef = next.players[defIdx].battlefield.filter((m) => m.currentHealth <= 0);

  for (const m of deadAtk) {
    next = destroyMonster(next, atkIdx, m.instanceId);
    next = appendLog(next, `${m.card.name} was destroyed.`);
  }
  for (const m of deadDef) {
    next = destroyMonster(next, defIdx, m.instanceId);
    next = appendLog(next, `${m.card.name} was destroyed.`);
  }

  return checkWinner(next);
}

export function attackPlayer(
  state: GameState,
  attackerInstanceId: string,
): GameState {
  assertGameActive(state);
  const atkIdx = state.activePlayerIndex;
  const defIdx = inactiveIndex(state);
  const defLabel = defIdx === 0 ? 'Player 1' : 'Player 2';

  const attacker = state.players[atkIdx].battlefield.find(
    (m) => m.instanceId === attackerInstanceId,
  );

  if (!attacker) throw new Error('Attacker not on your battlefield.');
  if (!attacker.canAttack) throw new Error('Monster cannot attack this turn.');
  if (attacker.hasAttacked) throw new Error('Monster already attacked.');

  const damage = attacker.card.attack;

  let next = updatePlayer(state, atkIdx, (p) => ({
    ...p,
    battlefield: p.battlefield.map((m) =>
      m.instanceId === attackerInstanceId ? { ...m, hasAttacked: true } : m,
    ),
  }));

  next = updatePlayer(next, defIdx, (p) => ({
    ...p,
    health: p.health - damage,
  }));

  next = appendLog(next, `${defLabel} took ${damage} damage.`);

  return checkWinner(next);
}
