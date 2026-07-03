import { normalizeCreatureTypes, type Rarity } from '../models/card';
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

  return (
    <article
      className={`card-preview card-preview--${size} rarity-${card.rarity} ${className}`.trim()}
      aria-label={`${displayName}, cost ${card.cost}, attack ${card.attack}, health ${card.health}`}
    >
      <div className="card-preview__frame">
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
