import { cardToInput, normalizeCreatureTypes, type Card, type CardInput, type Rarity } from '../models/card';

export type CardSortOption = 'newest' | 'name' | 'rarity' | 'cost' | 'attack' | 'health';

export interface CardLibraryFilters {
  searchTerm: string;
  rarity: 'all' | Rarity;
  creatureType: 'all' | string;
  sortBy: CardSortOption;
}

const RARITY_ORDER: Record<Rarity, number> = {
  common: 0,
  rare: 1,
  legendary: 2,
};

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function buildDuplicateCardInput(card: Card, existingCards: Card[]): CardInput {
  const baseName = `${card.name} (Copy)`;
  const existingNames = new Set(existingCards.map((existing) => existing.name.trim().toLowerCase()));
  let candidate = baseName;
  let suffix = 2;

  while (existingNames.has(candidate.trim().toLowerCase())) {
    candidate = `${card.name} (Copy ${suffix})`;
    suffix += 1;
  }

  return {
    ...cardToInput(card),
    name: candidate,
  };
}

export function collectCardCreatureTypes(cards: Card[]): string[] {
  const seen = new Set<string>();

  for (const card of cards) {
    for (const type of normalizeCreatureTypes(card.creatureTypes)) {
      seen.add(type);
    }
  }

  return Array.from(seen).sort(compareText);
}

export function filterAndSortCards(cards: Card[], filters: CardLibraryFilters): Card[] {
  const searchNeedle = filters.searchTerm.trim().toLowerCase();
  const creatureTypeNeedle =
    filters.creatureType === 'all' ? '' : filters.creatureType.trim().toLowerCase();

  const filtered = cards.filter((card) => {
    if (searchNeedle && !card.name.toLowerCase().includes(searchNeedle)) {
      return false;
    }
    if (filters.rarity !== 'all' && card.rarity !== filters.rarity) {
      return false;
    }
    if (
      creatureTypeNeedle &&
      !normalizeCreatureTypes(card.creatureTypes).some(
        (type) => type.toLowerCase() === creatureTypeNeedle,
      )
    ) {
      return false;
    }
    return true;
  });

  return filtered
    .map((card) => ({ card, originalIndex: cards.indexOf(card) }))
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.originalIndex - a.originalIndex;
        case 'name':
          return compareText(a.card.name, b.card.name) || b.originalIndex - a.originalIndex;
        case 'rarity':
          return (
            RARITY_ORDER[a.card.rarity] - RARITY_ORDER[b.card.rarity] ||
            compareText(a.card.name, b.card.name)
          );
        case 'cost':
          return a.card.cost - b.card.cost || compareText(a.card.name, b.card.name);
        case 'attack':
          return a.card.attack - b.card.attack || compareText(a.card.name, b.card.name);
        case 'health':
          return a.card.health - b.card.health || compareText(a.card.name, b.card.name);
      }
    })
    .map(({ card }) => card);
}
