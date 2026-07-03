import { useCallback, useRef, useState } from 'react';
import { COMMON_CREATURE_TYPES, type Card } from '../models/card';
import {
  createDeck,
  countTotalCards,
  validateDeckLegality,
  DECK_SIZE,
  MAX_COPIES_DEFAULT,
  MAX_COPIES_LEGENDARY,
  type DeckEntry,
  type NewDeck,
} from '../models/deck';
import type { Deck } from '../models/deck';
import {
  generateAutoDeck,
  validateGeneratedDeck,
  type AutoDeckDifficulty,
  type AutoDeckStyle,
} from '../engine/autoDeckBuilder';
import { loadCards } from '../storage/cardStorage';
import { loadDecks, saveDeck, deleteDeck } from '../storage/deckStorage';
import {
  exportDeck,
  exportAllDecks,
  importDeckFile,
  importDeckCollectionFile,
  downloadJsonFile,
  readJsonUpload,
  deckExportFilename,
  ALL_DECKS_FILENAME,
  formatImportResultMessage,
} from '../storage/deckImportExport';
import { CardPreview } from './CardPreview';
import './DeckBuilder.css';

function maxCopies(card: Card): number {
  return card.rarity === 'legendary' ? MAX_COPIES_LEGENDARY : MAX_COPIES_DEFAULT;
}

function getCount(entries: DeckEntry[], cardId: string): number {
  return entries.find((e) => e.cardId === cardId)?.count ?? 0;
}

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

