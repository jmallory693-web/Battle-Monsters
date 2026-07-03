import { describe, expect, it } from 'vitest';
import { cardWithId, type Card, type Rarity } from '../models/card';
import { MAX_COPIES_DEFAULT, MAX_COPIES_LEGENDARY, countTotalCards } from '../models/deck';
import {
  generateAutoDeck,
  validateGeneratedDeck,
  type AutoDeckDifficulty,
  type AutoDeckStyle,
} from './autoDeckBuilder';

function makeCard(
  id: string,
  stats: { cost: number; attack: number; health: number; rarity?: Rarity; creatureTypes?: string[] },
): Card {
  return cardWithId(id, {
    name: id,
    imageUrl: `data:image/webp;base64,${id}`,
    cost: stats.cost,
    attack: stats.attack,
    health: stats.health,
    flavorText: `${id} flavor`,
    rarity: stats.rarity ?? 'common',
    creatureTypes: stats.creatureTypes,
  });
}

function makeSequenceRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const library: Card[] = [
  makeCard('mouse', { cost: 0, attack: 1, health: 1, creatureTypes: ['Beast'] }),
  makeCard('squire', { cost: 1, attack: 1, health: 2, creatureTypes: ['Knight'] }),
  makeCard('swarmling', { cost: 1, attack: 2, health: 1, creatureTypes: ['Goblin'] }),
  makeCard('shield-bug', { cost: 2, attack: 1, health: 5, creatureTypes: ['Bug'] }),
  makeCard('trainee', { cost: 2, attack: 2, health: 3, creatureTypes: ['Monster'] }),
  makeCard('archer', { cost: 2, attack: 3, health: 2, creatureTypes: ['Bird'] }),
  makeCard('defender', { cost: 3, attack: 2, health: 6, creatureTypes: ['Knight'] }),
  makeCard('berserker', { cost: 3, attack: 5, health: 2, rarity: 'rare', creatureTypes: ['Goblin'] }),
  makeCard('knight', { cost: 4, attack: 4, health: 4, rarity: 'rare', creatureTypes: ['Knight'] }),
  makeCard('guardian', { cost: 4, attack: 2, health: 7, rarity: 'rare', creatureTypes: ['Robot'] }),
  makeCard('brute', { cost: 5, attack: 6, health: 5, creatureTypes: ['Beast'] }),
  makeCard('ogre', { cost: 6, attack: 7, health: 7, rarity: 'rare', creatureTypes: ['Monster'] }),
  makeCard('hydra', { cost: 7, attack: 8, health: 8, rarity: 'legendary', creatureTypes: ['Dragon'] }),
  makeCard('colossus', { cost: 8, attack: 9, health: 10, rarity: 'rare', creatureTypes: ['Robot'] }),
  makeCard('dragon', { cost: 9, attack: 12, health: 10, rarity: 'legendary', creatureTypes: ['Dragon'] }),
  {
    ...makeCard('broken-card', { cost: 2, attack: 2, health: 2 }),
    imageUrl: '',
  },
];

function generate(
  difficulty: AutoDeckDifficulty,
  style: AutoDeckStyle,
  seed: number,
  includeLegendary = true,
  preferredCreatureType?: string,
) {
  return generateAutoDeck({
    name: `${difficulty}-${style}`,
    difficulty,
    style,
    includeLegendary,
    preferredCreatureType,
    cards: library,
    random: makeSequenceRng(seed),
  });
}

function expand(deck: ReturnType<typeof generateAutoDeck>, cards: Card[]): Card[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const expanded: Card[] = [];
  for (const entry of deck.entries) {
    const card = cardsById.get(entry.cardId);
    if (!card) continue;
    for (let i = 0; i < entry.count; i++) {
      expanded.push(card);
    }
  }
  return expanded;
}

