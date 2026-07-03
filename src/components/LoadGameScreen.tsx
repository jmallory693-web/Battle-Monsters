import type { SavedGame } from '../engine/gameState';
import './LoadGameScreen.css';

interface LoadGameScreenProps {
  saves: SavedGame[];
  onLoad: (save: SavedGame) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export function LoadGameScreen({ saves, onLoad, onDelete, onBack }: LoadGameScreenProps) {
  function handleDelete(save: SavedGame) {
    const confirmed = window.confirm(`Delete save "${save.name}"?`);
    if (confirmed) onDelete(save.id);
  }

  return (
    <div className="load-game">
      <div className="load-game__header">
        <h2>Load Saved Game</h2>
        <button type="button" className="load-game__back" onClick={onBack}>
          Back
        </button>
      </div>

      {saves.length === 0 ? (
        <p className="load-game__empty">No saved games yet.</p>
      ) : (
        <ul className="load-game__list" role="list">
          {saves.map((save) => {
            const activeLabel = save.activePlayerIndex === 0 ? 'Player 1' : 'Player 2';
            const date = new Date(save.savedAt).toLocaleString();
            const isOver = save.gameState.winner !== null;

            return (
              <li key={save.id} className="load-game__item">
                <div className="load-game__info">
                  <strong>{save.name}</strong>
                  <span className="load-game__meta">
                    Turn {save.turnNumber} · {activeLabel}'s turn ·{' '}
                    P1 {save.player1Health} HP · P2 {save.player2Health} HP
                  </span>
                  <span className="load-game__meta">
                    {save.gameMode === 'ai' ? 'vs AI' : 'Local PvP'} · {date}
                    {isOver && ' · Finished'}
                  </span>
                </div>
                <div className="load-game__actions">
                  <button type="button" onClick={() => onLoad(save)} disabled={isOver}>
                    Load
                  </button>
                  <button
                    type="button"
                    className="load-game__delete"
                    onClick={() => handleDelete(save)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
