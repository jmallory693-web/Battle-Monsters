import { useCallback, useEffect, useRef, useState } from 'react';
import type { Card } from '../models/card';
import { createDeck, countTotalCards, type Deck, type NewDeck } from '../models/deck';
import type { GameMode, GameState } from '../engine/gameState';
import {
  generateAutoDeck,
  validateGeneratedDeck,
  type AutoDeckDifficulty,
  type AutoDeckStyle,
} from '../engine/autoDeckBuilder';
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
import { saveDeck } from '../storage/deckStorage';
import {
  loadAiOpponents,
  resolveAiOpponentDeck,
  type AiOpponent,
} from '../storage/aiOpponentStorage';
import './PlayPage.css';

type PlayView = 'menu' | 'setup' | 'playing' | 'load';
type AiDeckSource = 'saved' | 'generated' | 'opponent';

const AUTO_DIFFICULTIES: AutoDeckDifficulty[] = ['easy', 'normal', 'hard'];
const AUTO_STYLES: AutoDeckStyle[] = [
  'random',
  'balanced',
  'aggressive',
  'defensive',
  'big-monsters',
  'cheap-swarm',
];

function labelAutoStyle(style: AutoDeckStyle): string {
  switch (style) {
    case 'random':
      return 'Random';
    case 'balanced':
      return 'Balanced';
    case 'aggressive':
      return 'Aggressive';
    case 'defensive':
      return 'Defensive';
    case 'big-monsters':
      return 'Big Monsters';
    case 'cheap-swarm':
      return 'Cheap Swarm';
  }
}

