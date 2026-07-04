export type Rarity = 'common' | 'rare' | 'legendary';
export type CardFrameTheme = 'classic' | 'soft' | 'bold';
export type CardBackgroundStyle =
  | 'rarity'
  | 'sunset'
  | 'forest'
  | 'ocean'
  | 'rose'
  | 'midnight'
  | 'paper';
export type CardBorderStyle = 'default' | 'double' | 'glow';
export type CardTextColor = 'light' | 'dark' | 'gold' | 'violet';

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'legendary'] as const;
export const CARD_FRAME_THEMES: readonly CardFrameTheme[] = ['classic', 'soft', 'bold'] as const;
export const CARD_BACKGROUND_STYLES: readonly CardBackgroundStyle[] = [
  'rarity',
  'sunset',
  'forest',
  'ocean',
  'rose',
  'midnight',
  'paper',
] as const;
export const CARD_BORDER_STYLES: readonly CardBorderStyle[] = ['default', 'double', 'glow'] as const;
export const CARD_TEXT_COLORS: readonly CardTextColor[] = ['light', 'dark', 'gold', 'violet'] as const;
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
  collectionNameMaxLength: 40,
  artistNameMaxLength: 40,
  costMin: 0,
  costMax: 10,
  attackMin: 0,
  attackMax: 20,
  healthMin: 1,
  healthMax: 20,
  creatureTypesMaxCount: 3,
  creatureTypeMaxLength: 20,
} as const;

export interface CardVisualStyle {
  frameTheme: CardFrameTheme;
  backgroundStyle: CardBackgroundStyle;
  borderStyle: CardBorderStyle;
  textColor: CardTextColor;
  collectionName: string;
  artistName: string;
}

export const DEFAULT_CARD_VISUAL_STYLE: CardVisualStyle = {
  frameTheme: 'classic',
  backgroundStyle: 'rarity',
  borderStyle: 'default',
  textColor: 'light',
  collectionName: '',
  artistName: '',
};

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
  visualStyle: CardVisualStyle;
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
  visualStyle?: Partial<CardVisualStyle>;
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

function normalizeOptionalCardText(value: string | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

export function isCardFrameTheme(value: unknown): value is CardFrameTheme {
  return typeof value === 'string' && CARD_FRAME_THEMES.includes(value as CardFrameTheme);
}

export function isCardBackgroundStyle(value: unknown): value is CardBackgroundStyle {
  return typeof value === 'string' && CARD_BACKGROUND_STYLES.includes(value as CardBackgroundStyle);
}

export function isCardBorderStyle(value: unknown): value is CardBorderStyle {
  return typeof value === 'string' && CARD_BORDER_STYLES.includes(value as CardBorderStyle);
}

export function isCardTextColor(value: unknown): value is CardTextColor {
  return typeof value === 'string' && CARD_TEXT_COLORS.includes(value as CardTextColor);
}

export function normalizeCardVisualStyle(
  visualStyle: Partial<CardVisualStyle> | null | undefined,
): CardVisualStyle {
  return {
    frameTheme: isCardFrameTheme(visualStyle?.frameTheme)
      ? visualStyle.frameTheme
      : DEFAULT_CARD_VISUAL_STYLE.frameTheme,
    backgroundStyle: isCardBackgroundStyle(visualStyle?.backgroundStyle)
      ? visualStyle.backgroundStyle
      : DEFAULT_CARD_VISUAL_STYLE.backgroundStyle,
    borderStyle: isCardBorderStyle(visualStyle?.borderStyle)
      ? visualStyle.borderStyle
      : DEFAULT_CARD_VISUAL_STYLE.borderStyle,
    textColor: isCardTextColor(visualStyle?.textColor)
      ? visualStyle.textColor
      : DEFAULT_CARD_VISUAL_STYLE.textColor,
    collectionName: normalizeOptionalCardText(
      visualStyle?.collectionName,
      CARD_LIMITS.collectionNameMaxLength,
    ),
    artistName: normalizeOptionalCardText(
      visualStyle?.artistName,
      CARD_LIMITS.artistNameMaxLength,
    ),
  };
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
    visualStyle: normalizeCardVisualStyle(input.visualStyle),
  };
}

export function validateCardInput(input: CardInput): string[] {
  const errors: string[] = [];
  const creatureTypes = normalizeCreatureTypes(input.creatureTypes);
  const visualStyle = normalizeCardVisualStyle(input.visualStyle);

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

  if (visualStyle.collectionName.length > CARD_LIMITS.collectionNameMaxLength) {
    errors.push(`Collection name must be at most ${CARD_LIMITS.collectionNameMaxLength} characters.`);
  }

  if (visualStyle.artistName.length > CARD_LIMITS.artistNameMaxLength) {
    errors.push(`Artist name must be at most ${CARD_LIMITS.artistNameMaxLength} characters.`);
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
  const visualStyle = c.visualStyle;
  const hasValidVisualStyle =
    typeof visualStyle === 'undefined' ||
    (!!visualStyle &&
      typeof visualStyle === 'object' &&
      (typeof (visualStyle as Record<string, unknown>).frameTheme === 'undefined' ||
        isCardFrameTheme((visualStyle as Record<string, unknown>).frameTheme)) &&
      (typeof (visualStyle as Record<string, unknown>).backgroundStyle === 'undefined' ||
        isCardBackgroundStyle((visualStyle as Record<string, unknown>).backgroundStyle)) &&
      (typeof (visualStyle as Record<string, unknown>).borderStyle === 'undefined' ||
        isCardBorderStyle((visualStyle as Record<string, unknown>).borderStyle)) &&
      (typeof (visualStyle as Record<string, unknown>).textColor === 'undefined' ||
        isCardTextColor((visualStyle as Record<string, unknown>).textColor)) &&
      (typeof (visualStyle as Record<string, unknown>).collectionName === 'undefined' ||
        typeof (visualStyle as Record<string, unknown>).collectionName === 'string') &&
      (typeof (visualStyle as Record<string, unknown>).artistName === 'undefined' ||
        typeof (visualStyle as Record<string, unknown>).artistName === 'string'));
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
    hasValidVisualStyle &&
    isRarity(c.rarity)
  );
}

export function cardFromUnknown(value: unknown): Card | null {
  if (!isCard(value)) return null;

  const card = value as Card & {
    creatureTypes?: string[];
    visualStyle?: Partial<CardVisualStyle>;
  };

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
      visualStyle: normalizeCardVisualStyle(card.visualStyle),
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
    visualStyle: normalizeCardVisualStyle(card.visualStyle),
  };
}
