import { type Deck, normalizeEntries, validateDeckLegality } from '../models/deck';
import type { Card } from '../models/card';
import { loadCards } from './cardStorage';

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

function readRaw(): Deck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isDeck)
      .map((deck) => ({
        ...deck,
        name: deck.name.trim(),
        entries: normalizeEntries(deck.entries),
      }));
  } catch {
    return [];
  }
}

function writeAll(decks: Deck[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
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
  const next = decks.filter((d) => d.id !== id);
  if (next.length === decks.length) throw new Error(`Deck with id "${id}" not found.`);
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
