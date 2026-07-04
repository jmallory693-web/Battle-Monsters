import type { Card } from '../models/card';
import { loadCards } from './cardStorage';
import { parseStoredAiOpponents } from './aiOpponentStorage';
import { parseStoredCards } from './cardStorage';
import { parseStoredDecks } from './deckStorage';
import { parseStoredSaves } from './gameSaveStorage';
import {
  getManagedStorageKeys,
  readAppStorageSnapshot,
  replaceAppStorageSnapshot,
} from './localStorageSafety';
import { parseStoredTournaments } from './tournamentStorage';

export const BACKUP_EXPORT_VERSION = 1;
export const ALL_CARDS_FILENAME = 'battle-monsters-all-cards.json';
export const ALL_DATA_BACKUP_FILENAME = 'battle-monsters-full-backup.json';
const CARDS_KEY = 'battle-monsters:cards';
const DECKS_KEY = 'battle-monsters:decks';
const AI_OPPONENTS_KEY = 'battle-monsters:ai-opponents';
const TOURNAMENTS_KEY = 'battle-monsters:tournaments';
const SAVES_KEY = 'battle-monsters:game-saves';
const LAST_SAVE_ID_KEY = 'battle-monsters:last-save-id';

export interface CardLibraryExportFile {
  exportVersion: number;
  exportedAt: string;
  type: 'battle-monsters-card-library';
  cards: Card[];
}

export interface FullDataBackupFile {
  exportVersion: number;
  exportedAt: string;
  type: 'battle-monsters-full-backup';
  storage: Record<string, string>;
}

export interface BackupRestorePreview {
  cards: number;
  decks: number;
  aiOpponents: number;
  tournaments: number;
  saves: number;
}

export interface ParsedFullDataBackup extends FullDataBackupFile {
  preview: BackupRestorePreview;
}

function buildExportTimestamp(): string {
  return new Date().toISOString();
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON.');
  }
}

function parseStoredJsonString(raw: string, label: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Backup contains invalid ${label} data.`);
  }
}

function createEmptyPreview(): BackupRestorePreview {
  return {
    cards: 0,
    decks: 0,
    aiOpponents: 0,
    tournaments: 0,
    saves: 0,
  };
}

function normalizeBackupStorage(storage: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const storageKey of getManagedStorageKeys()) {
    if (typeof storage[storageKey] === 'string') {
      normalized[storageKey] = storage[storageKey];
    }
  }
  return normalized;
}

function validateBackupStorage(storage: Record<string, string>): BackupRestorePreview {
  const preview = createEmptyPreview();

  if (Object.prototype.hasOwnProperty.call(storage, CARDS_KEY)) {
    preview.cards = parseStoredCards(parseStoredJsonString(storage[CARDS_KEY]!, 'card library')).length;
  }
  if (Object.prototype.hasOwnProperty.call(storage, DECKS_KEY)) {
    preview.decks = parseStoredDecks(parseStoredJsonString(storage[DECKS_KEY]!, 'deck')).length;
  }
  if (Object.prototype.hasOwnProperty.call(storage, AI_OPPONENTS_KEY)) {
    preview.aiOpponents = parseStoredAiOpponents(
      parseStoredJsonString(storage[AI_OPPONENTS_KEY]!, 'AI opponent'),
    ).length;
  }
  if (Object.prototype.hasOwnProperty.call(storage, TOURNAMENTS_KEY)) {
    preview.tournaments = parseStoredTournaments(
      parseStoredJsonString(storage[TOURNAMENTS_KEY]!, 'tournament'),
    ).length;
  }
  if (Object.prototype.hasOwnProperty.call(storage, SAVES_KEY)) {
    preview.saves = parseStoredSaves(parseStoredJsonString(storage[SAVES_KEY]!, 'saved game')).length;
  }
  if (
    Object.prototype.hasOwnProperty.call(storage, LAST_SAVE_ID_KEY) &&
    typeof storage[LAST_SAVE_ID_KEY] !== 'string'
  ) {
    throw new Error('Backup contains an invalid last save pointer.');
  }

  return preview;
}

export function exportAllCards(): CardLibraryExportFile {
  return {
    exportVersion: BACKUP_EXPORT_VERSION,
    exportedAt: buildExportTimestamp(),
    type: 'battle-monsters-card-library',
    cards: loadCards(),
  };
}

export function backupAllData(): FullDataBackupFile {
  return {
    exportVersion: BACKUP_EXPORT_VERSION,
    exportedAt: buildExportTimestamp(),
    type: 'battle-monsters-full-backup',
    storage: readAppStorageSnapshot(),
  };
}

export function parseFullDataBackup(jsonText: string): ParsedFullDataBackup {
  const parsed = parseJson(jsonText);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Backup file must be a JSON object.');
  }

  const backup = parsed as Record<string, unknown>;
  if (backup.exportVersion !== BACKUP_EXPORT_VERSION) {
    throw new Error(`Unsupported backup exportVersion (expected ${BACKUP_EXPORT_VERSION}).`);
  }
  if (backup.type !== 'battle-monsters-full-backup') {
    throw new Error('Invalid backup type.');
  }
  if (typeof backup.exportedAt !== 'string') {
    throw new Error('Backup is missing exportedAt.');
  }
  if (!backup.storage || typeof backup.storage !== 'object' || Array.isArray(backup.storage)) {
    throw new Error('Backup must include a storage object.');
  }

  const rawStorage = backup.storage as Record<string, unknown>;
  const stringStorage: Record<string, string> = {};
  for (const [storageKey, value] of Object.entries(rawStorage)) {
    if (typeof value !== 'string') {
      throw new Error(`Backup storage entry "${storageKey}" must be a string.`);
    }
    stringStorage[storageKey] = value;
  }

  const normalizedStorage = normalizeBackupStorage(stringStorage);
  const preview = validateBackupStorage(normalizedStorage);

  return {
    exportVersion: BACKUP_EXPORT_VERSION,
    exportedAt: backup.exportedAt,
    type: 'battle-monsters-full-backup',
    storage: normalizedStorage,
    preview,
  };
}

export function restoreFullDataBackup(backup: ParsedFullDataBackup): BackupRestorePreview {
  replaceAppStorageSnapshot(backup.storage);
  return backup.preview;
}
