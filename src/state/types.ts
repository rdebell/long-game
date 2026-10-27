import type { ProgramPlan } from '../progression/plan';

export interface Position {
  week: number;
  day: number;
}

export interface Exercise {
  id: string;
  name: string;
  plan: ProgramPlan;
  week: number;
  day: number;
  status: 'active' | 'complete';
  needsTest: boolean;
  joinedAt: Position;
}

export interface LogEntry {
  id: string;
  exerciseId: string;
  kind: 'workout' | 'test';
  week: number;
  day: number;
  targets: number[];
  actuals: number[];
  result?: 'hit' | 'miss';
  maxReps?: number;
  completedAt: string;
}

export type ThemeChoice = 'system' | 'light' | 'dark';

export interface AppSettings {
  soundEnabled: boolean;
  theme: ThemeChoice;
}

export interface AppState {
  version: 1;
  exercises: Exercise[];
  logs: LogEntry[];
  settings: AppSettings;
}

export interface ExerciseDraft {
  goal: number;
  weeks: number;
  daysPerWeek: number;
  sets: number;
  restBaseSec: number;
  restIncreasePerWeekSec: number;
  week: number;
  day: number;
  dayPeak: number;
}
