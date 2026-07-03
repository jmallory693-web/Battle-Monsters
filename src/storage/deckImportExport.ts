import type { Card } from '../models/card';
import { isCard, validateCardInput, normalizeCardInput } from '../models/card';
import type { Deck, DeckEntry } from '../models/deck';
import {
  normalizeEntries,
  validateDeckLegality,
  createDeck,
} from '../models/deck';
import { loadCards, saveCard, updateCard, getCardById } from './cardStorage';
import { loadDecks, saveDeck, getDeckById } from './deckStorage';

export const EXPORT_VERSION = 1;

export type DeckExportType = 'battle-monsters-deck';
export type DeckCollectionExportType = 'battle-monsters-deck-collection';

export interface DeckExportFile {
  exportVersion: number;
  exportedAt: string;
  type: DeckExportType;
  deck: Deck;
  cards: Card[];
}

export interface DeckCollectionExportFile {
  exportVersion: number;
  exportedAt: string;
  type: DeckCollectionExportType;
  decks: Deck[];
  cards: Card[];
}

export type OverwriteDecision = 'skip' | 'overwrite';

export interface ImportOptions {
  onCardConflict?: (existing: Card, incoming: Card) => OverwriteDecision;
}

export interface ImportResult {
  cardsImported: number;
  cardsSkipped: number;
  cardsUpdated: number;
  decksImported: number;
}

function cardsEqual(a: Card, b: Card): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.imageUrl === b.imageUrl &&
    a.cost === b.cost &&
    a.attack === b.attack &&
    a.health === b.health &&
    a.flavorText === b.flavorText &&
    a.rarity === b.rarity
  );
}

export function sanitizeFilename(name: string): string {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return sanitized || 'deck';
}

export function collectCardsForDeck(deck: Deck, allCards: Card[]): Card[] {
  const byId = new Map(allCards.map((c) => [c.id, c]));
  const used = new Set(deck.entries.map((e) => e.cardId));
  return Array.from(used)
    .map((id) => byId.get(id))
    .filter((c): c is Card => c !== undefined);
}

export function collectCardsForDecks(decks: Deck[], allCards: Card[]): Card[] {
  const byId = new Map(allCards.map((c) => [c.id, c]));
  const used = new Set<string>();
  for (const deck of decks) {
    for (const entry of deck.entries) {
      used.add(entry.cardId);
    }
  }
  return Array.from(used)
    .map((id) => byId.get(id))
    .filter((c): c is Card => c !== undefined);
}

function buildExportTimestamp(): string {
  return new Date().toISOString();
}

export function buildDeckExportFile(deck: Deck, cards: Card[]): DeckExportFile {
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: buildExportTimestamp(),
    type: 'battle-monsters-deck',
    deck: {
      id: deck.id,
      name: deck.name.trim(),
      entries: normalizeEntries(deck.entries),
    },
    cards,
  };
}

export function buildCollectionExportFile(decks: Deck[], cards: Card[]): DeckCollectionExportFile {
  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: buildExportTimestamp(),
    type: 'battle-monsters-deck-collection',
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name.trim(),
      entries: normalizeEntries(d.entries),
    })),
    cards,
  };
}

export function exportDeck(deckId: string): DeckExportFile {
  const deck = getDeckById(deckId);
  if (!deck) {
    throw new Error(`Deck with id "${deckId}" not found.`);
  }
  const allCards = loadCards();
  const cards = collectCardsForDeck(deck, allCards);
  const requiredIds = new Set(deck.entries.map((e) => e.cardId));
  if (cards.length !== requiredIds.size) {
    throw new Error('Deck references cards that are missing from the library.');
  }
  return buildDeckExportFile(deck, cards);
}

export function exportAllDecks(): DeckCollectionExportFile {
  const decks = loadDecks();
  const allCards = loadCards();
  const cards = collectCardsForDecks(decks, allCards);
  return buildCollectionExportFile(decks, cards);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
}

function assertExportVersion(value: unknown): void {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as Record<string, unknown>).exportVersion !== EXPORT_VERSION
  ) {
    throw new Error(`Unsupported or missing exportVersion (expected ${EXPORT_VERSION}).`);
  }
}

function validateExportedCards(cards: unknown): Card[] {
  if (!Array.isArray(cards)) {
    throw new Error('Export must include a cards array.');
  }
  const result: Card[] = [];
  for (const item of cards) {
    if (!isCard(item)) {
      throw new Error('Export contains an invalid card.');
    }
    const errors = validateCardInput(normalizeCardInput(item));
    if (errors.length > 0) {
      throw new Error(`Invalid card "${item.name}": ${errors[0]}`);
    }
    result.push(item);
  }
  return result;
}

function validateDeckShape(deck: unknown): Deck {
  if (!deck || typeof deck !== 'object') {
    throw new Error('Invalid deck object.');
  }
  const d = deck as Record<string, unknown>;
  if (typeof d.id !== 'string' || typeof d.name !== 'string' || !Array.isArray(d.entries)) {
    throw new Error('Deck is missing id, name, or entries.');
  }
  const entries: DeckEntry[] = [];
  for (const entry of d.entries) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid deck entry.');
    const e = entry as Record<string, unknown>;
    if (typeof e.cardId !== 'string' || typeof e.count !== 'number') {
      throw new Error('Invalid deck entry.');
    }
    entries.push({ cardId: e.cardId, count: e.count });
  }
  return {
    id: d.id,
    name: d.name.trim(),
    entries: normalizeEntries(entries),
  };
}

