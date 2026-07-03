import type { CardInstance, GameState, PlayerIndex, PlayerState } from './gameState';
import {
  createCardInstance,
  createEmptyPlayer,
  MAX_BATTLEFIELD,
  OPENING_HAND_SIZE,
  STARTING_HEALTH,
} from './gameState';

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function energyForTurnCount(turnCount: number): number {
  if (turnCount < 1) return 0;
  return Math.min(turnCount, 10);
}

export function appendLog(state: GameState, message: string): GameState {
  return { ...state, gameLog: [...state.gameLog, message] };
}

export function updatePlayer(
  state: GameState,
  index: PlayerIndex,
  updater: (player: PlayerState) => PlayerState,
): GameState {
  const players = [...state.players] as [PlayerState, PlayerState];
  players[index] = updater(players[index]);
  return { ...state, players };
}

export function getActivePlayer(state: GameState): PlayerState {
  return state.players[state.activePlayerIndex];
}

export function getInactivePlayer(state: GameState): PlayerState {
  const idx = state.activePlayerIndex === 0 ? 1 : 0;
  return state.players[idx];
}

export function inactiveIndex(state: GameState): PlayerIndex {
  return state.activePlayerIndex === 0 ? 1 : 0;
}

export function assertGameActive(state: GameState): void {
  if (state.winner !== null) {
    throw new Error('Game is already over.');
  }
}

export function isBattlefieldFull(player: PlayerState): boolean {
  return player.battlefield.length >= MAX_BATTLEFIELD;
}

export function drawFromDeck(
  deck: CardInstance[],
  hand: CardInstance[],
  count: number,
): { deck: CardInstance[]; hand: CardInstance[]; drawn: CardInstance[] } {
  const nextDeck = [...deck];
  const nextHand = [...hand];
  const drawn: CardInstance[] = [];

  for (let i = 0; i < count; i++) {
    if (nextDeck.length === 0) break;
    const card = nextDeck.shift()!;
    drawn.push(card);
    nextHand.push(card);
  }

  return { deck: nextDeck, hand: nextHand, drawn };
}

export function openingSetup(
  p1Deck: CardInstance[],
  p2Deck: CardInstance[],
): Pick<GameState, 'players' | 'playerTurnCounts' | 'gameLog'> {
  const p0 = createEmptyPlayer();
  const p1 = createEmptyPlayer();

  p0.deck = shuffle(p1Deck);
  p1.deck = shuffle(p2Deck);

  const d0 = drawFromDeck(p0.deck, p0.hand, OPENING_HAND_SIZE);
  p0.deck = d0.deck;
  p0.hand = d0.hand;

  const d1 = drawFromDeck(p1.deck, p1.hand, OPENING_HAND_SIZE);
  p1.deck = d1.deck;
  p1.hand = d1.hand;

  p0.health = STARTING_HEALTH;
  p1.health = STARTING_HEALTH;
  p0.maxEnergy = 1;
  p0.energy = 1;

  return {
    players: [p0, p1],
    playerTurnCounts: [1, 0],
    gameLog: [
      'Game started.',
      `Player 1 drew ${d0.drawn.length} cards.`,
      `Player 2 drew ${d1.drawn.length} cards.`,
      'Player 1 goes first.',
    ],
  };
}

export function expandDeckEntries(
  entries: { cardId: string; count: number }[],
  cardsById: Map<string, import('../models/card').Card>,
): CardInstance[] {
  const instances: CardInstance[] = [];
  for (const entry of entries) {
    const template = cardsById.get(entry.cardId);
    if (!template) continue;
    for (let i = 0; i < entry.count; i++) {
      instances.push(createCardInstance(template));
    }
  }
  return instances;
}
