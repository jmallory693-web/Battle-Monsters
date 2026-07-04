import { useState, type FormEvent, type ChangeEvent } from 'react';
import {
  COMMON_CREATURE_TYPES,
  CARD_BACKGROUND_STYLES,
  CARD_BORDER_STYLES,
  createCard,
  CARD_FRAME_THEMES,
  CARD_TEXT_COLORS,
  DEFAULT_CARD_VISUAL_STYLE,
  cardWithId,
  validateCardInput,
  normalizeCardInput,
  normalizeCreatureTypes,
  CARD_LIMITS,
  RARITIES,
  cardToInput,
  type Card,
  type Rarity,
} from '../models/card';
import { saveCard, updateCard } from '../storage/cardStorage';
import { getDecksUsingCard } from '../storage/deckStorage';
import { resizeImageToDataUrl } from '../utils/imageResize';
import { exportCardAsImage } from '../utils/cardImageExport';
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
  creatureTypes: [],
  visualStyle: DEFAULT_CARD_VISUAL_STYLE,
};

interface CardFormProps {
  editingCard?: Card;
  initialCardInput?: CardPreviewData;
  title?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function CardForm({ editingCard, initialCardInput, title, onSaved, onCancel }: CardFormProps) {
  const isEdit = editingCard !== undefined;

  const [form, setForm] = useState<CardPreviewData>(() =>
    editingCard ? cardToInput(editingCard) : initialCardInput ?? EMPTY_FORM,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [customCreatureType, setCustomCreatureType] = useState('');

  let decksUsingCard: ReturnType<typeof getDecksUsingCard> = [];
  let deckUsageError: string | null = null;
  if (isEdit && editingCard) {
    try {
      decksUsingCard = getDecksUsingCard(editingCard.id);
    } catch (err) {
      deckUsageError = err instanceof Error ? err.message : 'Could not load deck usage.';
    }
  }

  function updateField<K extends keyof CardPreviewData>(key: K, value: CardPreviewData[K]) {
    setSuccessMessage(null);
    setErrorMessage(null);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCreatureTypes(nextTypes: string[]) {
    const normalizedTypes = normalizeCreatureTypes(nextTypes);
    const validationErrors = validateCardInput({ ...form, creatureTypes: normalizedTypes }).filter(
      (message) => message.toLowerCase().includes('creature type'),
    );
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors[0]);
      return;
    }
    updateField('creatureTypes', normalizedTypes);
  }

  function toggleCreatureType(type: string) {
    const current = normalizeCreatureTypes(form.creatureTypes);
    if (current.includes(type)) {
      setCreatureTypes(current.filter((existing) => existing !== type));
      return;
    }
    setCreatureTypes([...current, type]);
  }

  function handleAddCustomCreatureType() {
    const trimmed = customCreatureType.trim();
    if (!trimmed) return;
    setCreatureTypes([...(form.creatureTypes ?? []), trimmed]);
    setCustomCreatureType('');
  }

  function removeCreatureType(type: string) {
    setCreatureTypes((form.creatureTypes ?? []).filter((existing) => existing !== type));
  }

  function updateVisualStyle<K extends keyof NonNullable<CardPreviewData['visualStyle']>>(
    key: K,
    value: NonNullable<CardPreviewData['visualStyle']>[K],
  ) {
    updateField('visualStyle', {
      ...(form.visualStyle ?? DEFAULT_CARD_VISUAL_STYLE),
      [key]: value,
    });
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
    setForm(initialCardInput ?? EMPTY_FORM);
    setCustomCreatureType('');
    const input = document.getElementById('card-image-input') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  async function handleExportImage() {
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      await exportCardAsImage(form);
      setSuccessMessage(`Exported "${form.name.trim() || 'Unnamed Card'}" as an image.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not export card image.');
    }
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

    if (deckUsageError) {
      setErrorMessage(deckUsageError);
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
        <h2 className="card-form__title">{isEdit ? 'Edit Card' : title ?? 'New Card'}</h2>

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
        {deckUsageError && !errorMessage && (
          <p className="card-form__message card-form__message--error" role="alert">
            {deckUsageError}
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

        <div className="card-form__field">
          <span>Card style</span>
          <div className="card-form__row">
            <label className="card-form__field">
              <span>Frame theme</span>
              <select
                value={form.visualStyle?.frameTheme ?? DEFAULT_CARD_VISUAL_STYLE.frameTheme}
                onChange={(e) => updateVisualStyle('frameTheme', e.target.value as typeof DEFAULT_CARD_VISUAL_STYLE.frameTheme)}
              >
                {CARD_FRAME_THEMES.map((theme) => (
                  <option key={theme} value={theme}>
                    {theme[0].toUpperCase() + theme.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="card-form__field">
              <span>Background</span>
              <select
                value={
                  form.visualStyle?.backgroundStyle ?? DEFAULT_CARD_VISUAL_STYLE.backgroundStyle
                }
                onChange={(e) =>
                  updateVisualStyle(
                    'backgroundStyle',
                    e.target.value as typeof DEFAULT_CARD_VISUAL_STYLE.backgroundStyle,
                  )
                }
              >
                {CARD_BACKGROUND_STYLES.map((background) => (
                  <option key={background} value={background}>
                    {background === 'rarity'
                      ? 'Match rarity'
                      : background[0].toUpperCase() + background.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="card-form__field">
              <span>Border style</span>
              <select
                value={form.visualStyle?.borderStyle ?? DEFAULT_CARD_VISUAL_STYLE.borderStyle}
                onChange={(e) =>
                  updateVisualStyle(
                    'borderStyle',
                    e.target.value as typeof DEFAULT_CARD_VISUAL_STYLE.borderStyle,
                  )
                }
              >
                {CARD_BORDER_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style[0].toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="card-form__row">
            <label className="card-form__field">
              <span>Text color</span>
              <select
                value={form.visualStyle?.textColor ?? DEFAULT_CARD_VISUAL_STYLE.textColor}
                onChange={(e) =>
                  updateVisualStyle(
                    'textColor',
                    e.target.value as typeof DEFAULT_CARD_VISUAL_STYLE.textColor,
                  )
                }
              >
                {CARD_TEXT_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color[0].toUpperCase() + color.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="card-form__field">
              <span>Collection name (optional)</span>
              <input
                type="text"
                value={form.visualStyle?.collectionName ?? ''}
                onChange={(e) => updateVisualStyle('collectionName', e.target.value)}
                maxLength={CARD_LIMITS.collectionNameMaxLength}
                placeholder="Moonlight Set"
              />
            </label>
            <label className="card-form__field">
              <span>Artist / creator (optional)</span>
              <input
                type="text"
                value={form.visualStyle?.artistName ?? ''}
                onChange={(e) => updateVisualStyle('artistName', e.target.value)}
                maxLength={CARD_LIMITS.artistNameMaxLength}
                placeholder="Your name"
              />
            </label>
          </div>
        </div>

        <div className="card-form__field">
          <span>
            Creature types (optional, up to {CARD_LIMITS.creatureTypesMaxCount})
          </span>
          <div className="card-form__type-picker">
            {COMMON_CREATURE_TYPES.map((type) => {
              const selected = (form.creatureTypes ?? []).includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={`card-form__type-option ${selected ? 'selected' : ''}`.trim()}
                  onClick={() => toggleCreatureType(type)}
                >
                  {type}
                </button>
              );
            })}
          </div>
          <div className="card-form__type-custom">
            <input
              type="text"
              value={customCreatureType}
              onChange={(e) => setCustomCreatureType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomCreatureType();
                }
              }}
              placeholder="Add custom type"
              maxLength={CARD_LIMITS.creatureTypeMaxLength}
            />
            <button type="button" onClick={handleAddCustomCreatureType}>
              Add Type
            </button>
          </div>
          {(form.creatureTypes ?? []).length > 0 && (
            <ul className="card-form__type-tags" role="list">
              {(form.creatureTypes ?? []).map((type) => (
                <li key={type}>
                  <button
                    type="button"
                    className="card-form__type-tag"
                    onClick={() => removeCreatureType(type)}
                  >
                    {type} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-form__buttons">
          <button type="submit" className="card-form__submit" disabled={imageProcessing}>
            {isEdit ? 'Save Changes' : 'Save Card'}
          </button>
          {onCancel && (
            <button type="button" className="card-form__cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <aside className="card-form__preview-panel">
        <h2 className="card-form__title">Preview</h2>
        <CardPreview card={form} />
        <button type="button" className="card-form__export" onClick={() => void handleExportImage()}>
          Export Card as Image
        </button>
      </aside>
    </div>
  );
}
