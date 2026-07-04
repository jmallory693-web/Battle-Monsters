import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RARITIES, type Card } from '../models/card';
import { deleteCard, loadCards } from '../storage/cardStorage';
import { CardGrid } from '../components/CardGrid';
import { CardForm } from '../components/CardForm';
import { exportAllCardsAsImages, exportCardAsImage } from '../utils/cardImageExport';
import {
  buildDuplicateCardInput,
  collectCardCreatureTypes,
  filterAndSortCards,
  type CardSortOption,
} from '../utils/cardLibrary';
import './CardLibraryPage.css';

export function CardLibraryPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [duplicateCard, setDuplicateCard] = useState<ReturnType<typeof buildDuplicateCardInput> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rarityFilter, setRarityFilter] = useState<'all' | Card['rarity']>('all');
  const [creatureTypeFilter, setCreatureTypeFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<CardSortOption>('newest');

  const refresh = useCallback(() => {
    try {
      setCards(loadCards());
    } catch (err) {
      setCards([]);
      setEditingCard(null);
      setError(err instanceof Error ? err.message : 'Could not load cards.');
      return;
    }
    setError(null);
  }, []);

  const creatureTypeOptions = useMemo(() => collectCardCreatureTypes(cards), [cards]);
  const visibleCards = useMemo(
    () =>
      filterAndSortCards(cards, {
        searchTerm,
        rarity: rarityFilter,
        creatureType: creatureTypeFilter,
        sortBy,
      }),
    [cards, creatureTypeFilter, rarityFilter, searchTerm, sortBy],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDelete(id: string) {
    try {
      deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      if (editingCard?.id === id) setEditingCard(null);
      setSuccess('Card deleted.');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
      setSuccess(null);
    }
  }

  function handleEdit(card: Card) {
    setEditingCard(card);
    setDuplicateCard(null);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDuplicate(card: Card) {
    setDuplicateCard(buildDuplicateCardInput(card, cards));
    setEditingCard(null);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSaved() {
    refresh();
    setEditingCard(null);
    setDuplicateCard(null);
    setSuccess('Card library updated.');
    setError(null);
  }

  async function handleExportCard(card: Card) {
    try {
      await exportCardAsImage(card);
      setSuccess(`Exported "${card.name}" as an image.`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export card image.');
      setSuccess(null);
    }
  }

  async function handleExportAllImages() {
    if (cards.length === 0) return;
    try {
      const exported = await exportAllCardsAsImages(cards);
      setSuccess(`Exported ${exported} card image(s).`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export card images.');
      setSuccess(null);
    }
  }

  return (
    <div className="page">
      <div className="page__header-row">
        <div>
          <h1>Card Library</h1>
          <p className="page__subtitle">
            {visibleCards.length}
            {visibleCards.length !== cards.length ? ` of ${cards.length}` : ''} card
            {visibleCards.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="card-library-page__header-actions">
          <button
            type="button"
            className="page__link-button"
            onClick={() => void handleExportAllImages()}
            disabled={cards.length === 0}
          >
            Export All Cards as Images
          </button>
          <Link to="/creator" className="page__link-button">
            + New Card
          </Link>
        </div>
      </div>

      <section className="card-library-controls">
        <label>
          Search by name
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search cards..."
          />
        </label>
        <label>
          Rarity
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as 'all' | Card['rarity'])}
          >
            <option value="all">All rarities</option>
            {RARITIES.map((rarity) => (
              <option key={rarity} value={rarity}>
                {rarity[0].toUpperCase() + rarity.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Creature type
          <select
            value={creatureTypeFilter}
            onChange={(e) => setCreatureTypeFilter(e.target.value)}
          >
            <option value="all">All types</option>
            {creatureTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort by
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as CardSortOption)}>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="rarity">Rarity</option>
            <option value="cost">Cost</option>
            <option value="attack">Attack</option>
            <option value="health">Health</option>
          </select>
        </label>
      </section>

      {(editingCard || duplicateCard) && (
        <section className="library-edit-panel">
          <CardForm
            key={editingCard ? editingCard.id : duplicateCard?.name}
            editingCard={editingCard ?? undefined}
            initialCardInput={duplicateCard ?? undefined}
            title={duplicateCard ? 'Duplicate Card' : undefined}
            onSaved={handleSaved}
            onCancel={() => {
              setEditingCard(null);
              setDuplicateCard(null);
            }}
          />
        </section>
      )}

      {error && <p className="play-error">{error}</p>}
      {success && <p className="play-success">{success}</p>}
      <CardGrid
        cards={visibleCards}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onExport={handleExportCard}
        emptyMessage={
          cards.length === 0 ? 'No cards yet. Create one in the Card Creator.' : 'No cards match your filters.'
        }
      />
    </div>
  );
}
