export type Rarity = 'common' | 'rare' | 'legendary';

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'legendary'] as const;
export const COMMON_CREATURE_TYPES = [
  'Cat',
  'Dragon',
  'Goblin',
  'Beast',
  'Fairy',
  'Robot',
  'Undead',
  'Princess',
  'Knight',
  'Elemental',
  'Bug',
  'Fish',
  'Bird',
  'Dinosaur',
] as const;

export const CARD_LIMITS = {
  nameMaxLength: 40,
  flavorTextMaxLength: 200,
  costMin: 0,
  costMax: 10,
  attackMin: 0,
  attackMax: 20,
  healthMin: 1,
  healthMax: 20,
  creatureTypesMaxCount: 3,
  creatureTypeMaxLength: 20,
} as const;

export interface Card {
  id: string;
  name: string;
  imageUrl: string;
  cost: number;
  attack: number;
  health: number;
  flavorText: string;
  rarity: Rarity;
  creatureTypes: string[];
}

export interface CardInput {
  name: string;
  imageUrl: string;
  cost: number;
  attack: number;
  health: number;
  flavorText: string;
  rarity: Rarity;
  creatureTypes?: string[];
}

export type NormalizedCardInput = Omit<Card, 'id'>;

export type NewCard = CardInput;

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function normalizeCreatureTypes(types: readonly string[] | null | undefined): string[] {
  if (!Array.isArray(types)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawType of types) {
    if (typeof rawType !== 'string') continue;
    const trimmed = rawType.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

export function normalizeCardInput(input: CardInput): NormalizedCardInput {
  return {
    name: input.name.trim().slice(0, CARD_LIMITS.nameMaxLength),
    imageUrl: input.imageUrl,
    cost: clampInt(input.cost, CARD_LIMITS.costMin, CARD_LIMITS.costMax),
    attack: clampInt(input.attack, CARD_LIMITS.attackMin, CARD_LIMITS.attackMax),
    health: clampInt(input.health, CARD_LIMITS.healthMin, CARD_LIMITS.healthMax),
    flavorText: input.flavorText.trim().slice(0, CARD_LIMITS.flavorTextMaxLength),
    rarity: input.rarity,
    creatureTypes: normalizeCreatureTypes(input.creatureTypes),
  };
}

export function validateCardInput(input: CardInput): string[] {
  const errors: string[] = [];
  const creatureTypes = normalizeCreatureTypes(input.creatureTypes);

  if (!input.name.trim()) {
    errors.push('Card name is required.');
  } else if (input.name.trim().length > CARD_LIMITS.nameMaxLength) {
    errors.push(`Name must be at most ${CARD_LIMITS.nameMaxLength} characters.`);
  }

  if (!input.imageUrl.trim()) {
    errors.push('Card image is required.');
  }

  if (!Number.isFinite(input.cost) || input.cost < CARD_LIMITS.costMin || input.cost > CARD_LIMITS.costMax) {
    errors.push(`Cost must be between ${CARD_LIMITS.costMin} and ${CARD_LIMITS.costMax}.`);
  }

  if (!Number.isFinite(input.attack) || input.attack < CARD_LIMITS.attackMin || input.attack > CARD_LIMITS.attackMax) {
    errors.push(`Attack must be between ${CARD_LIMITS.attackMin} and ${CARD_LIMITS.attackMax}.`);
  }

  if (!Number.isFinite(input.health) || input.health < CARD_LIMITS.healthMin || input.health > CARD_LIMITS.healthMax) {
    errors.push(`Health must be between ${CARD_LIMITS.healthMin} and ${CARD_LIMITS.healthMax}.`);
  }

  if (input.flavorText.length > CARD_LIMITS.flavorTextMaxLength) {
    errors.push(`Flavor text must be at most ${CARD_LIMITS.flavorTextMaxLength} characters.`);
  }

  if (!isRarity(input.rarity)) {
    errors.push('Invalid rarity.');
  }

  if (creatureTypes.length > CARD_LIMITS.creatureTypesMaxCount) {
    errors.push(`Cards can have at most ${CARD_LIMITS.creatureTypesMaxCount} creature types.`);
  }

  if (creatureTypes.some((type) => type.length > CARD_LIMITS.creatureTypeMaxLength)) {
    errors.push(`Creature type names must be at most ${CARD_LIMITS.creatureTypeMaxLength} characters.`);
  }

  return errors;
}

export function createCard(input: NewCard): Card {
  const normalized = normalizeCardInput(input);
  const errors = validateCardInput(normalized);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
  return {
    id: crypto.randomUUID(),
    ...normalized,
  };
}

export function cardWithId(id: string, input: CardInput): Card {
  const normalized = normalizeCardInput(input);
  const errors = validateCardInput(normalized);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
  return { id, ...normalized };
}

export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'string' && RARITIES.includes(value as Rarity);
}

export function isCard(value: unknown): value is Card {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    typeof c.imageUrl === 'string' &&
    typeof c.cost === 'number' &&
    typeof c.attack === 'number' &&
    typeof c.health === 'number' &&
    typeof c.flavorText === 'string' &&
    (typeof c.creatureTypes === 'undefined' ||
      (Array.isArray(c.creatureTypes) && c.creatureTypes.every((type) => typeof type === 'string'))) &&
    isRarity(c.rarity)
  );
}

export function cardFromUnknown(value: unknown): Card | null {
  if (!isCard(value)) return null;

  const card = value as Card & { creatureTypes?: string[] };

  try {
    return cardWithId(card.id, {
      name: card.name,
      imageUrl: card.imageUrl,
      cost: card.cost,
      attack: card.attack,
      health: card.health,
      flavorText: card.flavorText,
      rarity: card.rarity,
      creatureTypes: normalizeCreatureTypes(card.creatureTypes),
    });
  } catch {
    return null;
  }
}

export function cardToInput(card: Card): CardInput {
  return {
    name: card.name,
    imageUrl: card.imageUrl,
    cost: card.cost,
    attack: card.attack,
    health: card.health,
    flavorText: card.flavorText,
    rarity: card.rarity,
    creatureTypes: normalizeCreatureTypes(card.creatureTypes),
  };
}
