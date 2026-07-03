import type { GameState } from './gameState';
import type { BoardMonster } from './gameState';
import { getActivePlayer, getInactivePlayer, isBattlefieldFull } from './helpers';
import { playMonster, attackMonster, attackPlayer, endTurn } from './rules';

export const AI_PLAYER_INDEX = 1 as const;

export function isAiTurn(state: GameState): boolean {
  return state.activePlayerIndex === AI_PLAYER_INDEX && state.winner === null;
}

function findWeakestMonster(monsters: BoardMonster[]): BoardMonster | null {
  if (monsters.length === 0) return null;
  return [...monsters].sort((a, b) => {
    if (a.currentHealth !== b.currentHealth) return a.currentHealth - b.currentHealth;
    return a.card.attack - b.card.attack;
  })[0];
}

function playAffordableMonsters(state: GameState): GameState {
  let next = state;
  for (let i = 0; i < 30; i++) {
    const player = getActivePlayer(next);
    if (isBattlefieldFull(player)) break;
    const affordable = player.hand
      .filter((ci) => ci.card.cost <= player.energy)
      .sort((a, b) => b.card.cost - a.card.cost);
    if (affordable.length === 0) break;
    try {
      next = playMonster(next, affordable[0].instanceId);
    } catch {
      break;
    }
  }
  return next;
}

function runAttacks(state: GameState): GameState {
  let next = state;
  for (let i = 0; i < 10; i++) {
    const player = getActivePlayer(next);
    const enemy = getInactivePlayer(next);
    const attackers = player.battlefield.filter((m) => m.canAttack && !m.hasAttacked);
    if (attackers.length === 0) break;
    const attacker = attackers[0];
    const weakest = findWeakestMonster(enemy.battlefield);
    try {
      if (weakest) {
        next = attackMonster(next, attacker.instanceId, weakest.instanceId);
      } else {
        next = attackPlayer(next, attacker.instanceId);
      }
    } catch {
      break;
    }
  }
  return next;
}

export function runAiTurn(state: GameState): GameState {
  if (!isAiTurn(state)) return state;
  let next = state;
  next = playAffordableMonsters(next);
  next = runAttacks(next);
  next = endTurn(next);
  return next;
}
