import {
  cardToInput,
  normalizeCreatureTypes,
  validateCardInput,
  type Card,
} from '../models/card';
import {
  DECK_SIZE,
  MAX_COPIES_DEFAULT,
  MAX_COPIES_LEGENDARY,
  normalizeEntries,
  validateDeckLegality,
  type Deck,
  type DeckEntry,
  type DeckValidationResult,
  type NewDeck,
} from '../models/deck';

export type AutoDeckDifficulty = 'easy' | 'normal' | 'hard';
export type AutoDeckStyle =
  | 'random'
  | 'balanced'
  | 'aggressive'
  | 'defensive'
  | 'big-monsters'
  | 'cheap-swarm';

export interface GenerateAutoDeckOptions {
  name: string;
  difficulty: AutoDeckDifficulty;
  style: AutoDeckStyle;
  includeLegendary: boolean;
  preferredCreatureType?: string;
  cards: Card[];
  random?: () => number;
}

function maxCopies(card: Card): number {
  return card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_DEFAULT;
}

function cardPower(card: Card): number {
  return card.attack + card.health;
}

function cardEfficiency(card: Card): number {
  return cardPower(card) / (card.cost + 1);
}

function attackPressure(card: Card): number {
  return card.attack / (card.cost + 1);
}

function healthPressure(card: Card): number {
  return card.health / (card.cost + 1);
}

function matchesPreferredCreatureType(card: Card, preferredCreatureType: string | undefined): boolean {
  const preferred = preferredCreatureType?.trim().toLowerCase();
  if (!preferred) return false;
  return normalizeCreatureTypes(card.creatureTypes).some((type) => type.toLowerCase() === preferred);
}

function rarityWeight(card: Card): number {
  if (card.rarity === 'legendary') return 3;
  if (card.rarity === 'rare') return 1.5;
  return 0;
}

function isCardUsable(card: Card): boolean {
  return validateCardInput(cardToInput(card)).length === 0;
}

function costBucket(card: Card): 'cheap' | 'medium' | 'expensive' {
  if (card.cost <= 2) return 'cheap';
  if (card.cost <= 5) return 'medium';
  return 'expensive';
}

function currentBucketCounts(selected: Map<string, number>, cardsById: Map<string, Card>) {
  const counts = {
    cheap: 0,
    medium: 0,
    expensive: 0,
  };

  for (const [cardId, copies] of selected.entries()) {
    const card = cardsById.get(cardId);
    if (!card) continue;
    counts[costBucket(card)] += copies;
  }

  return counts;
}

function dynamicStyleBonus(
  card: Card,
  style: AutoDeckStyle,
  selected: Map<string, number>,
  cardsById: Map<string, Card>,
): number {
  if (style === 'balanced') {
    const targets = { cheap: 10, medium: 10, expensive: 10 };
    const counts = currentBucketCounts(selected, cardsById);
    const bucket = costBucket(card);
    const gap = targets[bucket] - counts[bucket];
    return gap * 1.6;
  }

  if (style === 'cheap-swarm') {
    return card.cost <= 2 ? 3 : -card.cost * 0.75;
  }

  if (style === 'big-monsters') {
    return card.cost >= 6 ? 4 : -2;
  }

  return 0;
}

function duplicatePenalty(card: Card, selected: Map<string, number>): number {
  const copies = selected.get(card.id) ?? 0;
  const ratio = copies / maxCopies(card);
  return 1 - ratio * 0.4;
}

function weightedPick<T>(items: T[], weights: number[], random: () => number): T {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return items[Math.floor(random() * items.length)]!;
  }

  let roll = random() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return items[i]!;
  }

  return items[items.length - 1]!;
}

function buildEntries(selected: Map<string, number>, cardsById: Map<string, Card>): DeckEntry[] {
  return normalizeEntries(
    Array.from(selected.entries())
      .map(([cardId, count]) => ({ cardId, count }))
      .sort((a, b) => {
        const cardA = cardsById.get(a.cardId);
        const cardB = cardsById.get(b.cardId);
        if (!cardA || !cardB) return a.cardId.localeCompare(b.cardId);
        return cardA.name.localeCompare(cardB.name);
      }),
  );
}

