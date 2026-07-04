const RECOVERY_PREFIX = 'battle-monsters:recovery:';

export const PRIMARY_STORAGE_KEYS = [
  'battle-monsters:cards',
  'battle-monsters:decks',
  'battle-monsters:ai-opponents',
  'battle-monsters:tournaments',
  'battle-monsters:game-saves',
  'battle-monsters:last-save-id',
] as const;

export function getManagedStorageKeys(): string[] {
  return [
    ...PRIMARY_STORAGE_KEYS,
    ...PRIMARY_STORAGE_KEYS.map((storageKey) => getRecoveryKey(storageKey)),
  ];
}

export interface StoredRecoverySnapshot {
  sourceKey: string;
  failedAt: string;
  reason: string;
  raw: string;
}

interface ReadStoredJsonOptions<T> {
  storageKey: string;
  entityName: string;
  createEmpty: () => T;
  parse: (value: unknown) => T;
}

export function getRecoveryKey(storageKey: string): string {
  return `${RECOVERY_PREFIX}${storageKey}`;
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const domException = typeof DOMException !== 'undefined' ? DOMException : undefined;
  if (domException && error instanceof domException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }

  const candidate = error as { name?: unknown; code?: unknown };
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}

function preserveRecoverySnapshot(
  storageKey: string,
  raw: string,
  reason: string,
): string | null {
  const recoveryKey = getRecoveryKey(storageKey);
  const snapshot: StoredRecoverySnapshot = {
    sourceKey: storageKey,
    failedAt: new Date().toISOString(),
    reason,
    raw,
  };

  try {
    localStorage.setItem(recoveryKey, JSON.stringify(snapshot));
    return recoveryKey;
  } catch {
    return null;
  }
}

function corruptedParseMessage(
  entityName: string,
  storageKey: string,
  recoveryKey: string | null,
): string {
  const recoveryText = recoveryKey
    ? ` A recovery copy was saved under "${recoveryKey}".`
    : ' A recovery copy could not be saved automatically.';
  return (
    `Saved ${entityName} data is corrupted and could not be read from "${storageKey}".` +
    recoveryText +
    ' Back up your data before making more changes.'
  );
}

function corruptedValueMessage(entityName: string, storageKey: string, detail: string): string {
  return (
    `Saved ${entityName} data is corrupted and was not loaded from "${storageKey}": ${detail} ` +
    'The original browser data was left untouched.'
  );
}

export function readStoredJson<T>({
  storageKey,
  entityName,
  createEmpty,
  parse,
}: ReadStoredJsonOptions<T>): T {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) {
    return createEmpty();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const recoveryKey = preserveRecoverySnapshot(storageKey, raw, 'json-parse-failed');
    throw new Error(corruptedParseMessage(entityName, storageKey, recoveryKey));
  }

  try {
    return parse(parsed);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unexpected saved data format.';
    throw new Error(corruptedValueMessage(entityName, storageKey, detail));
  }
}

export function writeStoredJson(storageKey: string, value: unknown, entityName: string): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error(
        `Browser storage is full, so ${entityName} could not be saved. ` +
          'Export or back up your cards and images, then delete unused saved data and try again.',
      );
    }
    throw error;
  }
}

export function writeStoredString(storageKey: string, value: string, entityName: string): void {
  try {
    localStorage.setItem(storageKey, value);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error(
        `Browser storage is full, so ${entityName} could not be saved. ` +
          'Export or back up your cards and images, then delete unused saved data and try again.',
      );
    }
    throw error;
  }
}

export function readAppStorageSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  const allKeys = getManagedStorageKeys();

  for (const storageKey of allKeys) {
    const raw = localStorage.getItem(storageKey);
    if (raw !== null) {
      snapshot[storageKey] = raw;
    }
  }

  return snapshot;
}

function setRawStorageValue(storageKey: string, value: string): void {
  try {
    localStorage.setItem(storageKey, value);
  } catch (error) {
    if (isQuotaExceededError(error)) {
      throw new Error(
        'Browser storage is full, so the backup could not be restored. ' +
          'Your current data was kept unchanged.',
      );
    }
    throw error;
  }
}

export function replaceAppStorageSnapshot(nextSnapshot: Record<string, string>): void {
  const managedKeys = getManagedStorageKeys();
  const previousSnapshot = readAppStorageSnapshot();

  try {
    for (const storageKey of managedKeys) {
      if (Object.prototype.hasOwnProperty.call(nextSnapshot, storageKey)) {
        setRawStorageValue(storageKey, nextSnapshot[storageKey]!);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  } catch (error) {
    try {
      for (const storageKey of managedKeys) {
        if (Object.prototype.hasOwnProperty.call(previousSnapshot, storageKey)) {
          setRawStorageValue(storageKey, previousSnapshot[storageKey]!);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      throw new Error(
        'Backup restore failed, and the app could not fully restore the previous browser data automatically.',
      );
    }

    throw error instanceof Error
      ? error
      : new Error('Backup restore failed before replacing your current browser data.');
  }
}
