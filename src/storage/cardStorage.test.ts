import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCards } from './cardStorage';

const CARDS_KEY = 'battle-monsters:cards';

describe('cardStorage', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => store.clear(),
    });
  });

  it('loads old cards without creatureTypes as an empty array', () => {
    localStorage.setItem(
      CARDS_KEY,
      JSON.stringify([
        {
          id: 'legacy-card',
          name: 'Legacy Cat',
          imageUrl: 'data:image/jpeg;base64,abc',
          cost: 2,
          attack: 3,
          health: 4,
          flavorText: 'Old save',
          rarity: 'common',
        },
      ]),
    );

    const cards = loadCards();

    expect(cards).toHaveLength(1);
    expect(cards[0]?.creatureTypes).toEqual([]);
  });
});
