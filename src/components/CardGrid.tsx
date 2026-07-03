import type { Card } from '../models/card';
import { CardLibraryItem } from './CardLibraryItem';
import './CardGrid.css';

interface CardGridProps {
  cards: Card[];
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
}

export function CardGrid({ cards, onDelete, onEdit }: CardGridProps) {
  if (cards.length === 0) {
    return <p className="card-grid__empty">No cards yet. Create one in the Card Creator.</p>;
  }

  return (
    <ul className="card-grid" role="list">
      {cards.map((card) => (
        <li key={card.id} className="card-grid__item">
          <CardLibraryItem card={card} onDelete={onDelete} onEdit={onEdit} />
        </li>
      ))}
    </ul>
  );
}