export function PlayPage() {
  const [view, setView] = useState<PlayView>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [aiOpponents, setAiOpponents] = useState<AiOpponent[]>([]);
  const [deck1Id, setDeck1Id] = useState('');
  const [deck2Id, setDeck2Id] = useState('');
  const [aiDeckSource, setAiDeckSource] = useState<AiDeckSource>('saved');
  const [aiOpponentId, setAiOpponentId] = useState('');
  const [aiSavedDeckId, setAiSavedDeckId] = useState('');
  const [aiDeckName, setAiDeckName] = useState('AI Auto Deck');
  const [aiDifficulty, setAiDifficulty] = useState<AutoDeckDifficulty>('normal');
  const [aiStyle, setAiStyle] = useState<AutoDeckStyle>('balanced');
  const [aiIncludeLegendary, setAiIncludeLegendary] = useState(true);
  const [generatedAiDeck, setGeneratedAiDeck] = useState<NewDeck | null>(null);
  const [selectedOpponentDeck, setSelectedOpponentDeck] = useState<Deck | null>(null);
  const [selectedOpponentDeckError, setSelectedOpponentDeckError] = useState<string | null>(null);
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

  const refreshDeckData = useCallback(() => {
    const loadedDecks = loadDecks();
    const loadedCards = loadCards();
    const loadedOpponents = loadAiOpponents();

    setDecks(loadedDecks);
    setCards(loadedCards);
    setAiOpponents(loadedOpponents);
    setDeck1Id((current) => {
      if (loadedDecks.some((deck) => deck.id === current)) return current;
      return loadedDecks[0]?.id ?? '';
    });
    setDeck2Id((current) => {
      if (loadedDecks.some((deck) => deck.id === current)) return current;
      return loadedDecks[1]?.id ?? loadedDecks[0]?.id ?? '';
    });
    setAiSavedDeckId((current) => {
      if (loadedDecks.some((deck) => deck.id === current)) return current;
      return loadedDecks[0]?.id ?? '';
    });
    setAiOpponentId((current) => {
      if (loadedOpponents.some((opponent) => opponent.id === current)) return current;
      return loadedOpponents[0]?.id ?? '';
    });
  }, []);

  const refreshSaves = useCallback(() => {
    setSaves(loadAllSaves());
    setCanContinue(hasLastSave());
  }, []);

  useEffect(() => {
    refreshDeckData();
    refreshSaves();
  }, [refreshDeckData, refreshSaves]);

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

  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const selectedAiSavedDeck = decks.find((deck) => deck.id === aiSavedDeckId);
  const selectedAiOpponent = aiOpponents.find((opponent) => opponent.id === aiOpponentId);
  const generatedAiDeckValidation = generatedAiDeck
    ? validateGeneratedDeck(generatedAiDeck, cards)
    : null;
  const aiPreviewDeck: Pick<Deck, 'name' | 'entries'> | null =
    gameMode !== 'ai'
      ? null
      : aiDeckSource === 'saved'
        ? selectedAiSavedDeck ?? null
        : aiDeckSource === 'generated'
          ? generatedAiDeck
          : selectedOpponentDeck;

  useEffect(() => {
    if (gameMode !== 'ai' || aiDeckSource !== 'opponent') {
      setSelectedOpponentDeck(null);
      setSelectedOpponentDeckError(null);
      return;
    }
    if (!selectedAiOpponent) {
      setSelectedOpponentDeck(null);
      setSelectedOpponentDeckError('Please choose an AI opponent.');
      return;
    }
    try {
      const deck = resolveAiOpponentDeck(selectedAiOpponent, decks, cards);
      setSelectedOpponentDeck(deck);
      setSelectedOpponentDeckError(null);
    } catch (err) {
      setSelectedOpponentDeck(null);
      setSelectedOpponentDeckError(
        err instanceof Error ? err.message : 'Could not load the selected AI opponent deck.',
      );
    }
  }, [aiDeckSource, cards, decks, gameMode, selectedAiOpponent]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function resetGeneratedAiDeck() {
    setGeneratedAiDeck(null);
  }

  function handleGenerateAiDeck() {
    clearMessages();
    try {
      const deck = generateAutoDeck({
        name: aiDeckName,
        difficulty: aiDifficulty,
        style: aiStyle,
        includeLegendary: aiIncludeLegendary,
        cards,
      });
      setGeneratedAiDeck(deck);
      setSuccess(`Generated AI deck "${deck.name}".`);
    } catch (err) {
      setGeneratedAiDeck(null);
      setError(err instanceof Error ? err.message : 'Could not generate AI deck.');
    }
  }

  function handleSaveGeneratedAiDeck() {
    if (!generatedAiDeck || !generatedAiDeckValidation?.valid) {
      setError(generatedAiDeckValidation?.errors[0]?.message ?? 'Generate a legal AI deck first.');
      return;
    }

    try {
      const deck = createDeck(generatedAiDeck);
      saveDeck(deck, cards);
      refreshDeckData();
      setSuccess(`Saved AI deck "${deck.name}".`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save AI deck.');
    }
  }

  function handleStartNewGame() {
    clearMessages();
    const deck1 = decks.find((d) => d.id === deck1Id);
    if (!deck1) {
      setError('Please choose a deck for Player 1.');
      return;
    }

    try {
      const playerCards = loadCards();
      let deck2: Deck;

      if (gameMode === 'local') {
        const selectedDeck2 = decks.find((d) => d.id === deck2Id);
        if (!selectedDeck2) {
          setError('Please choose two decks.');
          return;
        }
        deck2 = selectedDeck2;
      } else if (aiDeckSource === 'saved') {
        if (!selectedAiSavedDeck) {
          setError('Please choose a saved deck for the AI.');
          return;
        }
        deck2 = selectedAiSavedDeck;
      } else if (aiDeckSource === 'generated') {
        if (!generatedAiDeck || !generatedAiDeckValidation?.valid) {
          setError(
            generatedAiDeckValidation?.errors[0]?.message ??
              'Generate a legal AI deck before starting.',
          );
          return;
        }
        deck2 = {
          id: 'generated-ai-deck',
          name: generatedAiDeck.name,
          entries: generatedAiDeck.entries,
        };
      } else {
        if (!selectedAiOpponent) {
          setError('Please choose an AI opponent.');
          return;
        }
        if (!selectedOpponentDeck) {
          setError(selectedOpponentDeckError ?? 'Could not load the selected AI opponent deck.');
          return;
        }
        deck2 = selectedOpponentDeck;
      }

      setGame(createNewGameFromDecks(deck1, deck2, playerCards));
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
          <button
            type="button"
            className="play-menu__btn play-menu__btn--primary"
            onClick={() => {
              clearMessages();
              refreshDeckData();
              setView('setup');
            }}
          >
            New Game
          </button>
          {canContinue && (
            <button type="button" className="play-menu__btn play-menu__btn--continue" onClick={handleContinueLastGame}>
              Continue Last Game
            </button>
          )}
          <button
            type="button"
            className="play-menu__btn"
            onClick={() => {
              clearMessages();
              refreshSaves();
              setView('load');
            }}
          >
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
              onChange={() => {
                clearMessages();
                setGameMode('local');
              }}
            />
            Local PvP
          </label>
          <label>
            <input
              type="radio"
              name="gameMode"
              checked={gameMode === 'ai'}
              onChange={() => {
                clearMessages();
                setGameMode('ai');
              }}
            />
            Player vs AI
          </label>
        </fieldset>

        {gameMode === 'ai' && (
          <p className="play-setup__hint">You are Player 1. The AI is Player 2.</p>
        )}

        {decks.length === 0 ? (
          <p className="play-setup__warn">You need at least 1 saved deck to start a game.</p>
        ) : gameMode === 'local' && decks.length < 2 ? (
          <p className="play-setup__warn">You need at least 2 saved decks for Local PvP.</p>
        ) : (
          <div className="play-setup__form">
            <label>
              Player 1 deck
              <select
                value={deck1Id}
                onChange={(e) => {
                  clearMessages();
                  setDeck1Id(e.target.value);
                }}
              >
                {decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>

            {gameMode === 'local' ? (
              <label>
                Player 2 deck
                <select
                  value={deck2Id}
                  onChange={(e) => {
                    clearMessages();
                    setDeck2Id(e.target.value);
                  }}
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <section className="play-setup__ai-panel">
                <h2>AI Deck</h2>
                <fieldset className="play-setup__mode play-setup__mode--nested">
                  <legend>How should the AI get its deck?</legend>
                  <label>
                    <input
                      type="radio"
                      name="aiDeckSource"
                      checked={aiDeckSource === 'saved'}
                      onChange={() => {
                        clearMessages();
                        setAiDeckSource('saved');
                      }}
                    />
                    Pick a saved deck
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="aiDeckSource"
                      checked={aiDeckSource === 'generated'}
                      onChange={() => {
                        clearMessages();
                        setAiDeckSource('generated');
                      }}
                    />
                    Generate an auto deck
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="aiDeckSource"
                      checked={aiDeckSource === 'opponent'}
                      onChange={() => {
                        clearMessages();
                        setAiDeckSource('opponent');
                      }}
                    />
                    Choose AI Opponent
                  </label>
                </fieldset>

                {aiDeckSource === 'saved' ? (
                  <label>
                    AI saved deck
                    <select
                      value={aiSavedDeckId}
                      onChange={(e) => {
                        clearMessages();
                        setAiSavedDeckId(e.target.value);
                      }}
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                ) : aiDeckSource === 'generated' ? (
                  <div className="play-setup__ai-generator">
                    <label>
                      AI deck name
                      <input
                        type="text"
                        value={aiDeckName}
                        onChange={(e) => {
                          clearMessages();
                          setAiDeckName(e.target.value);
                          resetGeneratedAiDeck();
                        }}
                        placeholder="AI Auto Deck"
                      />
                    </label>
                    <label>
                      Difficulty
                      <select
                        value={aiDifficulty}
                        onChange={(e) => {
                          clearMessages();
                          setAiDifficulty(e.target.value as AutoDeckDifficulty);
                          resetGeneratedAiDeck();
                        }}
                      >
                        {AUTO_DIFFICULTIES.map((difficulty) => (
                          <option key={difficulty} value={difficulty}>
                            {difficulty[0]?.toUpperCase()}
                            {difficulty.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Style
                      <select
                        value={aiStyle}
                        onChange={(e) => {
                          clearMessages();
                          setAiStyle(e.target.value as AutoDeckStyle);
                          resetGeneratedAiDeck();
                        }}
                      >
                        {AUTO_STYLES.map((style) => (
                          <option key={style} value={style}>
                            {labelAutoStyle(style)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="play-setup__checkbox">
                      <span>Include Legendary cards?</span>
                      <input
                        type="checkbox"
                        checked={aiIncludeLegendary}
                        onChange={(e) => {
                          clearMessages();
                          setAiIncludeLegendary(e.target.checked);
                          resetGeneratedAiDeck();
                        }}
                      />
                    </label>
                    <div className="play-setup__ai-actions">
                      <button type="button" className="play-setup__secondary" onClick={handleGenerateAiDeck}>
                        {generatedAiDeck ? 'Regenerate AI Deck' : 'Generate AI Deck'}
                      </button>
                      <button
                        type="button"
                        className="play-setup__secondary"
                        disabled={!generatedAiDeck || !generatedAiDeckValidation?.valid}
                        onClick={handleSaveGeneratedAiDeck}
                      >
                        Save This AI Deck
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="play-setup__ai-generator">
                    <label>
                      AI opponent profile
                      <select
                        value={aiOpponentId}
                        onChange={(e) => {
                          clearMessages();
                          setAiOpponentId(e.target.value);
                        }}
                      >
                        {aiOpponents.length === 0 ? (
                          <option value="">No AI opponents available</option>
                        ) : (
                          aiOpponents.map((opponent) => (
                            <option key={opponent.id} value={opponent.id}>
                              {opponent.name}
                            </option>
                          ))
                        )}
                      </select>
                    </label>
                    {selectedAiOpponent && (
                      <>
                        <div className="play-setup__profile-summary">
                          <strong>{selectedAiOpponent.name}</strong>
                          <span>
                            {selectedAiOpponent.difficulty[0]?.toUpperCase()}
                            {selectedAiOpponent.difficulty.slice(1)} /{' '}
                            {labelAutoStyle(selectedAiOpponent.playStyle)} /{' '}
                            {selectedAiOpponent.deckSource === 'savedDeck'
                              ? 'Saved Deck'
                              : 'Auto Generated'}
                            {selectedAiOpponent.preferredCreatureType
                              ? ` / ${selectedAiOpponent.preferredCreatureType}`
                              : ''}
                          </span>
                          {selectedAiOpponent.catchphrase && (
                            <em>"{selectedAiOpponent.catchphrase}"</em>
                          )}
                        </div>
                        {selectedAiOpponent.portraitImageUrl && (
                          <img
                            src={selectedAiOpponent.portraitImageUrl}
                            alt={`${selectedAiOpponent.name} portrait`}
                            className="play-setup__profile-portrait"
                          />
                        )}
                      </>
                    )}
                    {selectedOpponentDeckError && (
                      <p className="play-setup__warn">{selectedOpponentDeckError}</p>
                    )}
                  </div>
                )}

                {aiPreviewDeck && (
                  <div className="play-setup__preview">
                    <div className="play-setup__preview-header">
                      <div>
                        <h3>{aiPreviewDeck.name}</h3>
                        {aiDeckSource === 'generated' && (
                          <p>
                            {aiDifficulty[0]?.toUpperCase()}
                            {aiDifficulty.slice(1)} / {labelAutoStyle(aiStyle)}
                          </p>
                        )}
                        {aiDeckSource === 'opponent' && selectedAiOpponent && (
                          <p>
                            {selectedAiOpponent.name} /{' '}
                            {selectedAiOpponent.deckSource === 'savedDeck'
                              ? 'Saved Deck'
                              : `${selectedAiOpponent.difficulty[0]?.toUpperCase()}${selectedAiOpponent.difficulty.slice(1)} ${labelAutoStyle(selectedAiOpponent.playStyle)}`}
                            {selectedAiOpponent.preferredCreatureType
                              ? ` / ${selectedAiOpponent.preferredCreatureType}`
                              : ''}
                          </p>
                        )}
                      </div>
                      <strong>{countTotalCards(aiPreviewDeck)} cards</strong>
                    </div>
                    <ul className="play-setup__preview-list" role="list">
                      {aiPreviewDeck.entries.map((entry) => {
                        const card = cardsById.get(entry.cardId);
                        if (!card) return null;
                        return (
                          <li key={entry.cardId} className="play-setup__preview-row">
                            <span>
                              {card.name} ×{entry.count}
                            </span>
                            <span className="play-setup__preview-meta">
                              Cost {card.cost} / {card.attack} ATK / {card.health} HP
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            )}

            <button type="button" className="play-setup__start" onClick={handleStartNewGame}>
              Start Game
            </button>
          </div>
        )}

        {success && <p className="play-success">{success}</p>}
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
