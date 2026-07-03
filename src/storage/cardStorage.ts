import { cardFromUnknown, type Card } from '../models/card';

const STORAGE_KEY = 'battle-monsters:cards';

function readRaw(): Card[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => cardFromUnknown(item))
      .filter((card): card is Card => card !== null);
  } catch {
    return [];
  }
}

function writeAll(cards: Card[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
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
  const next = cards.filter((c) => c.id !== id);
  if (next.length === cards.length) throw new Error(`Card with id "${id}" not found.`);
  writeAll(next);
}

export function getCardById(id: string): Card | undefined {
  return readRaw().find((c) => c.id === id);
}
