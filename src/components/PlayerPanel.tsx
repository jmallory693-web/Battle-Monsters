import type { PlayerState } from '../engine/gameState';
import { HelpTip } from './HelpTip';
import './PlayerPanel.css';

interface PlayerPanelProps {
  player: PlayerState;
  title: string;
  isActive: boolean;
  canBeAttacked?: boolean;
  onAttackPlayer?: () => void;
}

export function PlayerPanel({
  player,
  title,
  isActive,
  canBeAttacked,
  onAttackPlayer,
}: PlayerPanelProps) {
  return (
    <div className={`player-panel ${isActive ? 'player-panel--active' : ''}`}>
      <div className="player-panel__header">
        <strong className="player-panel__title">{title}</strong>
        {isActive && <span className="player-panel__badge">⭐ Active</span>}
      </div>

      <div className="player-panel__stats">
        <div className="player-panel__stat player-panel__stat--health">
          <span className="player-panel__stat-value">{player.health}</span>
          <span className="player-panel__stat-label">Health</span>
        </div>
        <div className="player-panel__stat player-panel__stat--energy">
          <span className="player-panel__stat-value">
            {player.energy}/{player.maxEnergy}
          </span>
          <HelpTip
            label="Energy"
            text="Spend energy to play monsters. You get +1 max energy each turn (up to 10)."
          />
        </div>
        <div className="player-panel__stat">
          <span className="player-panel__stat-value">{player.deck.length}</span>
          <HelpTip label="Deck" text="Cards left to draw. If you must draw and the deck is empty, you lose!" />
        </div>
        <div className="player-panel__stat">
          <span className="player-panel__stat-value">{player.discardPile.length}</span>
          <HelpTip label="Discard" text="Played and destroyed cards go here." />
        </div>
      </div>

      {canBeAttacked && onAttackPlayer && (
        <button type="button" className="player-panel__face-attack" onClick={onAttackPlayer}>
          ⚔ Attack {title}!
        </button>
      )}
    </div>
  );
}
