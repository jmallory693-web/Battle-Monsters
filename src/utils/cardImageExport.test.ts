import { describe, expect, it } from 'vitest';
import { buildCardImageSvg, cardImageFilename } from './cardImageExport';

describe('cardImageExport', () => {
  it('builds a stable png filename from the card name', () => {
    expect(cardImageFilename('Rainbow Cat!!!')).toBe('battle-monsters-card-rainbow-cat.png');
  });

  it('includes the card details in the exported svg markup', () => {
    const svg = buildCardImageSvg({
      name: 'Rainbow Cat',
      imageUrl: 'data:image/png;base64,abc',
      cost: 3,
      attack: 4,
      health: 5,
      flavorText: 'A colorful fighter.',
      rarity: 'rare',
      creatureTypes: ['Cat', 'Fairy'],
    });

    expect(svg).toContain('Rainbow Cat');
    expect(svg).toContain('A colorful fighter.');
    expect(svg).toContain('Cat • Fairy');
    expect(svg).toContain('data:image/png;base64,abc');
  });

  it('includes chosen visual style metadata in the exported svg markup', () => {
    const svg = buildCardImageSvg({
      name: 'Moonlight Dragon',
      imageUrl: 'data:image/png;base64,def',
      cost: 7,
      attack: 8,
      health: 9,
      flavorText: 'A dreamy guardian.',
      rarity: 'legendary',
      creatureTypes: ['Dragon'],
      visualStyle: {
        frameTheme: 'bold',
        backgroundStyle: 'ocean',
        borderStyle: 'double',
        textColor: 'gold',
        collectionName: 'Moonlight Set',
        artistName: 'Justin',
      },
    });

    expect(svg).toContain('Moonlight Set');
    expect(svg).toContain('Art: Justin');
    expect(svg).toContain('stroke-width="12"');
    expect(svg).toContain('#0f766e');
    expect(svg).toContain('#fef3c7');
  });
});