function validateDeckLegalityOrThrow(deck: Deck, cards: Card[]): void {
  const validation = validateDeckLegality(deck, cards);
  if (!validation.valid) {
    throw new Error(validation.errors.map((e) => e.message).join(' '));
  }
}

function validateDeckExportPayload(data: unknown): { deck: Deck; cards: Card[] } {
  assertExportVersion(data);
  const obj = data as Record<string, unknown>;
  if (obj.type !== 'battle-monsters-deck') {
    throw new Error('Invalid export type (expected battle-monsters-deck).');
  }
  const deck = validateDeckShape(obj.deck);
  const cards = validateExportedCards(obj.cards);
  const cardIds = new Set(cards.map((c) => c.id));
  for (const entry of deck.entries) {
    if (!cardIds.has(entry.cardId)) {
      throw new Error(`Deck references missing card id: ${entry.cardId}`);
    }
  }
  validateDeckLegalityOrThrow(deck, cards);
  return { deck, cards };
}

function validateCollectionExportPayload(data: unknown): { decks: Deck[]; cards: Card[] } {
  assertExportVersion(data);
  const obj = data as Record<string, unknown>;
  if (obj.type !== 'battle-monsters-deck-collection') {
    throw new Error('Invalid export type (expected battle-monsters-deck-collection).');
  }
  if (!Array.isArray(obj.decks)) {
    throw new Error('Collection export must include a decks array.');
  }
  const decks = obj.decks.map((d) => validateDeckShape(d));
  const cards = validateExportedCards(obj.cards);
  const cardIds = new Set(cards.map((c) => c.id));
  for (const deck of decks) {
    for (const entry of deck.entries) {
      if (!cardIds.has(entry.cardId)) {
        throw new Error(`Deck "${deck.name}" references missing card id: ${entry.cardId}`);
      }
    }
    validateDeckLegalityOrThrow(deck, cards);
  }
  return { decks, cards };
}

export function uniqueImportedDeckName(desired: string, existingNames: Set<string>): string {
  const base = desired.trim();
  if (!existingNames.has(base)) return base;
  let candidate = `${base} (Imported)`;
  let n = 2;
  while (existingNames.has(candidate)) {
    candidate = `${base} (Imported ${n})`;
    n += 1;
  }
  return candidate;
}

function importCards(
  cards: Card[],
  options: ImportOptions,
): Pick<ImportResult, 'cardsImported' | 'cardsSkipped' | 'cardsUpdated'> {
  let cardsImported = 0;
  let cardsSkipped = 0;
  let cardsUpdated = 0;

  for (const incoming of cards) {
    const existing = getCardById(incoming.id);
    if (!existing) {
      saveCard(incoming);
      cardsImported += 1;
      continue;
    }
    if (cardsEqual(existing, incoming)) {
      cardsSkipped += 1;
      continue;
    }
    const decision = options.onCardConflict?.(existing, incoming) ?? 'skip';
    if (decision === 'overwrite') {
      updateCard(incoming);
      cardsUpdated += 1;
    } else {
      cardsSkipped += 1;
    }
  }

  return { cardsImported, cardsSkipped, cardsUpdated };
}

function importDecks(decks: Deck[]): number {
  const libraryCards = loadCards();
  const existingNames = new Set(loadDecks().map((d) => d.name));
  let decksImported = 0;

  for (const deck of decks) {
    const name = uniqueImportedDeckName(deck.name, existingNames);
    existingNames.add(name);
    const toSave = createDeck({ name, entries: deck.entries });
    saveDeck(toSave, libraryCards);
    decksImported += 1;
  }

  return decksImported;
}

export function importDeckFile(jsonText: string, options: ImportOptions = {}): ImportResult {
  const parsed = parseJson(jsonText);
  const { deck, cards } = validateDeckExportPayload(parsed);
  const cardStats = importCards(cards, options);
  const decksImported = importDecks([deck]);
  return { ...cardStats, decksImported };
}

export function importDeckCollectionFile(
  jsonText: string,
  options: ImportOptions = {},
): ImportResult {
  const parsed = parseJson(jsonText);
  const { decks, cards } = validateCollectionExportPayload(parsed);
  const cardStats = importCards(cards, options);
  const decksImported = importDecks(decks);
  return { ...cardStats, decksImported };
}

export function deckExportFilename(deckName: string): string {
  return `battle-monsters-deck-${sanitizeFilename(deckName)}.json`;
}

export const ALL_DECKS_FILENAME = 'battle-monsters-all-decks.json';

export function downloadJsonFile(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function readJsonUpload(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      reject(new Error('Please choose a .json file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
    reader.readAsText(file);
  });
}

export function formatImportResultMessage(result: ImportResult): string {
  return (
    `Import complete: ${result.cardsImported} card(s) added, ` +
    `${result.cardsSkipped} skipped, ` +
    `${result.cardsUpdated} updated, ` +
    `${result.decksImported} deck(s) imported.`
  );
}
