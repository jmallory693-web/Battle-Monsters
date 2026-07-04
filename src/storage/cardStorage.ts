import { cardFromUnknown, type Card } from '../models/card';
import { readStoredJson, writeStoredJson } from './localStorageSafety';

const STORAGE_KEY = 'battle-monsters:cards';
const DECKS_STORAGE_KEY = 'battle-monsters:decks';

interface StoredDeckReference {
  id: string;
  name: string;
  entries: Array<{
    cardId: string;
    count: number;
  }>;
}

function isStoredDeckEntry(value: unknown): value is StoredDeckReference['entries'][number] {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.cardId === 'string' && typeof entry.count === 'number';
}

function isStoredDeckReference(value: unknown): value is StoredDeckReference {
  if (!value || typeof value !== 'object') return false;
  const deck = value as Record<string, unknown>;
  return (
    typeof deck.id === 'string' &&
    typeof deck.name === 'string' &&
    Array.isArray(deck.entries) &&
    deck.entries.every(isStoredDeckEntry)
  );
}

function loadDeckReferences(): StoredDeckReference[] {
  return readStoredJson({
    storageKey: DECKS_STORAGE_KEY,
    entityName: 'saved decks',
    createEmpty: () => [],
    parse: (value) => {
      if (!Array.isArray(value)) {
        throw new Error('Expected a deck array.');
      }
      return value.map((item, index) => {
        if (!isStoredDeckReference(item)) {
          throw new Error(`Deck ${index + 1} is invalid.`);
        }
        return {
          id: item.id,
          name: item.name.trim(),
          entries: item.entries,
        };
      });
    },
  });
}

function getDeckNamesUsingCard(cardId: string): string[] {
  return loadDeckReferences()
    .filter((deck) => deck.entries.some((entry) => entry.cardId === cardId))
    .map((deck) => deck.name || deck.id);
}

export function parseStoredCards(value: unknown): Card[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected a card array.');
  }
  return value.map((item, index) => {
    const card = cardFromUnknown(item);
    if (!card) {
      throw new Error(`Card ${index + 1} is invalid.`);
    }
    return card;
  });
}

function readRaw(): Card[] {
  return readStoredJson({
    storageKey: STORAGE_KEY,
    entityName: 'cards',
    createEmpty: () => [],
    parse: parseStoredCards,
  });
}

function writeAll(cards: Card[]): void {
  writeStoredJson(STORAGE_KEY, cards, 'cards');
}

export function saveCard(card: Card): void {
  const cards = readRaw();
  if (cards.some((c) => c.id === card.id)) {
    throw new Error(`Card with id "${card.id}" already exists. Use updateCard instead.`);
  }
  cards.push(card);
  writeAll(cards);
}

export function loadCards(): Card[] {
  return readRaw();
}

export function updateCard(card: Card): void {
  const cards = readRaw();
  const index = cards.findIndex((c) => c.id === card.id);
  if (index === -1) throw new Error(`Card with id "${card.id}" not found.`);
  cards[index] = card;
  writeAll(cards);
}

export function deleteCard(id: string): void {
  const cards = readRaw();
  const dependentDecks = getDeckNamesUsingCard(id);
  if (dependentDecks.length > 0) {
    throw new Error(
      `Cannot delete this card because it is used in ${dependentDecks.length} deck(s): ${dependentDecks.join(', ')}.`,
    );
  }
  const next = cards.filter((c) => c.id !== id);
  if (next.length === cards.length) throw new Error(`Card with id "${id}" not found.`);
  writeAll(next);
}

export function getCardById(id: string): Card | undefined {
  return readRaw().find((c) => c.id === id);
}
