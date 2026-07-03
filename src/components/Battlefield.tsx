import type { BoardMonster } from '../engine/gameState';
import './Battlefield.css';

interface BattlefieldProps {
  monsters: BoardMonster[];
  isOwn: boolean;
  selectedAttackerId?: string | null;
  canReceiveAttack?: boolean;
  disabled?: boolean;
  onSelectAttacker?: (instanceId: string) => void;
  onAttackTarget?: (defenderInstanceId: string) => void;
}

function getMonsterStatus(m: BoardMonster, isOwn: boolean): string | null {
  if (!isOwn) return null;
  if (!m.canAttack) return 'Just played — wait until next turn';
  if (m.hasAttacked) return 'Already attacked this turn';
  return null;
}

export function Battlefield({
  monsters,
  isOwn,
  selectedAttackerId,
  canReceiveAttack,
  disabled,
  onSelectAttacker,
  onAttackTarget,
}: BattlefieldProps) {
  const label = isOwn ? 'Your monsters' : 'Enemy monsters';

  if (monsters.length === 0) {
    return (
      <div className="battlefield battlefield--empty" title="Battlefield — max 5 monsters">
        <span className="battlefield__label">{label}</span>
        <span>{isOwn ? 'No monsters yet — play a card!' : 'No enemy monsters'}</span>
      </div>
    );
  }

  return (
    <div className="battlefield-wrap">
      <span className="battlefield__label">{label}</span>
      <ul className="battlefield" role="list">
        {monsters.map((m) => {
          const isSelected = selectedAttackerId === m.instanceId;
          const canAttack = isOwn && m.canAttack && !m.hasAttacked && !disabled;
          const isTarget = !isOwn && canReceiveAttack;
          const status = getMonsterStatus(m, isOwn);
          const isDisabled = isOwn ? !canAttack && !isSelected : !isTarget;

          return (
            <li key={m.instanceId}>
              <button
                type="button"
                className={[
                  'battlefield__monster',
                  `battlefield__monster--${m.card.rarity}`,
                  isSelected ? 'battlefield__monster--selected' : '',
                  canAttack ? 'battlefield__monster--can-attack' : '',
                  isTarget ? 'battlefield__monster--target' : '',
                  isDisabled && isOwn ? 'battlefield__monster--sleeping' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={isDisabled}
                title={
                  canAttack
                    ? 'Tap to attack!'
                    : status ?? (isTarget ? 'Tap to attack this monster' : undefined)
                }
                onClick={() => {
                  if (isOwn && onSelectAttacker) onSelectAttacker(m.instanceId);
                  else if (!isOwn && onAttackTarget) onAttackTarget(m.instanceId);
                }}
              >
                <span className="battlefield__name">{m.card.name}</span>
                <div className="battlefield__stats">
                  <span className="battlefield__atk" title="Attack">
                    ⚔ {m.card.attack}
                  </span>
                  <span className="battlefield__hp" title="Health">
                    ❤ {m.currentHealth}
                  </span>
                </div>
                {status && <span className="battlefield__status">{status}</span>}
                {canAttack && <span className="battlefield__ready">Ready!</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
