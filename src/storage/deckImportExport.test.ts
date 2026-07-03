import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { Card } from '../models/card';
import type { Deck } from '../models/deck';
import {
  buildDeckExportFile,
  buildCollectionExportFile,
  collectCardsForDecks,
  exportDeck,
  exportAllDecks,
  importDeckFile,
  importDeckCollectionFile,
  uniqueImportedDeckName,
  sanitizeFilename,
  EXPORT_VERSION,
} from './deckImportExport';

const CARDS_KEY = 'battle-monsters:cards';
const DECKS_KEY = 'battle-monsters:decks';

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    name: overrides.name ?? `Card ${id}`,
    imageUrl: overrides.imageUrl ?? 'data:image/jpeg;base64,abc',
    cost: overrides.cost ?? 1,
    attack: overrides.attack ?? 2,
    health: overrides.health ?? 3,
    flavorText: '',
    rarity: overrides.rarity ?? 'common',
    creatureTypes: overrides.creatureTypes ?? [],
    ...overrides,
  };
}

function makeLegalDeckBundle(
  id: string,
  name: string,
  prefix: string,
): { deck: Deck; cards: Card[] } {
  const cards = Array.from({ length: 10 }, (_, i) => makeCard(`${prefix}-c${i}`));
  const deck: Deck = {
    id,
    name,
    entries: cards.map((c) => ({ cardId: c.id, count: 3 })),
  };
  return { deck, cards };
}

