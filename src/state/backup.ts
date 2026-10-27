import { readHealthSettings } from '../health';
import type { ProgramPlan } from '../progression/plan';
import type { AppState, Exercise, LogEntry, ThemeChoice } from './types';

export function serializeBackup(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseBackup(text: string): { ok: true; state: AppState } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'That file is not a Long Game backup.' };
  }
  const root = data as Record<string, unknown>;
  if (root.version !== 1 || !Array.isArray(root.exercises) || !Array.isArray(root.logs)) {
    return { ok: false, error: 'That file is not a Long Game backup.' };
  }
  try {
    const exercises = root.exercises.map(readExercise);
    const logs = root.logs.map(readLog);
    const settings = readSettings(root.settings);
    return { ok: true, state: { version: 1, exercises, logs, settings } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'That file is not a Long Game backup.';
    return { ok: false, error: message };
  }
}

function readExercise(value: unknown): Exercise {
  const item = objectOf(value, 'exercise');
  const plan = readPlan(item.plan);
  const week = integer(item.week, 'week');
  const day = integer(item.day, 'day');
  if (week < 1 || week > plan.weeks || day < 1 || day > plan.daysPerWeek) {
    throw new Error('A workout position is outside its plan.');
  }
  const status = item.status === 'complete' ? 'complete' : 'active';
  const joined = item.joinedAt && typeof item.joinedAt === 'object' ? (item.joinedAt as Record<string, unknown>) : null;
  return {
    id: text(item.id, 'id'),
    name: text(item.name, 'name'),
    plan,
    week,
    day,
    status,
    needsTest: item.needsTest === true,
    joinedAt: {
      week: joined ? integer(joined.week, 'joined week') : week,
      day: joined ? integer(joined.day, 'joined day') : day,
    },
  };
}

function readPlan(value: unknown): ProgramPlan {
  const item = objectOf(value, 'plan');
  const goal = integer(item.goal, 'goal');
  const weeks = integer(item.weeks, 'weeks');
  const daysPerWeek = integer(item.daysPerWeek, 'days per week');
  const sets = integer(item.sets, 'sets');
  const restBaseSec = integer(item.restBaseSec, 'rest');
  const restIncreasePerWeekSec = integer(item.restIncreasePerWeekSec, 'rest increase');
  if (!Array.isArray(item.peaks) || item.peaks.length !== weeks * daysPerWeek) {
    throw new Error('The plan length does not match its weeks.');
  }
  const peaks = item.peaks.map((peak) => integer(peak, 'peak'));
  if (peaks.some((peak) => peak < 1) || goal < 1) throw new Error('Rep targets have to be at least 1.');
  return { goal, weeks, daysPerWeek, sets, restBaseSec, restIncreasePerWeekSec, peaks };
}

function readLog(value: unknown): LogEntry {
  const item = objectOf(value, 'log');
  const kind = item.kind === 'test' ? 'test' : item.kind === 'workout' ? 'workout' : null;
  if (!kind) throw new Error('A log entry has an unknown type.');
  const result = item.result === 'hit' || item.result === 'miss' ? item.result : undefined;
  return {
    id: text(item.id, 'log id'),
    exerciseId: text(item.exerciseId, 'log exercise'),
    kind,
    week: integer(item.week, 'log week'),
    day: integer(item.day, 'log day'),
    targets: numberList(item.targets),
    actuals: numberList(item.actuals),
    result,
    maxReps: item.maxReps === undefined ? undefined : integer(item.maxReps, 'max reps'),
    completedAt: text(item.completedAt, 'log time'),
    ...optionalTimes(item),
  };
}

function optionalTimes(item: Record<string, unknown>): { startedAt?: string; endedAt?: string } {
  const startedAt = optionalText(item.startedAt);
  const endedAt = optionalText(item.endedAt);
  return {
    ...(startedAt ? { startedAt } : {}),
    ...(endedAt ? { endedAt } : {}),
  };
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function readSettings(value: unknown): AppState['settings'] {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const theme: ThemeChoice = item.theme === 'light' || item.theme === 'dark' || item.theme === 'system' ? item.theme : 'system';
  return { soundEnabled: item.soundEnabled !== false, theme, ...readHealthSettings(item) };
}

function objectOf(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error(`A ${label} in the backup is missing.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`A ${label} in the backup is missing.`);
  return value;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`A ${label} in the backup is not a whole number.`);
  }
  return value;
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) throw new Error('A log is missing its reps.');
  return value.map((item) => integer(item, 'rep'));
}