export function DeckBuilder() {
  const [cards, setCards] = useState<Card[]>(() => loadCards());
  const [savedDecks, setSavedDecks] = useState<Deck[]>(() => loadDecks());
  const [deckName, setDeckName] = useState('');
  const [entries, setEntries] = useState<DeckEntry[]>([]);
  const [autoDeckName, setAutoDeckName] = useState('Auto Deck');
  const [autoDifficulty, setAutoDifficulty] = useState<AutoDeckDifficulty>('normal');
  const [autoStyle, setAutoStyle] = useState<AutoDeckStyle>('balanced');
  const [includeLegendary, setIncludeLegendary] = useState(true);
  const [preferredCreatureType, setPreferredCreatureType] = useState('');
  const [generatedDeck, setGeneratedDeck] = useState<NewDeck | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importDeckInputRef = useRef<HTMLInputElement>(null);
  const importCollectionInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setCards(loadCards());
    setSavedDecks(loadDecks());
    setGeneratedDeck(null);
  }, []);

  const total = countTotalCards({ entries });
  const validation = validateDeckLegality(
    { name: deckName, entries },
    cards,
  );
  const generatedValidation = generatedDeck ? validateGeneratedDeck(generatedDeck, cards) : null;

  function clearMessages() {
    setSuccess(null);
    setError(null);
  }

  function addCard(cardId: string) {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const current = getCount(entries, cardId);
    if (total >= DECK_SIZE || current >= maxCopies(card)) return;
    setEntries((prev) => {
      const existing = prev.find((e) => e.cardId === cardId);
      if (existing) {
        return prev.map((e) => (e.cardId === cardId ? { ...e, count: e.count + 1 } : e));
      }
      return [...prev, { cardId, count: 1 }];
    });
    clearMessages();
  }

  function removeCard(cardId: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.cardId === cardId);
      if (!entry) return prev;
      if (entry.count <= 1) return prev.filter((e) => e.cardId !== cardId);
      return prev.map((e) => (e.cardId === cardId ? { ...e, count: e.count - 1 } : e));
    });
    clearMessages();
  }

  function handleSave() {
    if (!validation.valid) {
      setError(validation.errors[0]?.message ?? 'Deck is not legal.');
      return;
    }
    try {
      const deck = createDeck({ name: deckName, entries });
      saveDeck(deck, cards);
      setSuccess(`"${deck.name}" saved!`);
      setDeckName('');
      setEntries([]);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save deck.');
    }
  }

  function updateAutoDeckName(value: string) {
    setAutoDeckName(value);
    setGeneratedDeck(null);
    clearMessages();
  }

  function updateAutoDifficulty(value: AutoDeckDifficulty) {
    setAutoDifficulty(value);
    setGeneratedDeck(null);
    clearMessages();
  }

  function updateAutoStyle(value: AutoDeckStyle) {
    setAutoStyle(value);
    setGeneratedDeck(null);
    clearMessages();
  }

  function updateIncludeLegendary(value: boolean) {
    setIncludeLegendary(value);
    setGeneratedDeck(null);
    clearMessages();
  }

  function updatePreferredCreatureType(value: string) {
    setPreferredCreatureType(value);
    setGeneratedDeck(null);
    clearMessages();
  }

  function handleGenerateAutoDeck() {
    clearMessages();
    try {
      const deck = generateAutoDeck({
        name: autoDeckName,
        difficulty: autoDifficulty,
        style: autoStyle,
        includeLegendary,
        preferredCreatureType: preferredCreatureType || undefined,
        cards,
      });
      setGeneratedDeck(deck);
      setSuccess(`Generated "${deck.name}". Review it, then save or regenerate.`);
    } catch (err) {
      setGeneratedDeck(null);
      setError(err instanceof Error ? err.message : 'Could not generate a deck.');
    }
  }

  function handleSaveGeneratedDeck() {
    if (!generatedDeck || !generatedValidation?.valid) {
      setError(generatedValidation?.errors[0]?.message ?? 'Generate a legal deck first.');
      return;
    }

    try {
      const deck = createDeck(generatedDeck);
      saveDeck(deck, cards);
      refresh();
      setSuccess(`"${deck.name}" saved!`);
      setAutoDeckName('Auto Deck');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save generated deck.');
    }
  }

  function handleExportDeck(deckId: string) {
    try {
      const data = exportDeck(deckId);
      downloadJsonFile(deckExportFilename(data.deck.name), data);
      setSuccess(`Exported "${data.deck.name}".`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  function handleExportAll() {
    try {
      const data = exportAllDecks();
      downloadJsonFile(ALL_DECKS_FILENAME, data);
      setSuccess(`Exported ${data.decks.length} deck(s).`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed.');
    }
  }

  function handleCardConflict(existing: Card, _incoming: Card): 'skip' | 'overwrite' {
    const overwrite = window.confirm(
      `Card "${existing.name}" already exists with different data.\n\nOverwrite with imported version?`,
    );
    return overwrite ? 'overwrite' : 'skip';
  }

  async function handleImportFile(file: File, mode: 'deck' | 'collection') {
    clearMessages();
    try {
      const text = await readJsonUpload(file);
      const result =
        mode === 'deck'
          ? importDeckFile(text, { onCardConflict: handleCardConflict })
          : importDeckCollectionFile(text, { onCardConflict: handleCardConflict });
      refresh();
      setSuccess(formatImportResultMessage(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  }

  function handleDeleteDeck(deckId: string, name: string) {
    if (!window.confirm(`Delete deck "${name}"?`)) return;
    try {
      deleteDeck(deckId);
      refresh();
      setSuccess(`Deleted "${name}".`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (cards.length === 0) {
    return <p className="deck-builder__empty">Create some cards first!</p>;
  }

  const cardsById = new Map(cards.map((c) => [c.id, c]));

  return (
    <div className="deck-builder-page">
      <section className="deck-io-panel">
        <h2>Import / Export</h2>
        <p className="deck-io-panel__hint">
          Save decks as files to move them to another computer or restore after clearing browser data.
        </p>
        <div className="deck-io-panel__actions">
          <button type="button" className="deck-io-btn" onClick={handleExportAll}>
            Export All Decks
          </button>
          <button
            type="button"
            className="deck-io-btn"
            onClick={() => importDeckInputRef.current?.click()}
          >
            Import Deck
          </button>
          <button
            type="button"
            className="deck-io-btn"
            onClick={() => importCollectionInputRef.current?.click()}
          >
            Import Deck Collection
          </button>
        </div>
        <input
          ref={importDeckInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file, 'deck');
            e.target.value = '';
          }}
        />
        <input
          ref={importCollectionInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file, 'collection');
            e.target.value = '';
          }}
        />
        {success && <p className="play-success">{success}</p>}
        {error && <p className="play-error">{error}</p>}
      </section>

      <section className="auto-deck-panel">
        <h2>Auto Deck Maker</h2>
        <p className="deck-io-panel__hint">
          Generate a legal 30-card deck from your current card library, then preview it before saving.
        </p>
        <div className="auto-deck-panel__grid">
          <label>
            Deck name
            <input
              value={autoDeckName}
              onChange={(e) => updateAutoDeckName(e.target.value)}
              placeholder="Auto Deck"
            />
          </label>
          <label>
            Difficulty
            <select
              value={autoDifficulty}
              onChange={(e) => updateAutoDifficulty(e.target.value as AutoDeckDifficulty)}
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
              value={autoStyle}
              onChange={(e) => updateAutoStyle(e.target.value as AutoDeckStyle)}
            >
              {AUTO_STYLES.map((style) => (
                <option key={style} value={style}>
                  {labelAutoStyle(style)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preferred Creature Type
            <select
              value={preferredCreatureType}
              onChange={(e) => updatePreferredCreatureType(e.target.value)}
            >
              <option value="">Any</option>
              {COMMON_CREATURE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="auto-deck-panel__checkbox">
            <span>Include Legendary cards?</span>
            <input
              type="checkbox"
              checked={includeLegendary}
              onChange={(e) => updateIncludeLegendary(e.target.checked)}
            />
          </label>
        </div>
        <div className="deck-io-panel__actions">
          <button type="button" className="deck-io-btn" onClick={handleGenerateAutoDeck}>
            Generate Deck
          </button>
          {generatedDeck && (
            <button type="button" className="deck-io-btn" onClick={handleGenerateAutoDeck}>
              Regenerate
            </button>
          )}
        </div>

        {generatedDeck && (
          <div className="auto-deck-panel__preview">
            <div className="auto-deck-panel__preview-header">
              <div>
                <h3>{generatedDeck.name}</h3>
                <p>
                  {autoDifficulty[0]?.toUpperCase()}
                  {autoDifficulty.slice(1)} / {labelAutoStyle(autoStyle)}
                  {preferredCreatureType ? ` / ${preferredCreatureType}` : ''}
                </p>
              </div>
              <strong>{countTotalCards(generatedDeck)} / 30 cards</strong>
            </div>
            <ul className="auto-deck-panel__list" role="list">
              {generatedDeck.entries.map((entry) => {
                const card = cardsById.get(entry.cardId);
                if (!card) return null;
                return (
                  <li key={entry.cardId} className="auto-deck-panel__row">
                    <span>
                      {card.name} ×{entry.count}
                    </span>
                    <span className="auto-deck-panel__meta">
                      Cost {card.cost} / {card.attack} ATK / {card.health} HP
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="deck-io-panel__actions">
              <button
                type="button"
                className="deck-io-btn"
                disabled={!generatedValidation?.valid}
                onClick={handleSaveGeneratedDeck}
              >
                Save Generated Deck
              </button>
            </div>
          </div>
        )}
      </section>

      {savedDecks.length > 0 && (
        <section className="deck-saved-list">
          <h2>Saved Decks ({savedDecks.length})</h2>
          <ul className="deck-saved-list__items" role="list">
            {savedDecks.map((deck) => (
              <li key={deck.id} className="deck-saved-list__row">
                <span>
                  <strong>{deck.name}</strong>
                  <span className="deck-saved-list__count">
                    {' '}
                    — {countTotalCards(deck)} cards
                  </span>
                </span>
                <span className="deck-saved-list__buttons">
                  <button type="button" onClick={() => handleExportDeck(deck.id)}>
                    Export
                  </button>
                  <button
                    type="button"
                    className="deck-saved-list__delete"
                    onClick={() => handleDeleteDeck(deck.id, deck.name)}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="deck-builder">
        <section className="deck-builder__library">
          <h2>Pick your cards</h2>
          <ul className="deck-builder__grid" role="list">
            {cards.map((card) => {
              const inDeck = getCount(entries, card.id);
              const max = maxCopies(card);
              const canAdd = inDeck < max && total < DECK_SIZE;
              return (
                <li key={card.id} className="deck-builder__card">
                  <CardPreview card={card} />
                  {inDeck > 0 && <p>In deck: {inDeck}</p>}
                  <button type="button" disabled={!canAdd} onClick={() => addCard(card.id)}>
                    {canAdd ? '+ Add' : inDeck >= max ? 'Max' : 'Deck full'}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="deck-sidebar">
          <h2>Your Deck</h2>
          <label>
            Deck name
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="My Deck"
            />
          </label>
          <p className={`deck-sidebar__progress ${total === DECK_SIZE ? 'ready' : ''}`}>
            {total} / {DECK_SIZE} cards
          </p>
          <ul className="deck-sidebar__list" role="list">
            {entries.length === 0 ? (
              <li className="deck-sidebar__empty">No cards yet</li>
            ) : (
              entries.map((entry) => {
                const card = cardsById.get(entry.cardId);
                if (!card) return null;
                return (
                  <li key={entry.cardId} className="deck-sidebar__row">
                    <span>
                      {card.name} ×{entry.count}
                    </span>
                    <button type="button" onClick={() => removeCard(entry.cardId)}>
                      −
                    </button>
                  </li>
                );
              })
            )}
          </ul>
          <button
            type="button"
            className="deck-sidebar__save"
            disabled={!validation.valid}
            onClick={handleSave}
          >
            Save Deck
          </button>
        </aside>
      </div>
    </div>
  );
}
