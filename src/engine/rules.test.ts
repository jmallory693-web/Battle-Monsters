import { describe, it, expect } from 'vitest';
import type { Card } from '../models/card';
import type { BoardMonster, CardInstance, GameState, PlayerState } from './gameState';
import {
  createBoardMonster,
  createCardInstance,
  createEmptyPlayer,
  MAX_BATTLEFIELD,
  OPENING_HAND_SIZE,
  STARTING_HEALTH,
} from './gameState';
import {
  createNewGame,
  startTurn,
  endTurn,
  playMonster,
  attackMonster,
  attackPlayer,
  drawCard,
  destroyMonster,
  checkWinner,
} from './rules';

// --- Test fixtures ---

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: overrides.id ?? 'card-1',
    name: overrides.name ?? 'Slime',
    imageUrl: '',
    cost: overrides.cost ?? 1,
    attack: overrides.attack ?? 2,
    health: overrides.health ?? 3,
    flavorText: '',
    rarity: 'common',
    creatureTypes: overrides.creatureTypes ?? [],
    ...overrides,
  };
}

function makeInstance(card: Card, instanceId: string): CardInstance {
  return createCardInstance(card, instanceId);
}

function makeDeck(count: number, card?: Card): CardInstance[] {
  return Array.from({ length: count }, (_, i) =>
    makeInstance(card ?? makeCard({ id: `c-${i}`, name: `Card ${i}` }), `inst-${i}`),
  );
}

function makeMonster(
  instance: CardInstance,
  opts: Partial<Pick<BoardMonster, 'canAttack' | 'hasAttacked' | 'currentHealth'>> = {},
): BoardMonster {
  const m = createBoardMonster(instance);
  return { ...m, ...opts };
}

function makeGame(
  p0: Partial<PlayerState> = {},
  p1: Partial<PlayerState> = {},
  overrides: Partial<GameState> = {},
): GameState {
  const base0 = createEmptyPlayer();
  const base1 = createEmptyPlayer();
  return {
    players: [{ ...base0, ...p0 }, { ...base1, ...p1 }],
    activePlayerIndex: 0,
    turnNumber: 1,
    playerTurnCounts: [1, 0],
    winner: null,
    deckOutPlayer: null,
    gameLog: [],
    ...overrides,
  };
}

// --- createNewGame ---

describe('createNewGame', () => {
  it('sets both players to 20 health', () => {
    const game = createNewGame(makeDeck(30), makeDeck(30));
    expect(game.players[0].health).toBe(STARTING_HEALTH);
    expect(game.players[1].health).toBe(STARTING_HEALTH);
  });

  it('draws 5 cards at game start for each player', () => {
    const game = createNewGame(makeDeck(30), makeDeck(30));
    expect(game.players[0].hand).toHaveLength(OPENING_HAND_SIZE);
    expect(game.players[1].hand).toHaveLength(OPENING_HAND_SIZE);
    expect(game.players[0].deck).toHaveLength(30 - OPENING_HAND_SIZE);
    expect(game.players[1].deck).toHaveLength(30 - OPENING_HAND_SIZE);
  });

  it('starts with player 1 active at 1 energy', () => {
    const game = createNewGame(makeDeck(30), makeDeck(30));
    expect(game.activePlayerIndex).toBe(0);
    expect(game.players[0].energy).toBe(1);
    expect(game.players[0].maxEnergy).toBe(1);
    expect(game.winner).toBeNull();
  });
});

// --- startTurn / endTurn ---

describe('startTurn', () => {
  it('draws 1 card at the start of a turn', () => {
    let game = createNewGame(makeDeck(30), makeDeck(30));
    const handBefore = game.players[1].hand.length;
    game = endTurn(game); // P2's turn starts via startTurn
    expect(game.players[1].hand.length).toBe(handBefore + 1);
  });

  it('gains 1 max energy each turn and refills current energy', () => {
    let game = createNewGame(makeDeck(30), makeDeck(30));
    // P1 turn 2: endTurn -> P2 turn 1, endTurn -> P1 turn 2
    game = endTurn(game);
    game = endTurn(game);
    expect(game.activePlayerIndex).toBe(0);
    expect(game.players[0].maxEnergy).toBe(2);
    expect(game.players[0].energy).toBe(2);
  });

  it('caps energy at 10', () => {
    let game = makeGame({}, {}, { playerTurnCounts: [9, 0], activePlayerIndex: 0 });
    game = startTurn(game);
    expect(game.players[0].maxEnergy).toBe(10);
    expect(game.players[0].energy).toBe(10);
  });

  it('refreshes canAttack and hasAttacked on battlefield monsters', () => {
    const inst = makeInstance(makeCard(), 'atk-1');
    const monster = makeMonster(inst, { canAttack: false, hasAttacked: true });
    let game = makeGame({ battlefield: [monster] }, {}, { playerTurnCounts: [1, 0] });
    game = startTurn(game);
    expect(game.players[0].battlefield[0].canAttack).toBe(true);
    expect(game.players[0].battlefield[0].hasAttacked).toBe(false);
  });
});

