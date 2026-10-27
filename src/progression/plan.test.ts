import { describe, expect, it } from 'vitest';
import {
  FINISH_MESSAGE,
  HIT_MESSAGE,
  MISS_MESSAGE,
  buildWorkout,
  decideProgress,
  forwardIncrements,
  medianPositive,
  planFromPosition,
  planFromTest,
  recommendPlan,
  restForWeek,
  seriesFrom,
  spreadIncrements,
} from './plan';

const cases: { testMax: number; goal: number }[] = [
  { testMax: 5, goal: 20 },
  { testMax: 8, goal: 40 },
  { testMax: 20, goal: 100 },
  { testMax: 1, goal: 10 },
  { testMax: 30, goal: 50 },
  { testMax: 12, goal: 25 },
];

describe('recommendPlan', () => {
  it('derives weeks, the opening peak, and rest from the gap', () => {
    const pull = recommendPlan(8, 40);
    expect(pull.startPeak).toBe(5);
    expect(pull.weeks).toBe(19);
    expect(pull.daysPerWeek).toBe(3);
    expect(pull.sets).toBe(5);
    expect(pull.restBaseSec).toBe(60);

    const push = recommendPlan(20, 100);
    expect(push.startPeak).toBe(12);
    expect(push.weeks).toBe(23);
    expect(push.restBaseSec).toBe(60);

    const beginner = recommendPlan(5, 20);
    expect(beginner.startPeak).toBe(3);
    expect(beginner.restBaseSec).toBe(90);
    expect(beginner.weeks).toBeGreaterThanOrEqual(6);
  });

  it('holds the goal when the test is already there', () => {
    const done = recommendPlan(40, 40);
    expect(done.startPeak).toBe(40);
    expect(done.weeks).toBe(2);
  });
});

describe('planFromTest', () => {
  it.each(cases)('builds a climb from $testMax to $goal', ({ testMax, goal }) => {
    const plan = planFromTest(testMax, goal);
    expect(plan.peaks).toHaveLength(plan.weeks * plan.daysPerWeek);
    expect(plan.peaks[0]).toBe(recommendPlan(testMax, goal).startPeak);
    expect(plan.peaks[plan.peaks.length - 1]).toBe(goal);
    for (let i = 1; i < plan.peaks.length; i += 1) {
      expect(plan.peaks[i]).toBeGreaterThanOrEqual(plan.peaks[i - 1]);
    }
    if (plan.peaks[0] < goal) {
      expect(plan.peaks[1]).toBeGreaterThan(plan.peaks[0]);
    }

    for (let week = 1; week <= plan.weeks; week += 1) {
      expect(restForWeek(plan, week)).toBe(
        Math.min(600, plan.restBaseSec + (week - 1) * plan.restIncreasePerWeekSec),
      );
      for (let day = 1; day <= plan.daysPerWeek; day += 1) {
        const workout = buildWorkout(plan, week, day);
        expect(workout.sets).toHaveLength(plan.sets);
        expect(workout.sets[workout.sets.length - 1].isMax).toBe(true);
        expect(workout.sets[workout.sets.length - 1].reps).toBe(plan.peaks[(week - 1) * plan.daysPerWeek + (day - 1)]);
        for (const set of workout.sets) {
          expect(set.reps).toBeGreaterThanOrEqual(1);
          expect(Number.isInteger(set.reps)).toBe(true);
          expect(set.reps).toBeLessThanOrEqual(workout.sets[workout.sets.length - 1].reps);
        }
      }
    }
  });

  it('respects a shorter custom period and a different set count', () => {
    const plan = planFromTest(10, 40, { weeks: 8, sets: 3, daysPerWeek: 4, restBaseSec: 75, restIncreasePerWeekSec: 10 });
    expect(plan.weeks).toBe(8);
    expect(plan.sets).toBe(3);
    expect(plan.daysPerWeek).toBe(4);
    expect(plan.peaks).toHaveLength(32);
    expect(plan.peaks.at(-1)).toBe(40);
    const first = buildWorkout(plan, 1, 1);
    expect(first.sets).toHaveLength(3);
    expect(first.sets[2].isMax).toBe(true);
    expect(first.restSec).toBe(75);
    expect(buildWorkout(plan, 3, 1).restSec).toBe(95);
  });

  it('caps a long rest climb at 10 minutes', () => {
    const plan = planFromTest(10, 30, { weeks: 40, restBaseSec: 60, restIncreasePerWeekSec: 30 });
    expect(restForWeek(plan, 40)).toBe(600);
  });
});

