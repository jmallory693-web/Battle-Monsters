import type { Card } from '../models/card';
import { CardLibraryItem } from './CardLibraryItem';
import './CardGrid.css';

interface CardGridProps {
  cards: Card[];
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
  onDuplicate: (card: Card) => void;
  onExport: (card: Card) => void | Promise<void>;
  emptyMessage?: string;
}

export function CardGrid({
  cards,
  onDelete,
  onEdit,
  onDuplicate,
  onExport,
  emptyMessage,
}: CardGridProps) {
  if (cards.length === 0) {
    return (
      <p className="card-grid__empty">
        {emptyMessage ?? 'No cards yet. Create one in the Card Creator.'}
      </p>
    );
  }

  return (
    <ul className="card-grid" role="list">
      {cards.map((card) => (
        <li key={card.id} className="card-grid__item">
          <CardLibraryItem
            card={card}
            onDelete={onDelete}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onExport={onExport}
          />
        </li>
      ))}
    </ul>
  );
}
