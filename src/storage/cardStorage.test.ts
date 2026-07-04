import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cardWithId } from '../models/card';
import { deleteCard, loadCards, saveCard } from './cardStorage';

const CARDS_KEY = 'battle-monsters:cards';
const DECKS_KEY = 'battle-monsters:decks';

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

  it('preserves corrupted raw card data under a recovery key', () => {
    localStorage.setItem(CARDS_KEY, '{bad json');

    expect(() => loadCards()).toThrow(/recovery copy was saved/i);

    const recoveryRaw = localStorage.getItem('battle-monsters:recovery:battle-monsters:cards');
    expect(recoveryRaw).toBeTruthy();
    expect(recoveryRaw).toContain('{bad json');
  });

  it('blocks deleting a card while decks still use it', () => {
    const card = cardWithId('used-card', {
      name: 'Used Card',
      imageUrl: 'data:image/webp;base64,used',
      cost: 1,
      attack: 2,
      health: 2,
      flavorText: '',
      rarity: 'common',
    });

    saveCard(card);
    localStorage.setItem(
      DECKS_KEY,
      JSON.stringify([
        {
          id: 'deck-1',
          name: 'Rainbow Team',
          entries: [{ cardId: 'used-card', count: 3 }],
        },
      ]),
    );

    expect(() => deleteCard('used-card')).toThrow(/Rainbow Team/);
  });
});
