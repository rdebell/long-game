import {
  buildWorkout,
  clampInt,
  decideProgress,
  planFromPosition,
  planFromTest,
  relevelUpcoming,
  type ProgressDecision,
} from '../progression/plan';
import type { AppState, Exercise, ExerciseDraft, LogEntry } from './types';

export const STORAGE_KEY = 'long-game/state/v1';

export const STARTER = {
  push: { id: 'push-ups', name: 'Push-ups', goal: 100, weeks: 24, week: 12, day: 2, dayPeak: 55 },
  pull: { id: 'pull-ups', name: 'Pull-ups', goal: 40, weeks: 16, week: 8, day: 3, dayPeak: 18 },
} as const;

const STRUCTURE = {
  daysPerWeek: 3,
  sets: 5,
  restBaseSec: 60,
  restIncreasePerWeekSec: 15,
} as const;

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toDateKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function createSeedState(): AppState {
  const push = planFromPosition({ ...STRUCTURE, ...starterFields(STARTER.push) });
  const pull = planFromPosition({ ...STRUCTURE, ...starterFields(STARTER.pull) });
  return {
    version: 1,
    settings: { soundEnabled: true, theme: 'system' },
    logs: [],
    exercises: [
      exerciseFrom(STARTER.push, push.plan),
      exerciseFrom(STARTER.pull, pull.plan),
    ],
  };
}

function starterFields(item: { goal: number; weeks: number; week: number; day: number; dayPeak: number }) {
  return {
    goal: item.goal,
    weeks: item.weeks,
    atWeek: item.week,
    atDay: item.day,
    dayPeak: item.dayPeak,
  };
}

function exerciseFrom(
  item: { id: string; name: string; week: number; day: number },
  plan: Exercise['plan'],
): Exercise {
  return {
    id: item.id,
    name: item.name,
    plan,
    week: item.week,
    day: item.day,
    status: 'active',
    needsTest: false,
    joinedAt: { week: item.week, day: item.day },
  };
}

function findExercise(state: AppState, exerciseId: string): Exercise {
  const exercise = state.exercises.find((item) => item.id === exerciseId);
  if (!exercise) throw new Error(`Unknown exercise ${exerciseId}`);
  return exercise;
}

function replaceExercise(state: AppState, exercise: Exercise): AppState {
  return {
    ...state,
    exercises: state.exercises.map((item) => (item.id === exercise.id ? exercise : item)),
  };
}

export function completeWorkout(
  state: AppState,
  input: { exerciseId: string; actuals: number[]; now: string; id?: string },
): { state: AppState; decision: ProgressDecision } {
  const exercise = findExercise(state, input.exerciseId);
  const decision = decideProgress(exercise.plan, exercise.week, exercise.day, input.actuals);
  const log: LogEntry = {
    id: input.id ?? createId(),
    exerciseId: exercise.id,
    kind: 'workout',
    week: exercise.week,
    day: exercise.day,
    targets: decision.targets,
    actuals: input.actuals.slice(),
    result: decision.result,
    completedAt: input.now,
  };
  const next: Exercise = {
    ...exercise,
    week: decision.nextWeek,
    day: decision.nextDay,
    status: decision.finished ? 'complete' : 'active',
  };
  return {
    decision,
    state: {
      ...replaceExercise(state, next),
      logs: [log, ...state.logs],
    },
  };
}

export function saveExerciseSettings(
  state: AppState,
  exerciseId: string,
  draft: ExerciseDraft,
): { state: AppState; extended: boolean; steep: boolean; error?: string } {
  const exercise = findExercise(state, exerciseId);
  const goal = clampInt(draft.goal, 1, 999);
  const structure = {
    daysPerWeek: clampInt(draft.daysPerWeek, 1, 7),
    sets: clampInt(draft.sets, 1, 8),
    restBaseSec: clampInt(draft.restBaseSec, 15, 300),
    restIncreasePerWeekSec: clampInt(draft.restIncreasePerWeekSec, 0, 60),
  };

  if (exercise.needsTest) {
    const plan = planFromTest(1, goal, { weeks: draft.weeks, ...structure });
    return {
      extended: false,
      steep: false,
      state: replaceExercise(state, { ...exercise, plan, week: 1, day: 1 }),
    };
  }

  const dayPeak = clampInt(draft.dayPeak, 1, 999);
  if (dayPeak > goal) {
    return { state, extended: false, steep: false, error: "The goal has to be at least this day's max set." };
  }
  const built = planFromPosition({
    goal,
    weeks: draft.weeks,
    ...structure,
    atWeek: draft.week,
    atDay: Math.min(draft.day, structure.daysPerWeek),
    dayPeak,
  });
  return {
    extended: built.extended,
    steep: built.steep,
    state: replaceExercise(state, {
      ...exercise,
      plan: built.plan,
      week: clampInt(draft.week, 1, built.plan.weeks),
      day: Math.min(clampInt(draft.day, 1, structure.daysPerWeek), structure.daysPerWeek),
      status: 'active',
    }),
  };
}

