import { DeckBuilder } from '../components/DeckBuilder';

export function DeckBuilderPage() {
  return (
    <div className="page">
      <h1>Deck Builder</h1>
      <p className="page__subtitle">
        Build a deck of 30 cards. Up to 3 copies each — only 1 Legendary!
      </p>
      <DeckBuilder />
    </div>
  );
}
