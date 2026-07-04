import { describe, it, expect } from 'vitest';
import {
  cardFromUnknown,
  createCard,
  DEFAULT_CARD_VISUAL_STYLE,
  validateCardInput,
  cardWithId,
  normalizeCardInput,
  CARD_LIMITS,
} from './card';

const validInput = {
  name: 'Rainbow Cat',
  imageUrl: 'data:image/jpeg;base64,abc',
  cost: 3,
  attack: 4,
  health: 5,
  flavorText: 'A colorful fighter.',
  rarity: 'common' as const,
  creatureTypes: ['Cat'],
};

describe('validateCardInput', () => {
  it('accepts valid input', () => {
    expect(validateCardInput(validInput)).toEqual([]);
  });

  it('requires name', () => {
    const errors = validateCardInput({ ...validInput, name: '  ' });
    expect(errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('requires image', () => {
    const errors = validateCardInput({ ...validInput, imageUrl: '' });
    expect(errors.some((e) => e.includes('image'))).toBe(true);
  });

  it('enforces cost range 0-10', () => {
    expect(validateCardInput({ ...validInput, cost: -1 }).length).toBeGreaterThan(0);
    expect(validateCardInput({ ...validInput, cost: 11 }).length).toBeGreaterThan(0);
    expect(validateCardInput({ ...validInput, cost: 10 })).toEqual([]);
  });

  it('enforces attack range 0-20', () => {
    expect(validateCardInput({ ...validInput, attack: 21 }).length).toBeGreaterThan(0);
  });

  it('enforces health range 1-20', () => {
    expect(validateCardInput({ ...validInput, health: 0 }).length).toBeGreaterThan(0);
    expect(validateCardInput({ ...validInput, health: 1 })).toEqual([]);
  });

  it('enforces flavor text length', () => {
    const long = 'x'.repeat(CARD_LIMITS.flavorTextMaxLength + 1);
    expect(validateCardInput({ ...validInput, flavorText: long }).length).toBeGreaterThan(0);
  });

  it('accepts optional creature types', () => {
    expect(validateCardInput({ ...validInput, creatureTypes: [] })).toEqual([]);
    expect(validateCardInput({ ...validInput, creatureTypes: undefined })).toEqual([]);
  });

  it('limits creature types to three', () => {
    const errors = validateCardInput({
      ...validInput,
      creatureTypes: ['Cat', 'Fairy', 'Dragon', 'Bird'],
    });
    expect(errors.some((e) => e.includes('at most 3 creature types'))).toBe(true);
  });

  it('enforces creature type name length', () => {
    const errors = validateCardInput({
      ...validInput,
      creatureTypes: ['x'.repeat(CARD_LIMITS.creatureTypeMaxLength + 1)],
    });
    expect(errors.some((e) => e.includes('Creature type names'))).toBe(true);
  });
});

describe('createCard', () => {
  it('creates a card with a new id', () => {
    const card = createCard(validInput);
    expect(card.id).toBeTruthy();
    expect(card.name).toBe('Rainbow Cat');
  });

  it('throws on invalid input', () => {
    expect(() => createCard({ ...validInput, name: '' })).toThrow();
  });
});

describe('cardWithId', () => {
  it('preserves the provided id', () => {
    const card = cardWithId('fixed-id', validInput);
    expect(card.id).toBe('fixed-id');
  });
});

describe('normalizeCardInput', () => {
  it('removes duplicate creature types and trims whitespace', () => {
    const normalized = normalizeCardInput({
      ...validInput,
      creatureTypes: [' Cat ', 'Fairy', 'cat', 'Fairy ', '  '],
    });

    expect(normalized.creatureTypes).toEqual(['Cat', 'Fairy']);
  });

  it('applies the default visual style when one is not provided', () => {
    const normalized = normalizeCardInput(validInput);
    expect(normalized.visualStyle).toEqual(DEFAULT_CARD_VISUAL_STYLE);
  });
});

describe('cardFromUnknown', () => {
  it('keeps older saved cards backward compatible with the default visual style', () => {
    const restored = cardFromUnknown({
      id: 'legacy-card',
      name: 'Legacy Cat',
      imageUrl: 'data:image/jpeg;base64,abc',
      cost: 2,
      attack: 3,
      health: 4,
      flavorText: 'Old save',
      rarity: 'common',
    });

    expect(restored?.visualStyle).toEqual(DEFAULT_CARD_VISUAL_STYLE);
  });
});
