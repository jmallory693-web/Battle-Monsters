import './GameOverScreen.css';

interface GameOverScreenProps {
  winner: 0 | 1 | null;
  gameMode: 'local' | 'ai';
  onNewGame: () => void;
  onLoadGame: () => void;
  onReturnToMenu: () => void;
}

export function GameOverScreen({
  winner,
  gameMode,
  onNewGame,
  onLoadGame,
  onReturnToMenu,
}: GameOverScreenProps) {
  let headline = "It's a draw!";
  if (winner === 0) {
    headline = gameMode === 'ai' ? 'You win!' : 'Player 1 wins!';
  } else if (winner === 1) {
    headline = gameMode === 'ai' ? 'The computer wins!' : 'Player 2 wins!';
  }

  return (
    <div className="game-over" role="dialog" aria-label="Game over">
      <div className="game-over__card">
        <p className="game-over__emoji" aria-hidden="true">
          {winner === null ? '🤝' : '🏆'}
        </p>
        <h2 className="game-over__title">Game Over!</h2>
        <p className="game-over__winner">{headline}</p>
        <div className="game-over__actions">
          <button type="button" className="game-over__btn game-over__btn--primary" onClick={onNewGame}>
            New Game
          </button>
          <button type="button" className="game-over__btn" onClick={onLoadGame}>
            Load Game
          </button>
          <button type="button" className="game-over__btn game-over__btn--ghost" onClick={onReturnToMenu}>
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
}
