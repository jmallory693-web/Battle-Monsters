import type { CSSProperties } from 'react';
import {
  normalizeCardVisualStyle,
  normalizeCreatureTypes,
  type CardVisualStyle,
  type Rarity,
} from '../models/card';
import { resolveCardVisualTheme } from '../utils/cardVisualTheme';
import './CardPreview.css';

export interface CardPreviewData {
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

interface CardPreviewProps {
  card: CardPreviewData;
  className?: string;
  size?: 'full' | 'compact';
}

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  legendary: 'Legendary',
};

export function CardPreview({ card, className = '', size = 'full' }: CardPreviewProps) {
  const displayName = card.name.trim() || 'Unnamed Card';
  const creatureTypes = normalizeCreatureTypes(card.creatureTypes);
  const visualStyle = normalizeCardVisualStyle(card.visualStyle);
  const theme = resolveCardVisualTheme(card.rarity, visualStyle);
  const collectionName = visualStyle.collectionName.trim();
  const artistName = visualStyle.artistName.trim();

  return (
    <article
      className={`card-preview card-preview--${size} ${className}`.trim()}
      aria-label={`${displayName}, cost ${card.cost}, attack ${card.attack}, health ${card.health}`}
      style={
        {
          '--card-bg-top': theme.background.top,
          '--card-bg-middle': theme.background.middle,
          '--card-bg-bottom': theme.background.bottom,
          '--card-border-color': theme.borderColor,
          '--card-border-width': `${theme.borderWidth}px`,
          '--card-radius': `${theme.frameRadius}px`,
          '--card-shadow': theme.shadow,
          '--card-header-overlay': theme.headerOverlay,
          '--card-section-overlay': theme.sectionOverlay,
          '--card-image-bg': theme.imageBackground,
          '--card-type-bg': theme.typeBackground,
          '--card-type-border': theme.typeBorder,
          '--card-type-text': theme.typeText,
          '--card-flavor-panel': theme.flavorPanel,
          '--card-primary-text': theme.text.primary,
          '--card-secondary-text': theme.text.secondary,
          '--card-muted-text': theme.text.muted,
          '--card-accent-text': theme.text.accent,
          '--card-rarity-text': theme.rarityText,
          '--card-cost-top': theme.statGradients.cost[0],
          '--card-cost-bottom': theme.statGradients.cost[1],
          '--card-attack-top': theme.statGradients.attack[0],
          '--card-attack-bottom': theme.statGradients.attack[1],
          '--card-health-top': theme.statGradients.health[0],
          '--card-health-bottom': theme.statGradients.health[1],
        } as CSSProperties
      }
    >
      <div className="card-preview__frame">
        {(collectionName || artistName) && (
          <div className="card-preview__meta">
            {collectionName && <span className="card-preview__meta-item">{collectionName}</span>}
            {artistName && <span className="card-preview__meta-item">Art: {artistName}</span>}
          </div>
        )}
        <header className="card-preview__header">
          <h3 className="card-preview__name">{displayName}</h3>
          <div className="card-preview__cost" title="Cost — energy to play">
            <span className="card-preview__stat-label">Cost</span>
            <span className="card-preview__stat-value">{card.cost}</span>
          </div>
        </header>

        <div className="card-preview__image-wrap">
          {card.imageUrl ? (
            <img src={card.imageUrl} alt={displayName} className="card-preview__image" />
          ) : (
            <div className="card-preview__image-placeholder">No picture yet</div>
          )}
        </div>

        <div className="card-preview__stats-row">
          <div className="card-preview__stat-box card-preview__stat-box--attack" title="Attack">
            <span className="card-preview__stat-label">ATK</span>
            <span className="card-preview__stat-value">{card.attack}</span>
          </div>
          <span className={`card-preview__rarity rarity-${card.rarity}`}>
            {RARITY_LABEL[card.rarity]}
          </span>
          <div className="card-preview__stat-box card-preview__stat-box--health" title="Health">
            <span className="card-preview__stat-label">HP</span>
            <span className="card-preview__stat-value">{card.health}</span>
          </div>
        </div>

        {creatureTypes.length > 0 && (
          <ul className="card-preview__types" aria-label="Creature types">
            {creatureTypes.map((type) => (
              <li key={type} className="card-preview__type-tag">
                {type}
              </li>
            ))}
          </ul>
        )}

        {size === 'full' && card.flavorText.trim() && (
          <p className="card-preview__flavor">"{card.flavorText.trim()}"</p>
        )}
      </div>
    </article>
  );
}