function setupStorage(cards: Card[], decks: Deck[]) {
  localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

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

describe('export', () => {
  it('exporting one deck includes full card data', () => {
    const { deck, cards } = makeLegalDeckBundle('d1', 'My Deck', 'exp');
    cards[0] = { ...cards[0], name: 'Rainbow Cat', creatureTypes: ['Cat', 'Fairy'] };
    setupStorage(cards, [deck]);

    const exported = exportDeck('d1');
    expect(exported.exportVersion).toBe(EXPORT_VERSION);
    expect(exported.type).toBe('battle-monsters-deck');
    expect(exported.deck.name).toBe('My Deck');
    expect(exported.cards).toHaveLength(10);
    expect(exported.cards.find((c) => c.name === 'Rainbow Cat')).toBeTruthy();
    expect(exported.cards.find((c) => c.name === 'Rainbow Cat')?.creatureTypes).toEqual(['Cat', 'Fairy']);
  });

  it('exporting all decks includes shared cards only once', () => {
    const bundle1 = makeLegalDeckBundle('d1', 'Deck A', 'a');
    const shared = bundle1.cards[0];
    const extra = Array.from({ length: 9 }, (_, i) => makeCard(`b-c${i}`));
    const deck2: Deck = {
      id: 'd2',
      name: 'Deck B',
      entries: [
        { cardId: shared.id, count: 3 },
        ...extra.map((c) => ({ cardId: c.id, count: 3 })),
      ],
    };
    setupStorage([...bundle1.cards, ...extra], [bundle1.deck, deck2]);

    const exported = exportAllDecks();
    expect(exported.decks).toHaveLength(2);
    expect(exported.cards).toHaveLength(19);
    const ids = exported.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('collectCardsForDecks deduplicates card ids', () => {
    const { deck: d1, cards: cards1 } = makeLegalDeckBundle('d1', 'A', 'dup');
    const sharedId = cards1[0].id;
    const deck2: Deck = {
      id: 'd2',
      name: 'B',
      entries: [{ cardId: sharedId, count: 3 }],
    };
    const cards = collectCardsForDecks([d1, deck2], cards1);
    expect(cards.some((c) => c.id === sharedId)).toBe(true);
  });
});

describe('import', () => {
  it('importing a deck restores missing cards', () => {
    const { deck, cards } = makeLegalDeckBundle('d-import', 'Imported Deck', 'imp');
    const file = buildDeckExportFile(deck, cards);

    setupStorage([], []);

    const result = importDeckFile(JSON.stringify(file));
    expect(result.cardsImported).toBe(10);
    expect(result.decksImported).toBe(1);

    const storedCards = JSON.parse(localStorage.getItem(CARDS_KEY)!) as Card[];
    const decks = JSON.parse(localStorage.getItem(DECKS_KEY)!) as Deck[];
    expect(storedCards).toHaveLength(10);
    expect(decks.some((d) => d.name === 'Imported Deck')).toBe(true);
  });

  it('rejects invalid JSON', () => {
    expect(() => importDeckFile('not json')).toThrow(/valid JSON/i);
  });

  it('rejects illegal decks', () => {
    const card = makeCard('c1');
    const badDeck: Deck = {
      id: 'bad',
      name: 'Bad',
      entries: [{ cardId: 'c1', count: 10 }],
    };
    const file = buildDeckExportFile(badDeck, [card]);
    expect(() => importDeckFile(JSON.stringify(file))).toThrow(/30 cards/i);
  });

  it('rejects wrong export type', () => {
    const { deck, cards } = makeLegalDeckBundle('d1', 'Test', 't');
    const file = { ...buildDeckExportFile(deck, cards), type: 'wrong-type' };
    expect(() => importDeckFile(JSON.stringify(file))).toThrow(/export type/i);
  });

  it('renames duplicate deck names safely', () => {
    const existing = makeLegalDeckBundle('d1', 'My Deck', 'exist');
    setupStorage(existing.cards, [existing.deck]);

    const incoming = makeLegalDeckBundle('d2', 'My Deck', 'in');
    const file = buildDeckExportFile(incoming.deck, incoming.cards);
    importDeckFile(JSON.stringify(file));

    const decks = JSON.parse(localStorage.getItem(DECKS_KEY)!) as Deck[];
    const names = decks.map((d) => d.name);
    expect(names).toContain('My Deck');
    expect(names).toContain('My Deck (Imported)');
  });

  it('imports collection files', () => {
    const b1 = makeLegalDeckBundle('d1', 'One', 'one');
    const b2 = makeLegalDeckBundle('d2', 'Two', 'two');
    const file = buildCollectionExportFile(
      [b1.deck, b2.deck],
      [...b1.cards, ...b2.cards],
    );
    setupStorage([], []);

    const result = importDeckCollectionFile(JSON.stringify(file));
    expect(result.decksImported).toBe(2);
    expect(result.cardsImported).toBe(20);
  });

  it('preserves creature types during import and export', () => {
    const { deck, cards } = makeLegalDeckBundle('typed-deck', 'Typed Deck', 'typed');
    cards[0] = { ...cards[0], creatureTypes: ['Dragon', 'Elemental'] };
    setupStorage(cards, [deck]);

    const exported = exportDeck('typed-deck');
    setupStorage([], []);
    importDeckFile(JSON.stringify(exported));

    const storedCards = JSON.parse(localStorage.getItem(CARDS_KEY)!) as Card[];
    expect(storedCards.find((card) => card.id === cards[0]?.id)?.creatureTypes).toEqual([
      'Dragon',
      'Elemental',
    ]);
  });

  it('accepts imported older cards without creatureTypes', () => {
    const { deck, cards } = makeLegalDeckBundle('legacy-deck', 'Legacy Deck', 'legacy');
    const legacyCards = cards.map((card) => {
      const { creatureTypes: _creatureTypes, ...legacyCard } = card;
      return legacyCard;
    });
    const file = {
      ...buildDeckExportFile(deck, cards),
      cards: legacyCards,
    };

    setupStorage([], []);

    const result = importDeckFile(JSON.stringify(file));
    expect(result.cardsImported).toBe(10);

    const storedCards = JSON.parse(localStorage.getItem(CARDS_KEY)!) as Card[];
    expect(storedCards.every((card) => Array.isArray(card.creatureTypes))).toBe(true);
  });
});

describe('helpers', () => {
  it('uniqueImportedDeckName adds Imported suffix', () => {
    const names = new Set(['My Deck', 'My Deck (Imported)']);
    expect(uniqueImportedDeckName('My Deck', names)).toBe('My Deck (Imported 2)');
  });

  it('sanitizeFilename removes special characters', () => {
    expect(sanitizeFilename('My Cool Deck!!!')).toBe('my-cool-deck');
  });
});
