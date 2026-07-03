import { CardForm } from '../components/CardForm';

export function CardCreatorPage() {
  return (
    <div className="page">
      <h1>Card Creator</h1>
      <p className="page__subtitle">Design a custom card and save it to your library.</p>
      <CardForm />
    </div>
  );
}
