import {
  normalizeCardVisualStyle,
  type CardBackgroundStyle,
  type CardBorderStyle,
  type CardFrameTheme,
  type CardTextColor,
  type CardVisualStyle,
  type Rarity,
} from '../models/card';

interface GradientTheme {
  top: string;
  middle: string;
  bottom: string;
}

interface TextTheme {
  primary: string;
  secondary: string;
  muted: string;
  accent: string;
}

export interface ResolvedCardVisualTheme {
  visualStyle: CardVisualStyle;
  background: GradientTheme;
  borderColor: string;
  rarityText: string;
  text: TextTheme;
  frameRadius: number;
  borderWidth: number;
  shadow: string;
  headerOverlay: string;
  sectionOverlay: string;
  imageBackground: string;
  typeBackground: string;
  typeBorder: string;
  typeText: string;
  flavorPanel: string;
  statGradients: {
    cost: [string, string];
    attack: [string, string];
    health: [string, string];
  };
}

const RARITY_BACKGROUND: Record<Rarity, GradientTheme> = {
  common: { top: '#3d3d5c', middle: '#1e1e32', bottom: '#12121f' },
  rare: { top: '#1e3a5f', middle: '#1a1a3e', bottom: '#0f172a' },
  legendary: { top: '#4a3508', middle: '#2a2010', bottom: '#1a1408' },
};

const BACKGROUND_PRESETS: Record<CardBackgroundStyle, GradientTheme | null> = {
  rarity: null,
  sunset: { top: '#7c2d12', middle: '#7f1d1d', bottom: '#312e81' },
  forest: { top: '#14532d', middle: '#134e4a', bottom: '#052e16' },
  ocean: { top: '#0f766e', middle: '#1d4ed8', bottom: '#172554' },
  rose: { top: '#9d174d', middle: '#7c3aed', bottom: '#312e81' },
  midnight: { top: '#111827', middle: '#1f2937', bottom: '#030712' },
  paper: { top: '#f3e8d0', middle: '#e5d3b3', bottom: '#d6c19a' },
};

const TEXT_THEMES: Record<CardTextColor, TextTheme> = {
  light: {
    primary: '#eeeeee',
    secondary: '#d1d5db',
    muted: '#bbbbbb',
    accent: '#ffffff',
  },
  dark: {
    primary: '#111827',
    secondary: '#1f2937',
    muted: '#374151',
    accent: '#0f172a',
  },
  gold: {
    primary: '#fef3c7',
    secondary: '#fde68a',
    muted: '#fcd34d',
    accent: '#fff7d6',
  },
  violet: {
    primary: '#ede9fe',
    secondary: '#ddd6fe',
    muted: '#c4b5fd',
    accent: '#f5f3ff',
  },
};

const FRAME_THEME_OVERRIDES: Record<
  CardFrameTheme,
  Pick<ResolvedCardVisualTheme, 'frameRadius' | 'borderWidth' | 'shadow' | 'headerOverlay' | 'sectionOverlay'>
> = {
  classic: {
    frameRadius: 14,
    borderWidth: 4,
    shadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
    headerOverlay: 'rgba(0, 0, 0, 0.4)',
    sectionOverlay: 'rgba(0, 0, 0, 0.35)',
  },
  soft: {
    frameRadius: 18,
    borderWidth: 3,
    shadow: '0 10px 24px rgba(15, 23, 42, 0.28)',
    headerOverlay: 'rgba(255, 255, 255, 0.12)',
    sectionOverlay: 'rgba(255, 255, 255, 0.1)',
  },
  bold: {
    frameRadius: 12,
    borderWidth: 6,
    shadow: '0 12px 28px rgba(0, 0, 0, 0.58)',
    headerOverlay: 'rgba(0, 0, 0, 0.5)',
    sectionOverlay: 'rgba(0, 0, 0, 0.42)',
  },
};

const BORDER_STYLE_OVERRIDES: Record<
  CardBorderStyle,
  Pick<ResolvedCardVisualTheme, 'borderColor' | 'shadow'>
> = {
  default: {
    borderColor: '',
    shadow: '',
  },
  double: {
    borderColor: '',
    shadow: '0 0 0 2px rgba(255, 255, 255, 0.22) inset',
  },
  glow: {
    borderColor: '',
    shadow: '0 0 18px rgba(255, 255, 255, 0.2)',
  },
};

export function defaultBorderColorForRarity(rarity: Rarity): string {
  switch (rarity) {
    case 'common':
      return '#9ca3af';
    case 'rare':
      return '#3b82f6';
    case 'legendary':
      return '#f59e0b';
  }
}

export function defaultRarityTextColor(rarity: Rarity): string {
  switch (rarity) {
    case 'common':
      return '#d1d5db';
    case 'rare':
      return '#93c5fd';
    case 'legendary':
      return '#fcd34d';
  }
}

export function resolveCardVisualTheme(
  rarity: Rarity,
  visualStyleInput: Partial<CardVisualStyle> | null | undefined,
): ResolvedCardVisualTheme {
  const visualStyle = normalizeCardVisualStyle(visualStyleInput);
  const background = BACKGROUND_PRESETS[visualStyle.backgroundStyle] ?? RARITY_BACKGROUND[rarity];
  const frameTheme = FRAME_THEME_OVERRIDES[visualStyle.frameTheme];
  const borderColor = defaultBorderColorForRarity(rarity);
  const text = TEXT_THEMES[visualStyle.textColor];
  const borderOverride = BORDER_STYLE_OVERRIDES[visualStyle.borderStyle];

  return {
    visualStyle,
    background,
    borderColor: borderOverride.borderColor || borderColor,
    rarityText: defaultRarityTextColor(rarity),
    text,
    frameRadius: frameTheme.frameRadius,
    borderWidth: frameTheme.borderWidth,
    shadow: [frameTheme.shadow, borderOverride.shadow].filter(Boolean).join(', '),
    headerOverlay: frameTheme.headerOverlay,
    sectionOverlay: frameTheme.sectionOverlay,
    imageBackground: visualStyle.backgroundStyle === 'paper' ? '#e5d3b3' : '#0a0a12',
    typeBackground:
      visualStyle.backgroundStyle === 'paper' ? 'rgba(120, 53, 15, 0.14)' : 'rgba(99, 102, 241, 0.18)',
    typeBorder:
      visualStyle.backgroundStyle === 'paper' ? 'rgba(120, 53, 15, 0.35)' : 'rgba(129, 140, 248, 0.45)',
    typeText: visualStyle.backgroundStyle === 'paper' ? '#7c2d12' : '#c7d2fe',
    flavorPanel:
      visualStyle.backgroundStyle === 'paper' ? 'rgba(120, 53, 15, 0.08)' : 'rgba(255, 255, 255, 0.04)',
    statGradients: {
      cost:
        visualStyle.textColor === 'dark'
          ? ['#c084fc', '#7c3aed']
          : ['#6d28d9', '#4c1d95'],
      attack: ['#dc2626', '#991b1b'],
      health: ['#16a34a', '#15803d'],
    },
  };
}
