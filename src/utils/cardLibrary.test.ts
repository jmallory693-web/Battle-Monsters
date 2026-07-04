import { describe, expect, it } from 'vitest';
import { DEFAULT_CARD_VISUAL_STYLE, type Card } from '../models/card';
import {
  buildDuplicateCardInput,
  collectCardCreatureTypes,
  filterAndSortCards,
  type CardLibraryFilters,
} from './cardLibrary';

function makeCard(
  id: string,
  name: string,
  rarity: Card['rarity'],
  cost: number,
  attack: number,
  health: number,
  creatureTypes: string[],
): Card {
  return {
    id,
    name,
    imageUrl: 'data:image/webp;base64,abc',
    cost,
    attack,
    health,
    flavorText: '',
    rarity,
    creatureTypes,
    visualStyle: DEFAULT_CARD_VISUAL_STYLE,
  };
}

const cards: Card[] = [
  makeCard('1', 'Alpha Cat', 'common', 2, 3, 4, ['Cat']),
  makeCard('2', 'Beta Dragon', 'rare', 5, 6, 7, ['Dragon']),
  makeCard('3', 'Gamma Cat', 'legendary', 1, 8, 2, ['Cat', 'Fairy']),
];

const baseFilters: CardLibraryFilters = {
  searchTerm: '',
  rarity: 'all',
  creatureType: 'all',
  sortBy: 'newest',
};

describe('cardLibrary', () => {
  it('builds a unique duplicate name', () => {
    const duplicate = buildDuplicateCardInput(cards[0]!, [
      ...cards,
      { ...cards[0]!, id: '4', name: 'Alpha Cat (Copy)' },
    ]);

    expect(duplicate.name).toBe('Alpha Cat (Copy 2)');
  });

  it('collects unique creature types alphabetically', () => {
    expect(collectCardCreatureTypes(cards)).toEqual(['Cat', 'Dragon', 'Fairy']);
  });

  it('filters cards by search, rarity, and creature type', () => {
    const results = filterAndSortCards(cards, {
      ...baseFilters,
      searchTerm: 'cat',
      rarity: 'legendary',
      creatureType: 'Fairy',
    });

    expect(results.map((card) => card.id)).toEqual(['3']);
  });

  it('sorts cards by newest using storage order', () => {
    const results = filterAndSortCards(cards, baseFilters);
    expect(results.map((card) => card.id)).toEqual(['3', '2', '1']);
  });

  it('sorts cards by numeric stats and name', () => {
    const byCost = filterAndSortCards(cards, { ...baseFilters, sortBy: 'cost' });
    const byName = filterAndSortCards(cards, { ...baseFilters, sortBy: 'name' });

    expect(byCost.map((card) => card.id)).toEqual(['3', '1', '2']);
    expect(byName.map((card) => card.id)).toEqual(['1', '2', '3']);
  });
});
