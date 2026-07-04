import { type Deck, normalizeEntries, validateDeckLegality } from '../models/deck';
import type { Card } from '../models/card';
import { loadCards } from './cardStorage';
import { loadAiOpponents } from './aiOpponentStorage';
import { readStoredJson, writeStoredJson } from './localStorageSafety';

const STORAGE_KEY = 'battle-monsters:decks';

function isDeckEntry(value: unknown): value is Deck['entries'][number] {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  return typeof e.cardId === 'string' && typeof e.count === 'number';
}

function isDeck(value: unknown): value is Deck {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === 'string' &&
    typeof d.name === 'string' &&
    Array.isArray(d.entries) &&
    d.entries.every(isDeckEntry)
  );
}

export function parseStoredDecks(value: unknown): Deck[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected a deck array.');
  }
  return value.map((item, index) => {
    if (!isDeck(item)) {
      throw new Error(`Deck ${index + 1} is invalid.`);
    }
    return {
      ...item,
      name: item.name.trim(),
      entries: normalizeEntries(item.entries),
    };
  });
}

function readRaw(): Deck[] {
  return readStoredJson({
    storageKey: STORAGE_KEY,
    entityName: 'decks',
    createEmpty: () => [],
    parse: parseStoredDecks,
  });
}

function writeAll(decks: Deck[]): void {
  writeStoredJson(STORAGE_KEY, decks, 'decks');
}

export function saveDeck(deck: Deck, cards: Card[] = loadCards()): void {
  const normalized: Deck = {
    ...deck,
    name: deck.name.trim(),
    entries: normalizeEntries(deck.entries),
  };
  const validation = validateDeckLegality(normalized, cards);
  if (!validation.valid) {
    throw new Error(validation.errors.map((e) => e.message).join(' '));
  }
  const decks = readRaw();
  if (decks.some((d) => d.id === normalized.id)) {
    throw new Error(`Deck with id "${normalized.id}" already exists.`);
  }
  decks.push(normalized);
  writeAll(decks);
}

export function loadDecks(): Deck[] {
  return readRaw();
}

export function deleteDeck(id: string): void {
  const decks = readRaw();
  const deck = decks.find((candidate) => candidate.id === id);
  if (!deck) throw new Error(`Deck with id "${id}" not found.`);

  const dependentOpponents = loadAiOpponents()
    .filter((opponent) => opponent.deckSource === 'savedDeck' && opponent.savedDeckId === id)
    .map((opponent) => opponent.name);
  if (dependentOpponents.length > 0) {
    throw new Error(
      `Cannot delete deck "${deck.name}" because it is used by ${dependentOpponents.length} AI opponent(s): ${dependentOpponents.join(', ')}.`,
    );
  }

  const next = decks.filter((d) => d.id !== id);
  writeAll(next);
}

export function getDeckById(id: string): Deck | undefined {
  return readRaw().find((d) => d.id === id);
}

export function getDecksUsingCard(cardId: string): Deck[] {
  return readRaw().filter((deck) => deck.entries.some((e) => e.cardId === cardId));
}

export function updateDeck(deck: Deck, cards: Card[] = loadCards()): void {
  const normalized: Deck = {
    ...deck,
    name: deck.name.trim(),
    entries: normalizeEntries(deck.entries),
  };
  const validation = validateDeckLegality(normalized, cards);
  if (!validation.valid) {
    throw new Error(validation.errors.map((e) => e.message).join(' '));
  }
  const decks = readRaw();
  const index = decks.findIndex((d) => d.id === normalized.id);
  if (index === -1) throw new Error(`Deck with id "${normalized.id}" not found.`);
  decks[index] = normalized;
  writeAll(decks);
}
