import type { Card } from '../models/card';
import { isCard } from '../models/card';
import type { Card as CardType } from '../models/card';

export const STARTING_HEALTH = 20;
export const OPENING_HAND_SIZE = 5;
export const MAX_BATTLEFIELD = 5;
export const MAX_ENERGY = 10;

export type PlayerIndex = 0 | 1;
export type Winner = PlayerIndex | null;
export type GameMode = 'local' | 'ai';

export interface CardInstance {
  instanceId: string;
  card: Card;
}

export interface BoardMonster {
  instanceId: string;
  card: Card;
  currentHealth: number;
  canAttack: boolean;
  hasAttacked: boolean;
}

export interface PlayerState {
  health: number;
  energy: number;
  maxEnergy: number;
  deck: CardInstance[];
  hand: CardInstance[];
  battlefield: BoardMonster[];
  discardPile: CardInstance[];
}

export interface GameState {
  players: [PlayerState, PlayerState];
  activePlayerIndex: PlayerIndex;
  turnNumber: number;
  playerTurnCounts: [number, number];
  winner: Winner;
  deckOutPlayer: PlayerIndex | null;
  gameLog: string[];
}

export interface SavedGameMeta {
  id: string;
  name: string;
  savedAt: string;
  turnNumber: number;
  player1Health: number;
  player2Health: number;
  activePlayerIndex: PlayerIndex;
  gameMode: GameMode;
}

export interface SavedGame extends SavedGameMeta {
  gameState: GameState;
}

export function createCardInstance(card: Card, instanceId?: string): CardInstance {
  return {
    instanceId: instanceId ?? crypto.randomUUID(),
    card,
  };
}

export function createEmptyPlayer(): PlayerState {
  return {
    health: STARTING_HEALTH,
    energy: 0,
    maxEnergy: 0,
    deck: [],
    hand: [],
    battlefield: [],
    discardPile: [],
  };
}

export function createBoardMonster(instance: CardInstance): BoardMonster {
  return {
    instanceId: instance.instanceId,
    card: instance.card,
    currentHealth: instance.card.health,
    canAttack: false,
    hasAttacked: false,
  };
}

export function isCardInstance(value: unknown): value is CardInstance {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.instanceId === 'string' && isCard(v.card);
}

export function isBoardMonster(value: unknown): value is BoardMonster {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.instanceId === 'string' &&
    isCard(v.card) &&
    typeof v.currentHealth === 'number' &&
    typeof v.canAttack === 'boolean' &&
    typeof v.hasAttacked === 'boolean'
  );
}

export function isPlayerState(value: unknown): value is PlayerState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.health === 'number' &&
    typeof v.energy === 'number' &&
    typeof v.maxEnergy === 'number' &&
    Array.isArray(v.deck) &&
    v.deck.every(isCardInstance) &&
    Array.isArray(v.hand) &&
    v.hand.every(isCardInstance) &&
    Array.isArray(v.battlefield) &&
    v.battlefield.every(isBoardMonster) &&
    Array.isArray(v.discardPile) &&
    v.discardPile.every(isCardInstance)
  );
}

export function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (!Array.isArray(v.players) || v.players.length !== 2) return false;
  if (!v.players.every(isPlayerState)) return false;
  return (
    (v.activePlayerIndex === 0 || v.activePlayerIndex === 1) &&
    typeof v.turnNumber === 'number' &&
    Array.isArray(v.playerTurnCounts) &&
    v.playerTurnCounts.length === 2 &&
    typeof v.playerTurnCounts[0] === 'number' &&
    typeof v.playerTurnCounts[1] === 'number' &&
    (v.winner === null || v.winner === 0 || v.winner === 1) &&
    (v.deckOutPlayer === null || v.deckOutPlayer === 0 || v.deckOutPlayer === 1) &&
    Array.isArray(v.gameLog) &&
    v.gameLog.every((l) => typeof l === 'string')
  );
}

export function cardsToInstances(cards: CardType[]): CardInstance[] {
  return cards.map((card) => createCardInstance(card));
}
