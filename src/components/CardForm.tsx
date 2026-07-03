import { useState, type FormEvent, type ChangeEvent } from 'react';
import {
  createCard,
  cardWithId,
  validateCardInput,
  normalizeCardInput,
  CARD_LIMITS,
  RARITIES,
  cardToInput,
  type Card,
  type Rarity,
} from '../models/card';
import { saveCard, updateCard } from '../storage/cardStorage';
import { getDecksUsingCard } from '../storage/deckStorage';
import { resizeImageToDataUrl } from '../utils/imageResize';
import { CardPreview, type CardPreviewData } from './CardPreview';
import './CardForm.css';

const EMPTY_FORM: CardPreviewData = {
  name: '',
  imageUrl: '',
  cost: 0,
  attack: 0,
  health: 1,
  flavorText: '',
  rarity: 'common',
};

interface CardFormProps {
  editingCard?: Card;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function CardForm({ editingCard, onSaved, onCancel }: CardFormProps) {
  const isEdit = editingCard !== undefined;

  const [form, setForm] = useState<CardPreviewData>(() =>
    editingCard ? cardToInput(editingCard) : EMPTY_FORM,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);

  const decksUsingCard =
    isEdit && editingCard ? getDecksUsingCard(editingCard.id) : [];

  function updateField<K extends keyof CardPreviewData>(key: K, value: CardPreviewData[K]) {
    setSuccessMessage(null);
    setErrorMessage(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please choose an image file.');
      return;
    }
    setImageProcessing(true);
    setErrorMessage(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      updateField('imageUrl', dataUrl);
    } catch {
      setErrorMessage('Could not read the image. Try another file.');
    } finally {
      setImageProcessing(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    const input = document.getElementById('card-image-input') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const normalized = normalizeCardInput(form);
    const errors = validateCardInput(normalized);
    if (errors.length > 0) {
      setErrorMessage(errors[0]);
      return;
    }

    if (isEdit && editingCard && decksUsingCard.length > 0) {
      const deckNames = decksUsingCard.map((d) => d.name).join(', ');
      const confirmed = window.confirm(
        `This card is used in ${decksUsingCard.length} deck(s): ${deckNames}.\n\n` +
          'Saving changes will update the card everywhere it appears. Continue?',
      );
      if (!confirmed) return;
    }

    try {
      if (isEdit && editingCard) {
        const updated = cardWithId(editingCard.id, normalized);
        updateCard(updated);
        setSuccessMessage(`"${updated.name}" updated!`);
        onSaved?.();
      } else {
        const card = createCard(normalized);
        saveCard(card);
        setSuccessMessage(`"${card.name}" saved to your library!`);
        resetForm();
        onSaved?.();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save card.');
    }
  }

  return (
    <div className="card-form-layout">
      <form className="card-form" onSubmit={handleSubmit}>
        <h2 className="card-form__title">{isEdit ? 'Edit Card' : 'New Card'}</h2>

        {isEdit && decksUsingCard.length > 0 && (
          <p className="card-form__message card-form__message--warn" role="status">
            Used in {decksUsingCard.length} deck
            {decksUsingCard.length === 1 ? '' : 's'}: {decksUsingCard.map((d) => d.name).join(', ')}
          </p>
        )}

        {successMessage && (
          <p className="card-form__message card-form__message--success" role="status">
            {successMessage}
          </p>
        )}
        {errorMessage && (
          <p className="card-form__message card-form__message--error" role="alert">
            {errorMessage}
          </p>
        )}

        <label className="card-form__field">
          <span>Name *</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            maxLength={CARD_LIMITS.nameMaxLength}
            placeholder="Rainbow Cat"
          />
        </label>

        <label className="card-form__field">
          <span>Image *</span>
          <input
            id="card-image-input"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={imageProcessing}
          />
          {imageProcessing && <span className="card-form__processing">Resizing image…</span>}
          {isEdit && form.imageUrl && !imageProcessing && (
            <span className="card-form__image-ok">Current image saved (upload to replace)</span>
          )}
        </label>

        <div className="card-form__row">
          <label className="card-form__field">
            <span>Cost ({CARD_LIMITS.costMin}–{CARD_LIMITS.costMax})</span>
            <input
              type="number"
              min={CARD_LIMITS.costMin}
              max={CARD_LIMITS.costMax}
              value={form.cost}
              onChange={(e) => updateField('cost', parseInt(e.target.value, 10) || 0)}
            />
          </label>
          <label className="card-form__field">
            <span>Attack ({CARD_LIMITS.attackMin}–{CARD_LIMITS.attackMax})</span>
            <input
              type="number"
              min={CARD_LIMITS.attackMin}
              max={CARD_LIMITS.attackMax}
              value={form.attack}
              onChange={(e) => updateField('attack', parseInt(e.target.value, 10) || 0)}
            />
          </label>
          <label className="card-form__field">
            <span>Health ({CARD_LIMITS.healthMin}–{CARD_LIMITS.healthMax})</span>
            <input
              type="number"
              min={CARD_LIMITS.healthMin}
              max={CARD_LIMITS.healthMax}
              value={form.health}
              onChange={(e) =>
                updateField('health', parseInt(e.target.value, 10) || CARD_LIMITS.healthMin)
              }
            />
          </label>
        </div>

        <label className="card-form__field">
          <span>Flavor text (max {CARD_LIMITS.flavorTextMaxLength} chars)</span>
          <textarea
            value={form.flavorText}
            onChange={(e) => updateField('flavorText', e.target.value)}
            rows={3}
            maxLength={CARD_LIMITS.flavorTextMaxLength}
          />
        </label>

        <label className="card-form__field">
          <span>Rarity</span>
          <select
            value={form.rarity}
            onChange={(e) => updateField('rarity', e.target.value as Rarity)}
          >
            {RARITIES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <div className="card-form__buttons">
          <button type="submit" className="card-form__submit" disabled={imageProcessing}>
            {isEdit ? 'Save Changes' : 'Save Card'}
          </button>
          {isEdit && onCancel && (
            <button type="button" className="card-form__cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <aside className="card-form__preview-panel">
        <h2 className="card-form__title">Preview</h2>
        <CardPreview card={form} />
      </aside>
    </div>
  );
}
