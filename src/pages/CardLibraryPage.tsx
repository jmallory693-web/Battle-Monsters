import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '../models/card';
import { deleteCard, loadCards } from '../storage/cardStorage';
import { CardGrid } from '../components/CardGrid';
import { CardForm } from '../components/CardForm';

export function CardLibraryPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => setCards(loadCards()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDelete(id: string) {
    try {
      deleteCard(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
      if (editingCard?.id === id) setEditingCard(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  function handleEdit(card: Card) {
    setEditingCard(card);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSaved() {
    refresh();
    setEditingCard(null);
  }

  return (
    <div className="page">
      <div className="page__header-row">
        <div>
          <h1>Card Library</h1>
          <p className="page__subtitle">{cards.length} card{cards.length === 1 ? '' : 's'}</p>
        </div>
        <Link to="/creator" className="page__link-button">
          + New Card
        </Link>
      </div>

      {editingCard && (
        <section className="library-edit-panel">
          <CardForm
            key={editingCard.id}
            editingCard={editingCard}
            onSaved={handleSaved}
            onCancel={() => setEditingCard(null)}
          />
        </section>
      )}

      {error && <p className="play-error">{error}</p>}
      <CardGrid cards={cards} onDelete={handleDelete} onEdit={handleEdit} />
    </div>
  );
}
