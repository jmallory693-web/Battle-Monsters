import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteDeck, loadDecks, saveDeck } from './deckStorage';
import type { Deck } from '../models/deck';
import { DEFAULT_CARD_VISUAL_STYLE, type Card } from '../models/card';

const CARDS_KEY = 'battle-monsters:cards';
const DECKS_KEY = 'battle-monsters:decks';
const AI_OPPONENTS_KEY = 'battle-monsters:ai-opponents';

function makeCard(id: string): Card {
  return {
    id,
    name: `Card ${id}`,
    imageUrl: 'data:image/webp;base64,abc',
    cost: 1,
    attack: 2,
    health: 3,
    flavorText: '',
    rarity: 'common',
    creatureTypes: [],
    visualStyle: DEFAULT_CARD_VISUAL_STYLE,
  };
}

describe('deckStorage', () => {
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

  it('blocks deleting a deck while an AI opponent uses it', () => {
    const cards = Array.from({ length: 10 }, (_, index) => makeCard(`c${index}`));
    const deck: Deck = {
      id: 'deck-1',
      name: 'Starter Deck',
      entries: cards.map((card) => ({ cardId: card.id, count: 3 })),
    };

    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
    saveDeck(deck, cards);
    localStorage.setItem(
      AI_OPPONENTS_KEY,
      JSON.stringify([
        {
          id: 'ai-1',
          name: 'Coach Bot',
          difficulty: 'normal',
          playStyle: 'balanced',
          deckSource: 'savedDeck',
          savedDeckId: deck.id,
          includeLegendary: true,
        },
      ]),
    );

    expect(() => deleteDeck(deck.id)).toThrow(/Coach Bot/);
    expect(loadDecks()).toHaveLength(1);
  });

  it('turns quota errors into a useful save warning', () => {
    const cards = Array.from({ length: 10 }, (_, index) => makeCard(`q${index}`));
    const deck: Deck = {
      id: 'quota-deck',
      name: 'Quota Deck',
      entries: cards.map((card) => ({ cardId: card.id, count: 3 })),
    };

    localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
    localStorage.setItem(DECKS_KEY, JSON.stringify([]));

    const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => {
        if (key === CARDS_KEY) return JSON.stringify(cards);
        if (key === DECKS_KEY) return JSON.stringify([]);
        return null;
      },
      setItem: (_key: string, _value: string) => {
        throw quotaError;
      },
      removeItem: () => {},
      clear: () => {},
    });

    expect(() => saveDeck(deck, cards)).toThrow(/Browser storage is full/i);
  });
});
