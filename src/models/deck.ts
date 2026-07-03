import type { Card } from './card';

export const DECK_SIZE = 30;
export const MAX_COPIES_DEFAULT = 3;
export const MAX_COPIES_LEGENDARY = 1;

export interface DeckEntry {
  cardId: string;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  entries: DeckEntry[];
}

export type NewDeck = Omit<Deck, 'id'>;

export interface DeckValidationError {
  code: string;
  message: string;
}

export interface DeckValidationResult {
  valid: boolean;
  errors: DeckValidationError[];
  totalCards: number;
}

export function createDeck(input: NewDeck): Deck {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    entries: normalizeEntries(input.entries),
  };
}

export function countTotalCards(deck: Pick<Deck, 'entries'>): number {
  return deck.entries.reduce((sum, entry) => sum + entry.count, 0);
}

export function normalizeEntries(entries: DeckEntry[]): DeckEntry[] {
  const merged = new Map<string, number>();
  for (const { cardId, count } of entries) {
    if (!cardId || !Number.isFinite(count)) continue;
    const n = Math.floor(count);
    if (n < 1) continue;
    merged.set(cardId, (merged.get(cardId) ?? 0) + n);
  }
  return Array.from(merged.entries()).map(([cardId, count]) => ({ cardId, count }));
}

export function validateDeckLegality(
  deck: Pick<Deck, 'name' | 'entries'>,
  cards: Card[],
): DeckValidationResult {
  const errors: DeckValidationError[] = [];
  const cardsById = new Map(cards.map((c) => [c.id, c]));
  const entries = normalizeEntries(deck.entries);
  const totalCards = countTotalCards({ entries });

  if (!deck.name.trim()) {
    errors.push({ code: 'EMPTY_NAME', message: 'Deck name is required.' });
  }

  for (const entry of entries) {
    const card = cardsById.get(entry.cardId);
    if (!card) {
      errors.push({ code: 'UNKNOWN_CARD', message: `Unknown card id: ${entry.cardId}` });
      continue;
    }
    const maxCopies = card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_DEFAULT;
    if (entry.count > maxCopies) {
      errors.push({
        code: card.rarity === 'legendary' ? 'LEGENDARY_LIMIT' : 'TOO_MANY_COPIES',
        message:
          card.rarity === 'legendary'
            ? `Legendary card "${card.name}" can only have 1 copy.`
            : `"${card.name}" can have at most ${maxCopies} copies.`,
      });
    }
  }

  if (totalCards !== DECK_SIZE) {
    errors.push({
      code: 'WRONG_SIZE',
      message: `Deck must contain exactly ${DECK_SIZE} cards (currently ${totalCards}).`,
    });
  }

  return { valid: errors.length === 0, errors, totalCards };
}

export function expandDeckToInstances(deck: Deck, cardsById: Map<string, Card>): Card[] {
  const pile: Card[] = [];
  for (const entry of deck.entries) {
    const template = cardsById.get(entry.cardId);
    if (!template) continue;
    for (let i = 0; i < entry.count; i++) {
      pile.push(template);
    }
  }
  return pile;
}
