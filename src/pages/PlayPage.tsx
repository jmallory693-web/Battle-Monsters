import { useCallback, useEffect, useRef, useState } from 'react';
import type { Deck } from '../models/deck';
import type { GameMode, GameState } from '../engine/gameState';
import { loadDecks } from '../storage/deckStorage';
import { loadCards } from '../storage/cardStorage';
import {
  saveGame,
  loadAllSaves,
  deleteSave,
  getLastSave,
  hasLastSave,
} from '../storage/gameSaveStorage';
import { createNewGameFromDecks } from '../engine/rules';
import { isAiTurn, runAiTurn } from '../engine/ai';
import { GameBoard } from '../components/GameBoard';
import { LoadGameScreen } from '../components/LoadGameScreen';
import type { SavedGame } from '../engine/gameState';
import './PlayPage.css';

type PlayView = 'menu' | 'setup' | 'playing' | 'load';

export function PlayPage() {
  const [view, setView] = useState<PlayView>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deck1Id, setDeck1Id] = useState('');
  const [deck2Id, setDeck2Id] = useState('');
  const [game, setGame] = useState<GameState | null>(null);
  const [currentSaveId, setCurrentSaveId] = useState<string | undefined>();
  const [saves, setSaves] = useState<SavedGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const aiRunningRef = useRef(false);

  const refreshSaves = useCallback(() => {
    setSaves(loadAllSaves());
    setCanContinue(hasLastSave());
  }, []);

  useEffect(() => {
    const loaded = loadDecks();
    setDecks(loaded);
    if (loaded.length > 0) {
      setDeck1Id(loaded[0].id);
      setDeck2Id(loaded.length > 1 ? loaded[1].id : loaded[0].id);
    }
    refreshSaves();
  }, [refreshSaves]);

  useEffect(() => {
    if (gameMode !== 'ai' || !game) return;
    if (!isAiTurn(game)) {
      setAiThinking(false);
      aiRunningRef.current = false;
      return;
    }
    if (aiRunningRef.current) return;

    aiRunningRef.current = true;
    setAiThinking(true);

    const timer = window.setTimeout(() => {
      try {
        setGame((current) => (current ? runAiTurn(current) : current));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI turn failed.');
      } finally {
        setAiThinking(false);
        aiRunningRef.current = false;
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [game, gameMode]);

  function handleStartNewGame() {
    setError(null);
    setSuccess(null);
    const deck1 = decks.find((d) => d.id === deck1Id);
    const deck2 = decks.find((d) => d.id === deck2Id);
    if (!deck1 || !deck2) {
      setError('Please choose two decks.');
      return;
    }
    try {
      const cards = loadCards();
      setGame(createNewGameFromDecks(deck1, deck2, cards));
      setCurrentSaveId(undefined);
      setView('playing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start game.');
    }
  }

  function handleContinueLastGame() {
    setError(null);
    setSuccess(null);
    const last = getLastSave();
    if (!last) {
      setError('No saved game to continue.');
      return;
    }
    if (last.gameState.winner !== null) {
      setError('Last saved game is already finished.');
      refreshSaves();
      return;
    }
    setGame(last.gameState);
    setGameMode(last.gameMode);
    setCurrentSaveId(last.id);
    setView('playing');
    setSuccess(`Continued "${last.name}".`);
  }

  function handleLoadSave(save: SavedGame) {
    setGame(save.gameState);
    setGameMode(save.gameMode);
    setCurrentSaveId(save.id);
    setView('playing');
    setError(null);
    setSuccess(`Loaded "${save.name}".`);
  }

  function handleDeleteSave(id: string) {
    try {
      deleteSave(id);
      if (currentSaveId === id) setCurrentSaveId(undefined);
      refreshSaves();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete save.');
    }
  }

  function handleSaveGame() {
    if (!game) return;
    const name =
      saveName.trim() ||
      `Turn ${game.turnNumber} — P1 ${game.players[0].health} HP`;
    try {
      const saved = saveGame(game, name, gameMode, currentSaveId);
      setCurrentSaveId(saved.id);
      setShowSaveDialog(false);
      setSaveName('');
      setSuccess(`Game saved as "${saved.name}".`);
      refreshSaves();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save game.');
    }
  }

  function handleQuitToMenu() {
    setGame(null);
    setView('menu');
    setShowSaveDialog(false);
    setSuccess(null);
    refreshSaves();
  }

  if (view === 'load') {
    return (
      <div className="page">
        <LoadGameScreen
          saves={saves}
          onLoad={handleLoadSave}
          onDelete={handleDeleteSave}
          onBack={() => setView('menu')}
        />
        {error && <p className="play-error">{error}</p>}
      </div>
    );
  }

  if (view === 'menu') {
    return (
      <div className="page play-menu">
        <h1>Play</h1>
        <p className="page__subtitle">Battle with your custom decks.</p>

        <div className="play-menu__actions">
          <button type="button" className="play-menu__btn play-menu__btn--primary" onClick={() => setView('setup')}>
            New Game
          </button>
          {canContinue && (
            <button type="button" className="play-menu__btn play-menu__btn--continue" onClick={handleContinueLastGame}>
              Continue Last Game
            </button>
          )}
          <button type="button" className="play-menu__btn" onClick={() => { refreshSaves(); setView('load'); }}>
            Load Game
          </button>
        </div>

        {error && <p className="play-error">{error}</p>}
        {success && <p className="play-success">{success}</p>}
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="page play-setup">
        <h1>New Game</h1>
        <button type="button" className="play-back" onClick={() => setView('menu')}>
          Back
        </button>

        <fieldset className="play-setup__mode">
          <legend>Game mode</legend>
          <label>
            <input
              type="radio"
              name="gameMode"
              checked={gameMode === 'local'}
              onChange={() => setGameMode('local')}
            />
            Local PvP
          </label>
          <label>
            <input
              type="radio"
              name="gameMode"
              checked={gameMode === 'ai'}
              onChange={() => setGameMode('ai')}
            />
            Player vs AI
          </label>
        </fieldset>

        {gameMode === 'ai' && (
          <p className="play-setup__hint">You are Player 1. The AI is Player 2.</p>
        )}

        {decks.length < 2 ? (
          <p className="play-setup__warn">You need at least 2 saved decks.</p>
        ) : (
          <div className="play-setup__form">
            <label>
              Player 1 deck
              <select value={deck1Id} onChange={(e) => setDeck1Id(e.target.value)}>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label>
              Player 2 deck
              <select value={deck2Id} onChange={(e) => setDeck2Id(e.target.value)}>
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <button type="button" className="play-setup__start" onClick={handleStartNewGame}>
              Start Game
            </button>
          </div>
        )}

        {error && <p className="play-error">{error}</p>}
      </div>
    );
  }

  if (!game) return null;

  return (
    <div className="page">
      <div className="play-header">
        <h1>Battle {gameMode === 'ai' ? '(vs AI)' : '(Local)'}</h1>
        <div className="play-header__actions">
          <button
            type="button"
            className="play-save"
            onClick={() => setShowSaveDialog(true)}
            disabled={game.winner !== null}
          >
            Save Game
          </button>
          <button type="button" className="play-new-game" onClick={handleQuitToMenu}>
            Quit to Menu
          </button>
        </div>
      </div>

      {aiThinking && <p className="play-ai-thinking" role="status">AI is thinking…</p>}
      {success && <p className="play-success">{success}</p>}
      {error && <p className="play-error">{error}</p>}

      {showSaveDialog && (
        <div className="save-dialog" role="dialog" aria-label="Save game">
          <div className="save-dialog__box">
            <h3>Save Game</h3>
            <label>
              Save name
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`Turn ${game.turnNumber} — P1 ${game.players[0].health} HP`}
                maxLength={60}
              />
            </label>
            <div className="save-dialog__buttons">
              <button type="button" onClick={handleSaveGame}>Save</button>
              <button type="button" className="save-dialog__cancel" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <GameBoard
        game={game}
        gameMode={gameMode}
        onGameChange={(state) => {
          setGame(state);
          setSuccess(null);
        }}
        inputDisabled={aiThinking || (gameMode === 'ai' && isAiTurn(game))}
        onNewGame={() => {
          setGame(null);
          setView('setup');
        }}
        onLoadGame={() => {
          refreshSaves();
          setView('load');
        }}
        onReturnToMenu={handleQuitToMenu}
      />
    </div>
  );
}