describe('endTurn', () => {
  it('switches the active player and increments turn number', () => {
    let game = createNewGame(makeDeck(30), makeDeck(30));
    game = endTurn(game);
    expect(game.activePlayerIndex).toBe(1);
    expect(game.turnNumber).toBe(2);
  });
});

// --- playMonster ---

describe('playMonster', () => {
  it('spends energy and places monster on battlefield', () => {
    const card = makeCard({ cost: 2, name: 'Goblin' });
    const inst = makeInstance(card, 'hand-1');
    let game = makeGame({ hand: [inst], energy: 3, maxEnergy: 3 });
    game = playMonster(game, 'hand-1');
    expect(game.players[0].energy).toBe(1);
    expect(game.players[0].battlefield).toHaveLength(1);
    expect(game.players[0].hand).toHaveLength(0);
  });

  it('new monsters cannot attack on the turn they are played', () => {
    const inst = makeInstance(makeCard({ cost: 1 }), 'hand-1');
    let game = makeGame({ hand: [inst], energy: 1, maxEnergy: 1 });
    game = playMonster(game, 'hand-1');
    expect(game.players[0].battlefield[0].canAttack).toBe(false);
  });

  it('throws when battlefield is full', () => {
    const monsters = Array.from({ length: MAX_BATTLEFIELD }, (_, i) =>
      makeMonster(makeInstance(makeCard(), `bf-${i}`)),
    );
    const inst = makeInstance(makeCard({ cost: 0 }), 'hand-1');
    const game = makeGame({ battlefield: monsters, hand: [inst], energy: 5 });
    expect(() => playMonster(game, 'hand-1')).toThrow(/full/i);
  });

  it('throws when not enough energy', () => {
    const inst = makeInstance(makeCard({ cost: 5 }), 'hand-1');
    const game = makeGame({ hand: [inst], energy: 1 });
    expect(() => playMonster(game, 'hand-1')).toThrow(/energy/i);
  });
});

// --- attackMonster / combat ---

describe('attackMonster', () => {
  it('applies simultaneous damage', () => {
    const atkCard = makeCard({ attack: 4, health: 5, name: 'Attacker' });
    const defCard = makeCard({ attack: 2, health: 6, name: 'Defender' });
    const atk = makeMonster(makeInstance(atkCard, 'atk'), { canAttack: true });
    const def = makeMonster(makeInstance(defCard, 'def'));
    let game = makeGame({ battlefield: [atk] }, { battlefield: [def] });

    game = attackMonster(game, 'atk', 'def');

    // Attacker took 2 damage (6 HP left), defender took 4 (2 HP left) — both survive
    const survivingAtk = game.players[0].battlefield.find((m) => m.instanceId === 'atk');
    const survivingDef = game.players[1].battlefield.find((m) => m.instanceId === 'def');
    expect(survivingAtk?.currentHealth).toBe(3);
    expect(survivingDef?.currentHealth).toBe(2);
  });

  it('destroys both monsters when mutual damage is lethal', () => {
    const atk = makeMonster(makeInstance(makeCard({ attack: 3, health: 3 }), 'atk'), {
      canAttack: true,
    });
    const def = makeMonster(makeInstance(makeCard({ attack: 3, health: 3 }), 'def'));
    let game = makeGame({ battlefield: [atk] }, { battlefield: [def] });

    game = attackMonster(game, 'atk', 'def');

    expect(game.players[0].battlefield).toHaveLength(0);
    expect(game.players[1].battlefield).toHaveLength(0);
    expect(game.players[0].discardPile).toHaveLength(1);
    expect(game.players[1].discardPile).toHaveLength(1);
  });

  it('marks attacker as hasAttacked', () => {
    const atk = makeMonster(makeInstance(makeCard({ attack: 1, health: 10 }), 'atk'), {
      canAttack: true,
    });
    const def = makeMonster(makeInstance(makeCard({ attack: 0, health: 10 }), 'def'));
    let game = makeGame({ battlefield: [atk] }, { battlefield: [def] });
    game = attackMonster(game, 'atk', 'def');
    expect(game.players[0].battlefield[0].hasAttacked).toBe(true);
  });

  it('prevents attack when canAttack is false (summoning sickness)', () => {
    const atk = makeMonster(makeInstance(makeCard(), 'atk'), { canAttack: false });
    const def = makeMonster(makeInstance(makeCard(), 'def'));
    const game = makeGame({ battlefield: [atk] }, { battlefield: [def] });
    expect(() => attackMonster(game, 'atk', 'def')).toThrow(/cannot attack/i);
  });

  it('prevents a second attack in the same turn', () => {
    const atk = makeMonster(makeInstance(makeCard({ attack: 5, health: 10 }), 'atk'), {
      canAttack: true,
    });
    const def = makeMonster(makeInstance(makeCard({ attack: 0, health: 10 }), 'def'));
    let game = makeGame({ battlefield: [atk] }, { battlefield: [def] });
    game = attackPlayer(game, 'atk');
    expect(() => attackMonster(game, 'atk', 'def')).toThrow(/already attacked/i);
  });
});