export function addExercise(
  state: AppState,
  input: {
    id?: string;
    name: string;
    goal: number;
    mode: 'test' | 'place';
    week?: number;
    day?: number;
    dayPeak?: number;
    weeks?: number;
  },
): { state: AppState; id?: string; error?: string } {
  const name = input.name.trim();
  if (!name) return { state, error: 'Name the exercise first.' };
  const goal = clampInt(input.goal, 1, 999);
  const id = input.id ?? createId();

  if (input.mode === 'place') {
    const dayPeak = clampInt(input.dayPeak ?? 1, 1, 999);
    if (dayPeak > goal) {
      return { state, error: "The goal has to be at least this day's max set." };
    }
    const week = clampInt(input.week ?? 1, 1, 52);
    const day = clampInt(input.day ?? 1, 1, STRUCTURE.daysPerWeek);
    const built = planFromPosition({
      goal,
      weeks: input.weeks ?? 12,
      ...STRUCTURE,
      atWeek: week,
      atDay: day,
      dayPeak,
    });
    const exercise: Exercise = {
      id,
      name,
      plan: built.plan,
      week,
      day,
      status: 'active',
      needsTest: false,
      joinedAt: { week, day },
    };
    return { id, state: { ...state, exercises: [...state.exercises, exercise] } };
  }

  const plan = planFromTest(1, goal, STRUCTURE);
  const exercise: Exercise = {
    id,
    name,
    plan,
    week: 1,
    day: 1,
    status: 'active',
    needsTest: true,
    joinedAt: { week: 1, day: 1 },
  };
  return { id, state: { ...state, exercises: [...state.exercises, exercise] } };
}

export function removeExercise(state: AppState, exerciseId: string): AppState {
  return {
    ...state,
    exercises: state.exercises.filter((exercise) => exercise.id !== exerciseId),
    logs: state.logs.filter((log) => log.exerciseId !== exerciseId),
  };
}

export function applyInitialTest(
  state: AppState,
  input: { exerciseId: string; testMax: number; now: string; id?: string },
): AppState {
  const exercise = findExercise(state, input.exerciseId);
  const testMax = clampInt(input.testMax, 0, 999);
  const plan = planFromTest(testMax, exercise.plan.goal, {
    daysPerWeek: exercise.plan.daysPerWeek,
    sets: exercise.plan.sets,
    restBaseSec: exercise.plan.restBaseSec,
    restIncreasePerWeekSec: exercise.plan.restIncreasePerWeekSec,
  });
  const log: LogEntry = {
    id: input.id ?? createId(),
    exerciseId: exercise.id,
    kind: 'test',
    week: 1,
    day: 1,
    targets: [],
    actuals: [testMax],
    maxReps: testMax,
    completedAt: input.now,
  };
  return {
    ...replaceExercise(state, {
      ...exercise,
      plan,
      week: 1,
      day: 1,
      status: 'active',
      needsTest: false,
      joinedAt: { week: 1, day: 1 },
    }),
    logs: [log, ...state.logs],
  };
}

export function applyRetest(
  state: AppState,
  input: { exerciseId: string; testMax: number; now: string; id?: string },
): AppState {
  const exercise = findExercise(state, input.exerciseId);
  const testMax = clampInt(input.testMax, 0, 999);
  const built = relevelUpcoming(exercise.plan, exercise.week, exercise.day, testMax);
  const log: LogEntry = {
    id: input.id ?? createId(),
    exerciseId: exercise.id,
    kind: 'test',
    week: exercise.week,
    day: exercise.day,
    targets: [],
    actuals: [testMax],
    maxReps: testMax,
    completedAt: input.now,
  };
  return {
    ...replaceExercise(state, { ...exercise, plan: built.plan, status: 'active' }),
    logs: [log, ...state.logs],
  };
}

export function resetTraining(state: AppState): AppState {
  const seed = createSeedState();
  return { ...seed, settings: state.settings };
}

export function chartPoints(logs: LogEntry[]): { at: string; value: number; kind: LogEntry['kind'] }[] {
  return logs
    .map((log) => ({
      at: log.completedAt,
      kind: log.kind,
      value: log.kind === 'test' ? (log.maxReps ?? Math.max(0, ...log.actuals)) : Math.max(0, ...log.actuals),
    }))
    .filter((point) => point.value > 0)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export function currentTargets(exercise: Exercise): number[] {
  return buildWorkout(exercise.plan, exercise.week, exercise.day).sets.map((set) => set.reps);
}
