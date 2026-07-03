import { useEffect, useRef, useState } from 'react';
import type { GameMode, GameState } from '../engine/gameState';
import { getActivePlayer } from '../engine/helpers';
import { playMonster, attackMonster, attackPlayer, endTurn } from '../engine/rules';
import { PlayerPanel } from './PlayerPanel';
import { Battlefield } from './Battlefield';
import { Hand } from './Hand';
import { HelpTip } from './HelpTip';
import { GameOverScreen } from './GameOverScreen';
import './GameBoard.css';

interface GameBoardProps {
  game: GameState;
  gameMode: GameMode;
  onGameChange: (state: GameState) => void;
  inputDisabled?: boolean;
  onNewGame: () => void;
  onLoadGame: () => void;
  onReturnToMenu: () => void;
}

function isGameFinished(state: GameState): boolean {
  if (state.winner !== null) return true;
  return state.players[0].health <= 0 && state.players[1].health <= 0;
}

export function GameBoard({
  game,
  gameMode,
  onGameChange,
  inputDisabled = false,
  onNewGame,
  onLoadGame,
  onReturnToMenu,
}: GameBoardProps) {
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const prevLogLength = useRef(game.gameLog.length);

  const activeIdx = game.activePlayerIndex;
  const activePlayer = getActivePlayer(game);
  const topIdx = activeIdx === 0 ? 1 : 0;
  const playerTop = game.players[topIdx];
  const playerBottom = game.players[activeIdx];
  const activeLabel = activeIdx === 0 ? 'Player 1' : 'Player 2';
  const isOver = isGameFinished(game);
  const disabled = isOver || inputDisabled;
  const showHand =
    !isOver && !(gameMode === 'ai' && activeIdx === 1) && !inputDisabled;

  useEffect(() => {
    if (game.gameLog.length > prevLogLength.current) {
      const latest = game.gameLog[game.gameLog.length - 1];
      setActionFeedback(latest);
      prevLogLength.current = game.gameLog.length;
    }
  }, [game.gameLog]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [game.gameLog.length]);

  function runAction(action: () => GameState) {
    if (disabled) return;
    setError(null);
    try {
      onGameChange(action());
      setSelectedAttackerId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid move.';
      setError(msg);
      setActionFeedback(null);
    }
  }

  return (
    <div className="game-board">
      {isOver && (
        <GameOverScreen
          winner={game.winner}
          gameMode={gameMode}
          onNewGame={onNewGame}
          onLoadGame={onLoadGame}
          onReturnToMenu={onReturnToMenu}
        />
      )}

      {!isOver && (
        <div className="game-board__active-banner" role="status">
          {inputDisabled && gameMode === 'ai' ? (
            <>🤖 Computer is thinking…</>
          ) : (
            <>
              ⭐ <strong>{activeLabel}'s turn</strong> — Turn {game.turnNumber}
            </>
          )}
        </div>
      )}

      {actionFeedback && !error && (
        <p className="game-board__feedback" role="status">
          {actionFeedback}
        </p>
      )}

      {selectedAttackerId && !disabled && (
        <p className="game-board__attack-hint" role="status">
          👆 Pick an enemy monster or attack the other player!
        </p>
      )}

      {error && (
        <p className="game-board__error" role="alert">
          ⚠ {error}
        </p>
      )}

      <section className="game-board__player-row game-board__player-row--opponent">
        <PlayerPanel
          player={playerTop}
          title={topIdx === 0 ? 'Player 1' : 'Player 2'}
          isActive={topIdx === activeIdx}
          canBeAttacked={!disabled && selectedAttackerId !== null && topIdx !== activeIdx}
          onAttackPlayer={() => {
            if (!selectedAttackerId) {
              setError('Tap one of your monsters first, then attack!');
              return;
            }
            runAction(() => attackPlayer(game, selectedAttackerId));
          }}
        />
        <Battlefield
          monsters={playerTop.battlefield}
          isOwn={false}
          selectedAttackerId={selectedAttackerId}
          canReceiveAttack={!disabled && selectedAttackerId !== null}
          onAttackTarget={(id) => {
            if (!selectedAttackerId) {
              setError('Tap one of your monsters first, then attack!');
              return;
            }
            runAction(() => attackMonster(game, selectedAttackerId, id));
          }}
        />
      </section>

      <section className="game-board__player-row game-board__player-row--you">
        <PlayerPanel
          player={playerBottom}
          title={activeIdx === 0 ? 'Player 1' : 'Player 2'}
          isActive
        />
        <Battlefield
          monsters={playerBottom.battlefield}
          isOwn
          selectedAttackerId={selectedAttackerId}
          disabled={disabled}
          onSelectAttacker={(id) => {
            setError(null);
            const monster = playerBottom.battlefield.find((m) => m.instanceId === id);
            if (monster && !monster.canAttack) {
              setError('This monster just played — it cannot attack yet! (Summoning sickness)');
              return;
            }
            if (monster?.hasAttacked) {
              setError('This monster already attacked this turn!');
              return;
            }
            setSelectedAttackerId((prev) => (prev === id ? null : id));
          }}
        />
      </section>

      {showHand && (
        <Hand
          label={`${activeLabel}'s hand`}
          hand={activePlayer.hand}
          energy={activePlayer.energy}
          battlefieldFull={activePlayer.battlefield.length >= 5}
          onPlay={(id) => runAction(() => playMonster(game, id))}
          disabled={disabled}
        />
      )}

      <div className="game-board__actions">
        <button
          type="button"
          className="game-board__end-turn"
          onClick={() => runAction(() => endTurn(game))}
          disabled={disabled}
          title="End your turn. Your opponent will draw a card and gain energy."
        >
          End Turn
        </button>
        <p className="game-board__end-hint">
          <HelpTip
            label="End Turn"
            text="When you're done, press End Turn. New monsters can't attack the turn they're played (summoning sickness)."
          />
        </p>
      </div>

      <section className="game-board__log-panel" aria-label="Game log">
        <h3 className="game-board__log-title">What happened</h3>
        <ul className="game-board__log-list">
          {game.gameLog.map((line, i) => (
            <li
              key={i}
              className={
                i === game.gameLog.length - 1 ? 'game-board__log-item--latest' : ''
              }
            >
              {line}
            </li>
          ))}
          <div ref={logEndRef} />
        </ul>
      </section>
    </div>
  );
}
