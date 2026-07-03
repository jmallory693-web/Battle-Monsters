import { useCallback, useRef, useState } from 'react';
import type { Card } from '../models/card';
import {
  createDeck,
  countTotalCards,
  validateDeckLegality,
  DECK_SIZE,
  MAX_COPIES_DEFAULT,
  MAX_COPIES_LEGENDARY,
  type DeckEntry,
} from '../models/deck';
import type { Deck } from '../models/deck';
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

export function DeckBuilder() {
  const [cards, setCards] = useState<Card[]>(() => loadCards());
  const [savedDecks, setSavedDecks] = useState<Deck[]>(() => loadDecks());
  const [deckName, setDeckName] = useState('');
  const [entries, setEntries] = useState<DeckEntry[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importDeckInputRef = useRef<HTMLInputElement>(null);
  const importCollectionInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setCards(loadCards());
    setSavedDecks(loadDecks());
  }, []);

  const total = countTotalCards({ entries });
  const validation = validateDeckLegality(
    { name: deckName, entries },
    cards,
  );

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

      {savedDecks.length > 0 && (
        <section className="deck-saved-list">
          <h2>Saved Decks</h2>
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
