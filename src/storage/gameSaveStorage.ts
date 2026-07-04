import {
  type GameMode,
  type GameState,
  type SavedGame,
  type SavedGameMeta,
  isGameState,
} from '../engine/gameState';
import { readStoredJson, writeStoredJson, writeStoredString } from './localStorageSafety';

const SAVES_KEY = 'battle-monsters:game-saves';
const LAST_SAVE_ID_KEY = 'battle-monsters:last-save-id';

function isGameMode(value: unknown): value is GameMode {
  return value === 'local' || value === 'ai';
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.savedAt === 'string' &&
    typeof v.turnNumber === 'number' &&
    typeof v.player1Health === 'number' &&
    typeof v.player2Health === 'number' &&
    (v.activePlayerIndex === 0 || v.activePlayerIndex === 1) &&
    isGameMode(v.gameMode) &&
    isGameState(v.gameState)
  );
}

export function parseStoredSaves(value: unknown): SavedGame[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected a saved game array.');
  }
  return value.map((item, index) => {
    if (!isSavedGame(item)) {
      throw new Error(`Saved game ${index + 1} is invalid.`);
    }
    return item;
  });
}

function readRaw(): SavedGame[] {
  return readStoredJson({
    storageKey: SAVES_KEY,
    entityName: 'saved games',
    createEmpty: () => [],
    parse: parseStoredSaves,
  });
}

function writeAll(saves: SavedGame[]): void {
  writeStoredJson(SAVES_KEY, saves, 'saved games');
}

function readLastSaveId(): string | null {
  return localStorage.getItem(LAST_SAVE_ID_KEY);
}

function buildMeta(
  gameState: GameState,
  name: string,
  gameMode: GameMode,
  id?: string,
): SavedGameMeta {
  return {
    id: id ?? crypto.randomUUID(),
    name: name.trim() || 'Untitled Save',
    savedAt: new Date().toISOString(),
    turnNumber: gameState.turnNumber,
    player1Health: gameState.players[0].health,
    player2Health: gameState.players[1].health,
    activePlayerIndex: gameState.activePlayerIndex,
    gameMode,
  };
}

export function saveGame(
  gameState: GameState,
  name: string,
  gameMode: GameMode,
  existingId?: string,
): SavedGame {
  const saves = readRaw();
  const meta = buildMeta(gameState, name, gameMode, existingId);

  const saved: SavedGame = { ...meta, gameState };

  const index = saves.findIndex((s) => s.id === saved.id);
  if (index >= 0) {
    saves[index] = saved;
  } else {
    saves.push(saved);
  }

  writeAll(saves);
  writeStoredString(LAST_SAVE_ID_KEY, saved.id, 'last save pointer');
  return saved;
}

export function loadAllSaves(): SavedGame[] {
  return readRaw().sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  );
}

export function loadSaveById(id: string): SavedGame | undefined {
  return readRaw().find((s) => s.id === id);
}

export function deleteSave(id: string): void {
  const saves = readRaw();
  const next = saves.filter((s) => s.id !== id);
  if (next.length === saves.length) {
    throw new Error(`Save with id "${id}" not found.`);
  }
  writeAll(next);

  const lastId = readLastSaveId();
  if (lastId === id) {
    localStorage.removeItem(LAST_SAVE_ID_KEY);
  }
}

export function getLastSaveId(): string | null {
  return readLastSaveId();
}

export function getLastSave(): SavedGame | undefined {
  const id = getLastSaveId();
  if (!id) return undefined;
  return loadSaveById(id);
}

export function hasLastSave(): boolean {
  const last = getLastSave();
  return last !== undefined && last.gameState.winner === null;
}

export function listSaveMeta(): SavedGameMeta[] {
  return loadAllSaves().map(({ gameState: _, ...meta }) => meta);
}
