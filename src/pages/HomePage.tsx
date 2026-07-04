import { useRef, useState } from 'react';
import {
  ALL_CARDS_FILENAME,
  ALL_DATA_BACKUP_FILENAME,
  backupAllData,
  exportAllCards,
  parseFullDataBackup,
  restoreFullDataBackup,
  type ParsedFullDataBackup,
} from '../storage/dataBackup';
import { downloadJsonFile, readJsonUpload } from '../storage/deckImportExport';

export function HomePage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<ParsedFullDataBackup | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  function handleExportAllCards() {
    try {
      const data = exportAllCards();
      downloadJsonFile(ALL_CARDS_FILENAME, data);
      setSuccess(`Exported ${data.cards.length} card(s).`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export cards.');
      setSuccess(null);
    }
  }

  function handleBackupAllData() {
    try {
      const data = backupAllData();
      downloadJsonFile(ALL_DATA_BACKUP_FILENAME, data);
      setSuccess(`Backed up ${Object.keys(data.storage).length} saved storage item(s).`);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not back up data.');
      setSuccess(null);
    }
  }

  async function handleRestoreFile(file: File) {
    try {
      const text = await readJsonUpload(file);
      const backup = parseFullDataBackup(text);
      setPendingRestore(backup);
      setSuccess(null);
      setError(null);
    } catch (err) {
      setPendingRestore(null);
      setError(err instanceof Error ? err.message : 'Could not read the backup file.');
      setSuccess(null);
    }
  }

  function handleConfirmRestore() {
    if (!pendingRestore) return;
    const confirmed = window.confirm(
      'Restore this backup and replace the current browser data for cards, decks, AI opponents, tournaments, and saves?',
    );
    if (!confirmed) return;

    try {
      const preview = restoreFullDataBackup(pendingRestore);
      setSuccess(
        `Restore complete: ${preview.cards} card(s), ${preview.decks} deck(s), ` +
          `${preview.aiOpponents} AI opponent(s), ${preview.tournaments} tournament(s), and ` +
          `${preview.saves} save(s) restored.`,
      );
      setError(null);
      setPendingRestore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore the backup.');
      setSuccess(null);
    }
  }

  return (
    <div className="page">
      <h1>Battle Monsters</h1>
      <p>Create custom cards, build decks, and battle locally.</p>

      <section className="home-backup-panel">
        <h2>Protect Your Cards</h2>
        <p className="page__subtitle">
          Export your card library and full browser data regularly, especially after adding new art.
        </p>
        <div className="home-backup-panel__actions">
          <button type="button" className="page__link-button" onClick={handleExportAllCards}>
            Export All Cards
          </button>
          <button type="button" className="page__link-button" onClick={handleBackupAllData}>
            Backup All Data
          </button>
          <button
            type="button"
            className="page__link-button"
            onClick={() => restoreInputRef.current?.click()}
          >
            Restore Backup
          </button>
        </div>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleRestoreFile(file);
            e.target.value = '';
          }}
        />
        {pendingRestore && (
          <div className="home-restore-preview">
            <h3>Restore Preview</h3>
            <p className="home-restore-preview__meta">Backup date: {pendingRestore.exportedAt}</p>
            <ul className="home-restore-preview__list" role="list">
              <li>Cards: {pendingRestore.preview.cards}</li>
              <li>Decks: {pendingRestore.preview.decks}</li>
              <li>AI Opponents: {pendingRestore.preview.aiOpponents}</li>
              <li>Tournaments: {pendingRestore.preview.tournaments}</li>
              <li>Saves: {pendingRestore.preview.saves}</li>
            </ul>
            <p className="home-restore-preview__warning">
              Confirming will replace the current browser data for all supported storage keys.
            </p>
            <div className="home-backup-panel__actions">
              <button type="button" className="page__link-button" onClick={handleConfirmRestore}>
                Confirm Restore
              </button>
              <button
                type="button"
                className="home-restore-preview__cancel"
                onClick={() => setPendingRestore(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {success && <p className="page__success">{success}</p>}
        {error && <p className="page__error">{error}</p>}
      </section>
    </div>
  );
}
