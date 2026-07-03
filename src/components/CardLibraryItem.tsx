import type { Card } from '../models/card';
import { CardPreview } from './CardPreview';
import './CardLibraryItem.css';

interface CardLibraryItemProps {
  card: Card;
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
}

export function CardLibraryItem({ card, onDelete, onEdit }: CardLibraryItemProps) {
  return (
    <div className="card-library-item">
      <CardPreview card={card} />
      <div className="card-library-item__actions">
        <button type="button" className="card-library-item__edit" onClick={() => onEdit(card)}>
          Edit
        </button>
        <button
          type="button"
          className="card-library-item__delete"
          onClick={() => {
            if (window.confirm(`Delete "${card.name}"?`)) onDelete(card.id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