export function scoreCardForDeck(
  card: Card,
  difficulty: AutoDeckDifficulty,
  style: AutoDeckStyle,
  preferredCreatureType?: string,
): number {
  const power = cardPower(card);
  const efficiency = cardEfficiency(card);
  const rarity = rarityWeight(card);
  let score = 12;

  switch (difficulty) {
    case 'easy':
      score += (12 - power) * 1.8;
      score -= efficiency * 3.5;
      score -= card.attack * 0.8;
      score -= card.health * 0.5;
      score -= rarity * 4;
      break;
    case 'normal':
      score += power * 1.15;
      score += efficiency * 1.6;
      score += rarity * 1.5;
      break;
    case 'hard':
      score += power * 1.9;
      score += efficiency * 3.2;
      score += card.attack * 0.8;
      score += card.health * 0.6;
      score += rarity * 5;
      break;
  }

  switch (style) {
    case 'random':
      score += 4;
      break;
    case 'balanced':
      score += Math.max(0, 7 - Math.abs(card.cost - 4) * 1.8);
      score += power * 0.5;
      break;
    case 'aggressive':
      score += card.attack * 4.8;
      score += attackPressure(card) * 6;
      score += Math.max(0, 5 - card.cost) * 2.8;
      score -= card.health * 0.6;
      break;
    case 'defensive':
      score += card.health * 4.4;
      score += healthPressure(card) * 5;
      score -= card.attack * 0.2;
      break;
    case 'big-monsters':
      score += card.cost * 4;
      score += power * 1.5;
      score += card.cost >= 6 ? 8 : 0;
      break;
    case 'cheap-swarm':
      score += Math.max(0, 6 - card.cost) * 4.5;
      score += efficiency * 4;
      score += card.cost <= 2 ? 6 : 0;
      break;
  }

  if (matchesPreferredCreatureType(card, preferredCreatureType)) {
    score += 20;
  }

  return Math.max(0.1, score);
}

export function validateGeneratedDeck(
  deck: Pick<Deck, 'name' | 'entries'>,
  cards: Card[],
): DeckValidationResult {
  const base = validateDeckLegality(deck, cards);
  const errors = [...base.errors];
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const invalidCardIds = new Set<string>();

  for (const entry of normalizeEntries(deck.entries)) {
    const card = cardsById.get(entry.cardId);
    if (!card || invalidCardIds.has(card.id)) continue;
    if (validateCardInput(cardToInput(card)).length > 0) {
      invalidCardIds.add(card.id);
      errors.push({
        code: 'INVALID_CARD',
        message: `Card "${card.name}" is invalid and cannot be used in an auto-generated deck.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    totalCards: base.totalCards,
  };
}

export function generateAutoDeck(options: GenerateAutoDeckOptions): NewDeck {
  const name = options.name.trim();
  if (!name) {
    throw new Error('Deck name is required.');
  }

  const random = options.random ?? Math.random;
  const usableCards = options.cards.filter(
    (card) => isCardUsable(card) && (options.includeLegendary || card.rarity !== 'legendary'),
  );

  if (usableCards.length === 0) {
    throw new Error('No valid cards are available for auto deck generation.');
  }

  const totalCapacity = usableCards.reduce((sum, card) => sum + maxCopies(card), 0);
  if (totalCapacity < DECK_SIZE) {
    throw new Error(
      `Need at least ${DECK_SIZE} available card copies under deck limits to generate a deck.`,
    );
  }

  const cardsById = new Map(usableCards.map((card) => [card.id, card]));
  const selected = new Map<string, number>();

  for (let i = 0; i < DECK_SIZE; i++) {
    const candidates = usableCards.filter((card) => (selected.get(card.id) ?? 0) < maxCopies(card));
    if (candidates.length === 0) {
      throw new Error('Could not finish generating a legal deck from the current card library.');
    }

    const weights = candidates.map((card) => {
      const baseScore = scoreCardForDeck(
        card,
        options.difficulty,
        options.style,
        options.preferredCreatureType,
      );
      const styleBonus = dynamicStyleBonus(card, options.style, selected, cardsById);
      const weight = (baseScore + styleBonus) * duplicatePenalty(card, selected);
      return Math.max(0.1, weight);
    });

    const chosen = weightedPick(candidates, weights, random);
    selected.set(chosen.id, (selected.get(chosen.id) ?? 0) + 1);
  }

  const deck: NewDeck = {
    name,
    entries: buildEntries(selected, cardsById),
  };

  const validation = validateGeneratedDeck(deck, usableCards);
  if (!validation.valid) {
    throw new Error(validation.errors[0]?.message ?? 'Generated deck is not legal.');
  }

  return deck;
}
