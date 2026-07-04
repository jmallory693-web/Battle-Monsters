import type { Card } from '../models/card';
import { CardPreview } from './CardPreview';
import './CardLibraryItem.css';

interface CardLibraryItemProps {
  card: Card;
  onDelete: (id: string) => void;
  onEdit: (card: Card) => void;
  onDuplicate: (card: Card) => void;
  onExport: (card: Card) => void | Promise<void>;
}

export function CardLibraryItem({ card, onDelete, onEdit, onDuplicate, onExport }: CardLibraryItemProps) {
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
        <button type="button" className="card-library-item__duplicate" onClick={() => onDuplicate(card)}>
          Duplicate
        </button>
        <button type="button" className="card-library-item__export" onClick={() => void onExport(card)}>
          Export Image
        </button>
      </div>
    </div>
  );
}
