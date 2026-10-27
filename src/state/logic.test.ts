import { describe, expect, it } from 'vitest';
import { buildWorkout } from '../progression/plan';
import { HIT_MESSAGE, MISS_MESSAGE } from '../progression/plan';
import { parseBackup, serializeBackup } from './backup';
import {
  STARTER,
  applyRetest,
  completeWorkout,
  createSeedState,
  currentTargets,
  resetTraining,
  saveExerciseSettings,
} from './logic';

const NOW = '2026-10-27T15:00:00.000Z';

describe('starter plan', () => {
  it('opens on Rich’s push-up and pull-up days', () => {
    const state = createSeedState();
    const push = state.exercises.find((exercise) => exercise.id === 'push-ups');
    const pull = state.exercises.find((exercise) => exercise.id === 'pull-ups');
    expect(push).toMatchObject({ week: 12, day: 2, status: 'active' });
    expect(pull).toMatchObject({ week: 8, day: 3 });
    expect(push && currentTargets(push)).toEqual([39, 50, 39, 35, 55]);
    expect(pull && buildWorkout(pull.plan, 8, 3).sets.at(-1)?.reps).toBe(18);
    expect(push?.plan.goal).toBe(STARTER.push.goal);
    expect(pull?.plan.goal).toBe(STARTER.pull.goal);
  });
});

describe('workout results', () => {
  it('advances and keeps the log when every actual rep hits', () => {
    const start = createSeedState();
    const targets = [39, 50, 39, 35, 55];
    const { state, decision } = completeWorkout(start, {
      exerciseId: 'push-ups',
      actuals: [40, 52, 39, 36, 60],
      now: NOW,
      id: 'hit-1',
    });
    expect(decision.result).toBe('hit');
    expect(decision.message).toBe(HIT_MESSAGE);
    const push = state.exercises.find((exercise) => exercise.id === 'push-ups');
    expect(push).toMatchObject({ week: 12, day: 3 });
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toMatchObject({ id: 'hit-1', result: 'hit', targets, actuals: [40, 52, 39, 36, 60] });
    expect(buildWorkout(push!.plan, 12, 3).sets.at(-1)!.reps).toBeGreaterThan(55);
  });

  it('repeats the same targets after a miss and records every attempt', () => {
    let state = createSeedState();
    const before = currentTargets(state.exercises.find((exercise) => exercise.id === 'push-ups')!);
    const first = completeWorkout(state, {
      exerciseId: 'push-ups',
      actuals: [39, 50, 39, 34, 55],
      now: NOW,
      id: 'miss-1',
    });
    state = first.state;
    expect(first.decision.result).toBe('miss');
    expect(first.decision.message).toBe(MISS_MESSAGE);
    const second = completeWorkout(state, {
      exerciseId: 'push-ups',
      actuals: [39, 48, 39, 35, 50],
      now: '2026-10-29T15:00:00.000Z',
      id: 'miss-2',
    });
    state = second.state;
    const push = state.exercises.find((exercise) => exercise.id === 'push-ups')!;
    expect(push).toMatchObject({ week: 12, day: 2 });
    expect(currentTargets(push)).toEqual(before);
    expect(state.logs.map((log) => log.id)).toEqual(['miss-2', 'miss-1']);
    expect(state.logs.every((log) => log.week === 12 && log.day === 2 && log.result === 'miss')).toBe(true);

    const hit = completeWorkout(state, {
      exerciseId: 'push-ups',
      actuals: before,
      now: '2026-10-31T15:00:00.000Z',
      id: 'hit-2',
    });
    expect(hit.state.exercises.find((exercise) => exercise.id === 'push-ups')).toMatchObject({ week: 12, day: 3 });
    expect(hit.state.logs).toHaveLength(3);
  });
});

describe('settings and retests', () => {
  it('recalculates from the current day and keeps history', () => {
    const logged = completeWorkout(createSeedState(), {
      exerciseId: 'pull-ups',
      actuals: [1, 1, 1, 1, 1],
      now: NOW,
      id: 'old',
    }).state;
    const pull = logged.exercises.find((exercise) => exercise.id === 'pull-ups')!;
    const saved = saveExerciseSettings(logged, 'pull-ups', {
      goal: 40,
      weeks: 16,
      daysPerWeek: 3,
      sets: 5,
      restBaseSec: 90,
      restIncreasePerWeekSec: 15,
      week: pull.week,
      day: pull.day,
      dayPeak: 18,
    });
    expect(saved.error).toBeUndefined();
    expect(saved.state.logs).toEqual(logged.logs);
    const next = saved.state.exercises.find((exercise) => exercise.id === 'pull-ups')!;
    expect(next.plan.restBaseSec).toBe(90);
    expect(buildWorkout(next.plan, next.week, next.day).sets.at(-1)?.reps).toBe(18);
    expect(next.plan.goal).toBe(40);
  });

  it('rejects a goal below the day’s max set', () => {
    const saved = saveExerciseSettings(createSeedState(), 'push-ups', {
      goal: 40,
      weeks: 24,
      daysPerWeek: 3,
      sets: 5,
      restBaseSec: 60,
      restIncreasePerWeekSec: 15,
      week: 12,
      day: 2,
      dayPeak: 55,
    });
    expect(saved.error).toMatch(/goal/i);
    expect(saved.state.exercises.find((exercise) => exercise.id === 'push-ups')?.plan.goal).toBe(100);
  });

  it('relevels the upcoming day from a retest without dropping the log', () => {
    const state = applyRetest(createSeedState(), {
      exerciseId: 'push-ups',
      testMax: 80,
      now: NOW,
      id: 'retest',
    });
    const push = state.exercises.find((exercise) => exercise.id === 'push-ups')!;
    expect(push.week).toBe(12);
    expect(push.day).toBe(2);
    expect(buildWorkout(push.plan, 12, 2).sets.at(-1)?.reps).toBe(60);
    expect(push.plan.peaks.at(-1)).toBe(100);
    expect(state.logs[0]).toMatchObject({ kind: 'test', maxReps: 80 });
  });

  it('resets training and keeps appearance settings', () => {
    const dirty = {
      ...createSeedState(),
      settings: { soundEnabled: false, theme: 'dark' as const },
      logs: createSeedState().logs,
    };
    const reset = resetTraining(dirty);
    expect(reset.settings).toEqual(dirty.settings);
    expect(reset.logs).toEqual([]);
    expect(reset.exercises.find((exercise) => exercise.id === 'push-ups')?.week).toBe(12);
  });
});

describe('backup', () => {
  it('round-trips a backup and rejects junk', () => {
    const state = createSeedState();
    const parsed = parseBackup(serializeBackup(state));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.state.exercises).toHaveLength(2);
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup('{"version":1,"exercises":[],"logs":[]}').ok).toBe(true);
    expect(parseBackup('{"version":2}').ok).toBe(false);
  });
});
