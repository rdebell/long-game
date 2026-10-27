import { parseBackup } from './state/backup';
import { STORAGE_KEY, createSeedState } from './state/logic';
import type { AppState } from './state/types';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = parseBackup(raw);
    return parsed.ok ? parsed.state : createSeedState();
  } catch {
    return createSeedState();
  }
}

export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
