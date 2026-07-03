import type { CardInstance } from '../engine/gameState';
import { CardPreview } from './CardPreview';
import './Hand.css';

interface HandProps {
  label: string;
  hand: CardInstance[];
  energy: number;
  battlefieldFull: boolean;
  onPlay: (instanceId: string) => void;
  disabled?: boolean;
}

function getDisabledReason(
  cost: number,
  energy: number,
  battlefieldFull: boolean,
  disabled: boolean,
): string | null {
  if (disabled) return null;
  if (battlefieldFull) return 'Battlefield is full! (max 5 monsters)';
  if (energy < cost) return `Need ${cost} energy (you have ${energy})`;
  return null;
}

export function Hand({
  label,
  hand,
  energy,
  battlefieldFull,
  onPlay,
  disabled = false,
}: HandProps) {
  return (
    <section className="hand">
      <h3 className="hand__title">
        {label}
        <span className="hand__hint" title="Cards you can play. Spend energy to put monsters on your battlefield.">
          {' '}— tap Play to put a monster on the field
        </span>
      </h3>

      {hand.length === 0 ? (
        <p className="hand__empty">No cards in hand</p>
      ) : (
        <ul className="hand__list" role="list">
          {hand.map((ci) => {
            const canPlay = !disabled && !battlefieldFull && energy >= ci.card.cost;
            const reason = getDisabledReason(ci.card.cost, energy, battlefieldFull, disabled);

            return (
              <li
                key={ci.instanceId}
                className={`hand__item ${canPlay ? '' : 'hand__item--disabled'}`}
              >
                <div className={`hand__card-wrap ${canPlay ? '' : 'hand__card-wrap--dim'}`}>
                  <CardPreview card={ci.card} size="compact" />
                </div>
                {reason && <p className="hand__reason">{reason}</p>}
                <button
                  type="button"
                  className="hand__play-btn"
                  disabled={!canPlay}
                  title={reason ?? `Play ${ci.card.name} for ${ci.card.cost} energy`}
                  onClick={() => onPlay(ci.instanceId)}
                >
                  {canPlay ? 'Play!' : "Can't play"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