describe('mid-program anchor', () => {
  it('pins push-ups week 12 day 2 at 39, 50, 39, 35, 55+', () => {
    const { plan, extended, steep } = planFromPosition({
      goal: 100,
      weeks: 24,
      daysPerWeek: 3,
      sets: 5,
      restBaseSec: 60,
      restIncreasePerWeekSec: 15,
      atWeek: 12,
      atDay: 2,
      dayPeak: 55,
    });
    expect(extended).toBe(false);
    expect(steep).toBe(false);
    const day = buildWorkout(plan, 12, 2);
    expect(day.sets.map((set) => set.reps)).toEqual([39, 50, 39, 35, 55]);
    expect(day.sets.map((set) => set.isMax)).toEqual([false, false, false, false, true]);
    expect(day.restSec).toBe(60 + 11 * 15);

    const next = buildWorkout(plan, 12, 3);
    expect(next.sets.at(-1)?.reps).toBeGreaterThan(55);
    expect(plan.peaks.at(-1)).toBe(100);
    expect(plan.peaks[0]).toBeGreaterThanOrEqual(1);
    for (let i = 1; i < plan.peaks.length; i += 1) {
      expect(plan.peaks[i]).toBeGreaterThanOrEqual(plan.peaks[i - 1]);
    }
  });

  it('pins pull-ups week 8 day 3 and keeps climbing toward 40', () => {
    const { plan } = planFromPosition({
      goal: 40,
      weeks: 16,
      daysPerWeek: 3,
      sets: 5,
      restBaseSec: 60,
      restIncreasePerWeekSec: 15,
      atWeek: 8,
      atDay: 3,
      dayPeak: 18,
    });
    const day = buildWorkout(plan, 8, 3);
    expect(day.sets.at(-1)).toEqual({ reps: 18, isMax: true });
    expect(day.sets.map((set) => set.reps)).toEqual([13, 16, 13, 12, 18]);
    const next = buildWorkout(plan, 9, 1);
    expect(next.sets.at(-1)?.reps).toBe(19);
    expect(plan.peaks.at(-1)).toBe(40);
  });

  it('varies reps inside the day', () => {
    const { plan } = planFromPosition({
      goal: 100,
      weeks: 24,
      daysPerWeek: 3,
      sets: 5,
      restBaseSec: 60,
      restIncreasePerWeekSec: 15,
      atWeek: 12,
      atDay: 2,
      dayPeak: 55,
    });
    const reps = buildWorkout(plan, 12, 2).sets.map((set) => set.reps);
    expect(new Set(reps).size).toBeGreaterThan(2);
    expect(reps[1]).toBeGreaterThan(reps[0]);
    expect(reps[3]).toBeLessThan(reps[1]);
  });
});

describe('decideProgress', () => {
  const { plan } = planFromPosition({
    goal: 100,
    weeks: 24,
    daysPerWeek: 3,
    sets: 5,
    restBaseSec: 60,
    restIncreasePerWeekSec: 15,
    atWeek: 12,
    atDay: 2,
    dayPeak: 55,
  });
  const targets = [39, 50, 39, 35, 55];

  it('unlocks the next day when every logged rep hits, including exactly N on the last set', () => {
    const decision = decideProgress(plan, 12, 2, targets);
    expect(decision.result).toBe('hit');
    expect(decision.message).toBe(HIT_MESSAGE);
    expect(decision.nextWeek).toBe(12);
    expect(decision.nextDay).toBe(3);
    expect(decision.finished).toBe(false);
    expect(decision.targets).toEqual(targets);
    expect(buildWorkout(plan, decision.nextWeek, decision.nextDay).sets.at(-1)?.reps).toBeGreaterThan(55);
  });

  it('accepts pencil edits that are above the target', () => {
    const decision = decideProgress(plan, 12, 2, [40, 52, 39, 36, 60]);
    expect(decision.result).toBe('hit');
    expect(decision.message).toBe(HIT_MESSAGE);
    expect(decision.nextDay).toBe(3);
  });

  it('repeats the same workout when any set, including the last, is short', () => {
    const shortLast = decideProgress(plan, 12, 2, [39, 50, 39, 35, 54]);
    expect(shortLast.result).toBe('miss');
    expect(shortLast.message).toBe(MISS_MESSAGE);
    expect(shortLast.nextWeek).toBe(12);
    expect(shortLast.nextDay).toBe(2);
    expect(buildWorkout(plan, shortLast.nextWeek, shortLast.nextDay).sets.map((set) => set.reps)).toEqual(targets);

    const shortMiddle = decideProgress(plan, 12, 2, [39, 50, 39, 34, 55]);
    expect(shortMiddle.result).toBe('miss');
    expect(shortMiddle.message).toBe(MISS_MESSAGE);
    expect(shortMiddle.nextWeek).toBe(12);
    expect(shortMiddle.nextDay).toBe(2);
    expect(shortMiddle.targets).toEqual(targets);
  });

  it('rolls a hit on the last day of the week into the next week', () => {
    const decision = decideProgress(plan, 12, 3, buildWorkout(plan, 12, 3).sets.map((set) => set.reps));
    expect(decision.result).toBe('hit');
    expect(decision.message).toBe(HIT_MESSAGE);
    expect(decision.nextWeek).toBe(13);
    expect(decision.nextDay).toBe(1);
  });

  it('finishes the plan on the final day instead of inventing another workout', () => {
    const last = plan.weeks;
    const decision = decideProgress(
      plan,
      last,
      plan.daysPerWeek,
      buildWorkout(plan, last, plan.daysPerWeek).sets.map((set) => set.reps),
    );
    expect(decision.result).toBe('hit');
    expect(decision.message).toBe(FINISH_MESSAGE);
    expect(decision.finished).toBe(true);
    expect(decision.nextWeek).toBe(last);
    expect(decision.nextDay).toBe(plan.daysPerWeek);
  });
});

describe('distribution helpers', () => {
  it('sums increments to the gain and climbs immediately when it can', () => {
    expect(spreadIncrements(45, 37).reduce((sum, n) => sum + n, 0)).toBe(45);
    expect(Math.min(...spreadIncrements(45, 37))).toBeGreaterThanOrEqual(1);
    expect(forwardIncrements(3, 10)).toEqual([1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);
    expect(seriesFrom(55, 100, 38)[0]).toBe(55);
    expect(seriesFrom(55, 100, 38).at(-1)).toBe(100);
    expect(seriesFrom(55, 100, 38)[1]).toBeGreaterThan(55);
  });

  it('takes the median of recent max sets', () => {
    expect(medianPositive([55, 50, 60])).toBe(55);
    expect(medianPositive([50, 60])).toBe(55);
    expect(medianPositive([40])).toBe(40);
    expect(medianPositive([0, -3])).toBeNull();
  });
});
