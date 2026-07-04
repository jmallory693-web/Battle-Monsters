import {
  normalizeCardVisualStyle,
  normalizeCreatureTypes,
  type CardVisualStyle,
  type Rarity,
} from '../models/card';
import { resolveCardVisualTheme } from './cardVisualTheme';

export interface ExportableCardImageData {
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

const CARD_WIDTH = 660;
const CARD_HEIGHT = 900;

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  legendary: 'Legendary',
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFilename(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return sanitized || 'card';
}

function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length === maxLines) {
        return lines.map((line, index) =>
          index === maxLines - 1 ? `${line.replace(/[.]{3,}$/, '').slice(0, maxCharsPerLine - 1)}…` : line,
        );
      }
    }

    current = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  return lines;
}

function buildTextLines(
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  className: string,
  anchor = 'start',
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" class="${className}">${escapeXml(line)}</text>`,
    )
    .join('');
}

export function cardImageFilename(cardName: string): string {
  return `battle-monsters-card-${sanitizeFilename(cardName)}.png`;
}

export function buildCardImageSvg(card: ExportableCardImageData): string {
  const visualStyle = normalizeCardVisualStyle(card.visualStyle);
  const theme = resolveCardVisualTheme(card.rarity, visualStyle);
  const displayName = card.name.trim() || 'Unnamed Card';
  const flavorText = card.flavorText.trim();
  const creatureTypes = normalizeCreatureTypes(card.creatureTypes);
  const collectionName = visualStyle.collectionName.trim();
  const artistName = visualStyle.artistName.trim();
  const nameLines = wrapText(displayName, 20, 2);
  const flavorLines = wrapText(flavorText, 30, 4);
  const typeLines = wrapText(creatureTypes.join(' • '), 28, 2);
  const escapedImageUrl = escapeXml(card.imageUrl);

  const imageMarkup = card.imageUrl
    ? `<image href="${escapedImageUrl}" x="42" y="132" width="576" height="344" preserveAspectRatio="xMidYMid slice" clip-path="url(#art-clip)" />`
    : `<rect x="42" y="132" width="576" height="344" rx="20" fill="${theme.imageBackground}" />
       <text x="330" y="304" text-anchor="middle" class="placeholder-text">No picture yet</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.background.top}" />
      <stop offset="52%" stop-color="${theme.background.middle}" />
      <stop offset="100%" stop-color="${theme.background.bottom}" />
    </linearGradient>
    <linearGradient id="cost-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.statGradients.cost[0]}" />
      <stop offset="100%" stop-color="${theme.statGradients.cost[1]}" />
    </linearGradient>
    <linearGradient id="attack-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.statGradients.attack[0]}" />
      <stop offset="100%" stop-color="${theme.statGradients.attack[1]}" />
    </linearGradient>
    <linearGradient id="health-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.statGradients.health[0]}" />
      <stop offset="100%" stop-color="${theme.statGradients.health[1]}" />
    </linearGradient>
    <clipPath id="art-clip">
      <rect x="42" y="132" width="576" height="344" rx="20" />
    </clipPath>
    <style>
      .meta-text { fill: ${theme.text.secondary}; font: 700 13px Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
      .card-name { fill: ${theme.text.primary}; font: 800 34px Arial, sans-serif; }
      .stat-label { fill: ${theme.text.accent}; font: 700 14px Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
      .stat-value { fill: ${theme.text.accent}; font: 800 44px Arial, sans-serif; }
      .rarity-text { fill: ${theme.rarityText}; font: 800 20px Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
      .type-text { fill: ${theme.typeText}; font: 700 18px Arial, sans-serif; }
      .flavor-text { fill: ${theme.text.muted}; font: italic 20px Georgia, serif; }
      .placeholder-text { fill: #7c8496; font: 600 26px Arial, sans-serif; }
    </style>
  </defs>
  <rect x="16" y="16" width="628" height="868" rx="34" fill="url(#card-bg)" stroke="${theme.borderColor}" stroke-width="${theme.borderWidth * 2}" />
  <rect x="28" y="28" width="604" height="844" rx="28" fill="rgba(0,0,0,0.16)" />
  ${
    visualStyle.borderStyle === 'double'
      ? `<rect x="34" y="34" width="592" height="836" rx="24" fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="3" />`
      : ''
  }
  <rect x="30" y="30" width="600" height="92" rx="20" fill="${theme.headerOverlay}" />
  ${
    collectionName || artistName
      ? `<text x="54" y="50" class="meta-text">${escapeXml(
          [collectionName, artistName ? `Art: ${artistName}` : ''].filter(Boolean).join('   '),
        )}</text>`
      : ''
  }
  ${buildTextLines(nameLines, 54, collectionName || artistName ? 82 : 72, 34, 'card-name')}
  <rect x="516" y="46" width="92" height="60" rx="16" fill="url(#cost-bg)" />
  <text x="562" y="67" text-anchor="middle" class="stat-label">Cost</text>
  <text x="562" y="101" text-anchor="middle" class="stat-value">${card.cost}</text>
  ${imageMarkup}
  <rect x="30" y="488" width="600" height="98" rx="18" fill="${theme.sectionOverlay}" />
  <rect x="48" y="504" width="110" height="66" rx="16" fill="url(#attack-bg)" />
  <text x="103" y="527" text-anchor="middle" class="stat-label">ATK</text>
  <text x="103" y="564" text-anchor="middle" class="stat-value">${card.attack}</text>
  <text x="330" y="545" text-anchor="middle" class="rarity-text">${RARITY_LABEL[card.rarity]}</text>
  <rect x="502" y="504" width="110" height="66" rx="16" fill="url(#health-bg)" />
  <text x="557" y="527" text-anchor="middle" class="stat-label">HP</text>
  <text x="557" y="564" text-anchor="middle" class="stat-value">${card.health}</text>
  ${
    typeLines.length > 0
      ? `<rect x="42" y="606" width="576" height="${typeLines.length > 1 ? 82 : 56}" rx="18" fill="${theme.typeBackground}" stroke="${theme.typeBorder}" />
         ${buildTextLines(typeLines, 60, 640, 28, 'type-text')}`
      : ''
  }
  ${
    flavorLines.length > 0
      ? `<rect x="42" y="${typeLines.length > 0 ? 706 : 626}" width="576" height="136" rx="18" fill="${theme.flavorPanel}" />
         ${buildTextLines(flavorLines, 60, typeLines.length > 0 ? 746 : 666, 28, 'flavor-text')}`
      : ''
  }
</svg>`;
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportCardAsImage(card: ExportableCardImageData): Promise<void> {
  const svg = buildCardImageSvg(card);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = CARD_WIDTH;
          canvas.height = CARD_HEIGHT;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Could not prepare the card image export.'));
            return;
          }

          context.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(
                new Error(
                  'Could not export the card image. Remote art URLs may block browser image export.',
                ),
              );
              return;
            }
            triggerDownload(cardImageFilename(card.name), blob);
            resolve();
          }, 'image/png');
        } catch {
          reject(
            new Error('Could not export the card image. Remote art URLs may block browser image export.'),
          );
        }
      };
      image.onerror = () => {
        reject(new Error('Could not render the card image for export.'));
      };
      image.src = svgUrl;
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function exportAllCardsAsImages(cards: ExportableCardImageData[]): Promise<number> {
  let exported = 0;
  for (const card of cards) {
    await exportCardAsImage(card);
    exported += 1;
    await new Promise((resolve) => window.setTimeout(resolve, 75));
  }
  return exported;
}