// --- attackPlayer ---

describe('attackPlayer', () => {
  it('reduces opponent health by attacker attack', () => {
    const atk = makeMonster(makeInstance(makeCard({ attack: 4, health: 5 }), 'atk'), {
      canAttack: true,
    });
    let game = makeGame({ battlefield: [atk] }, { health: 20 });
    game = attackPlayer(game, 'atk');
    expect(game.players[1].health).toBe(16);
  });

  it('declares winner when opponent reaches 0 health', () => {
    const atk = makeMonster(makeInstance(makeCard({ attack: 20, health: 5 }), 'atk'), {
      canAttack: true,
    });
    let game = makeGame({ battlefield: [atk] }, { health: 15 });
    game = attackPlayer(game, 'atk');
    expect(game.players[1].health).toBeLessThanOrEqual(0);
    expect(game.winner).toBe(0);
  });
});

// --- drawCard / deck-out ---

describe('drawCard', () => {
  it('moves top card from deck to hand', () => {
    const deck = makeDeck(3);
    const game = makeGame({ deck: [...deck], hand: [] });
    const next = drawCard(game, 0);
    expect(next.players[0].hand).toHaveLength(1);
    expect(next.players[0].deck).toHaveLength(2);
  });

  it('player loses when they must draw from an empty deck', () => {
    const game = makeGame({ deck: [], hand: [] });
    const next = drawCard(game, 0);
    expect(next.deckOutPlayer).toBe(0);
    expect(next.winner).toBe(1);
  });
});

// --- destroyMonster ---

describe('destroyMonster', () => {
  it('removes monster from battlefield and adds to discard pile', () => {
    const inst = makeInstance(makeCard({ name: 'Doomed' }), 'mon-1');
    const monster = makeMonster(inst);
    const game = makeGame({ battlefield: [monster] });
    const next = destroyMonster(game, 0, 'mon-1');
    expect(next.players[0].battlefield).toHaveLength(0);
    expect(next.players[0].discardPile).toHaveLength(1);
    expect(next.players[0].discardPile[0].card.name).toBe('Doomed');
  });
});

// --- checkWinner ---

describe('checkWinner', () => {
  it('detects player 1 win at 0 health', () => {
    const game = makeGame({ health: 0 }, { health: 20 });
    const next = checkWinner(game);
    expect(next.winner).toBe(1);
  });

  it('detects player 2 win at 0 health', () => {
    const game = makeGame({ health: 20 }, { health: 0 });
    const next = checkWinner(game);
    expect(next.winner).toBe(0);
  });

  it('does not change state when no one has lost', () => {
    const game = makeGame({ health: 10 }, { health: 10 });
    const next = checkWinner(game);
    expect(next.winner).toBeNull();
  });
});

// --- immutability ---

describe('immutability', () => {
  it('playMonster returns a new state without mutating the original', () => {
    const inst = makeInstance(makeCard({ cost: 1 }), 'hand-1');
    const original = makeGame({ hand: [inst], energy: 1, maxEnergy: 1 });
    const handBefore = original.players[0].hand.length;
    const next = playMonster(original, 'hand-1');
    expect(original.players[0].hand).toHaveLength(handBefore);
    expect(next.players[0].hand).toHaveLength(0);
    expect(next).not.toBe(original);
  });
});
