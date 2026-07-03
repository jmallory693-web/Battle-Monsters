import { describe, it, expect } from 'vitest';
import { createCard, validateCardInput, cardWithId, CARD_LIMITS } from './card';

const validInput = {
  name: 'Rainbow Cat',
  imageUrl: 'data:image/jpeg;base64,abc',
  cost: 3,
  attack: 4,
  health: 5,
  flavorText: 'A colorful fighter.',
  rarity: 'common' as const,
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