function averageMetric(deck: ReturnType<typeof generateAutoDeck>, metric: (card: Card) => number): number {
  const expanded = expand(deck, library);
  return expanded.reduce((sum, card) => sum + metric(card), 0) / expanded.length;
}

describe('generateAutoDeck', () => {
  it('generates exactly 30 cards', () => {
    const deck = generate('normal', 'balanced', 1);
    expect(countTotalCards(deck)).toBe(30);
    expect(validateGeneratedDeck(deck, library).valid).toBe(true);
  });

  it('respects copy limits', () => {
    const deck = generate('hard', 'random', 2);
    const cardsById = new Map(library.map((card) => [card.id, card]));

    for (const entry of deck.entries) {
      const card = cardsById.get(entry.cardId)!;
      const maxCopies = card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_DEFAULT;
      expect(entry.count).toBeLessThanOrEqual(maxCopies);
    }
  });

  it('respects legendary limit', () => {
    const deck = generate('hard', 'big-monsters', 3, true);
    const cardsById = new Map(library.map((card) => [card.id, card]));

    for (const entry of deck.entries) {
      const card = cardsById.get(entry.cardId)!;
      if (card.rarity === 'legendary') {
        expect(entry.count).toBe(1);
      }
    }
  });

  it('easy decks are weaker than hard decks on average', () => {
    const easy = generate('easy', 'balanced', 4);
    const hard = generate('hard', 'balanced', 4);

    const easyPower = averageMetric(easy, (card) => card.attack + card.health);
    const hardPower = averageMetric(hard, (card) => card.attack + card.health);

    expect(hardPower).toBeGreaterThan(easyPower);
  });

  it('aggressive decks prefer attack', () => {
    const aggressive = generate('normal', 'aggressive', 5);
    const defensive = generate('normal', 'defensive', 5);

    const aggressiveAttack = averageMetric(aggressive, (card) => card.attack);
    const defensiveAttack = averageMetric(defensive, (card) => card.attack);

    expect(aggressiveAttack).toBeGreaterThan(defensiveAttack);
  });

  it('defensive decks prefer health', () => {
    const aggressive = generate('normal', 'aggressive', 6);
    const defensive = generate('normal', 'defensive', 6);

    const aggressiveHealth = averageMetric(aggressive, (card) => card.health);
    const defensiveHealth = averageMetric(defensive, (card) => card.health);

    expect(defensiveHealth).toBeGreaterThan(aggressiveHealth);
  });

  it('cheap swarm decks prefer low cost', () => {
    const swarm = generate('normal', 'cheap-swarm', 7);
    const big = generate('normal', 'big-monsters', 7);

    const swarmCost = averageMetric(swarm, (card) => card.cost);
    const bigCost = averageMetric(big, (card) => card.cost);

    expect(swarmCost).toBeLessThan(bigCost);
  });

  it('big monsters decks prefer high cost and power', () => {
    const swarm = generate('normal', 'cheap-swarm', 8);
    const big = generate('normal', 'big-monsters', 8);

    const swarmPower = averageMetric(swarm, (card) => card.attack + card.health);
    const bigPower = averageMetric(big, (card) => card.attack + card.health);
    const swarmCost = averageMetric(swarm, (card) => card.cost);
    const bigCost = averageMetric(big, (card) => card.cost);

    expect(bigCost).toBeGreaterThan(swarmCost);
    expect(bigPower).toBeGreaterThan(swarmPower);
  });

  it('prefers the selected creature type when available', () => {
    const themed = generate('normal', 'balanced', 9, true, 'Knight');
    const unthemed = generate('normal', 'balanced', 9, true);

    const themedMatches = expand(themed, library).filter((card) =>
      card.creatureTypes.includes('Knight'),
    ).length;
    const unthemedMatches = expand(unthemed, library).filter((card) =>
      card.creatureTypes.includes('Knight'),
    ).length;

    expect(themedMatches).toBeGreaterThan(unthemedMatches);
  });
});
