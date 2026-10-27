/**
 * Progressive-overload plan.
 *
 * Each training day has a last-set floor, shown as N+. The athlete must hit
 * every earlier set and at least N on the final set. That floor starts from
 * a max test (or from a mid-program anchor) and ends on the goal. Gains are
 * spread across the sessions that are left, so the next day is harder whenever
 * there is still room to climb.
 *
 * Inside a day, the other sets are a fixed wave of that floor: 71%, 91%, 71%,
 * 64%, then 100%. The wave is varied on purpose. It is not a copied table.
 */

export const HIT_MESSAGE = 'Target hit, next workout unlocked';
export const MISS_MESSAGE = 'Missed target, repeat this workout next time';
export const FINISH_MESSAGE = 'Target hit. You finished this plan.';

/** Shares of the day's last-set floor. The final entry is the max set. */
export const SET_WAVE = [0.71, 0.91, 0.71, 0.64, 1] as const;

export interface ProgramPlan {
  goal: number;
  weeks: number;
  daysPerWeek: number;
  sets: number;
  restBaseSec: number;
  restIncreasePerWeekSec: number;
  /** Last-set minimum for every session, in calendar order. */
  peaks: number[];
}

export interface WorkoutSet {
  reps: number;
  isMax: boolean;
}

export interface WorkoutTemplate {
  week: number;
  day: number;
  restSec: number;
  sets: WorkoutSet[];
}

export interface ProgressDecision {
  result: 'hit' | 'miss';
  message: string;
  nextWeek: number;
  nextDay: number;
  finished: boolean;
  targets: number[];
}

export interface PlanBuild {
  plan: ProgramPlan;
  /** True when the period had to grow so this week still exists. */
  extended: boolean;
  /** True when the next day jumps by a large amount because the period is short. */
  steep: boolean;
}

export function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function sessionIndex(week: number, day: number, daysPerWeek: number): number {
  return (week - 1) * daysPerWeek + (day - 1);
}

export function positionForIndex(index: number, daysPerWeek: number): { week: number; day: number } {
  return {
    week: Math.floor(index / daysPerWeek) + 1,
    day: (index % daysPerWeek) + 1,
  };
}

/** Spread `gain` across `steps` as evenly as possible. The increments sum to `gain`. */
export function spreadIncrements(gain: number, steps: number): number[] {
  if (steps <= 0) return [];
  const out: number[] = [];
  if (gain >= 0) {
    let acc = 0;
    for (let i = 0; i < steps; i += 1) {
      acc += gain;
      const add = Math.floor(acc / steps);
      acc -= add * steps;
      out.push(add);
    }
    return out;
  }
  const mag = -gain;
  let acc = 0;
  for (let i = 0; i < steps; i += 1) {
    acc += mag;
    const add = Math.floor(acc / steps);
    acc -= add * steps;
    out.push(-add);
  }
  return out;
}

/**
 * Increments for the sessions still ahead.
 * When there is enough gap, every step is at least +1.
 * When the gap is smaller than the number of steps, the climb happens first
 * and the goal is held at the end, so the next day still gets harder.
 */
export function forwardIncrements(gain: number, steps: number): number[] {
  if (steps <= 0) return [];
  if (gain >= steps) return spreadIncrements(gain, steps);
  if (gain <= 0) return spreadIncrements(gain, steps);
  return Array.from({ length: steps }, (_, i) => (i < gain ? 1 : 0));
}

export function seriesFrom(start: number, end: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [end];
  const increments = forwardIncrements(end - start, count - 1);
  const out: number[] = [start];
  let value = start;
  for (const inc of increments) {
    value += inc;
    out.push(value);
  }
  out[count - 1] = end;
  return out;
}

/** Ramp that reaches `end` on the last slot, holding the low end at the beginning. */
export function seriesTo(start: number, end: number, count: number): number[] {
  if (count <= 1) return [end];
  const steps = count - 1;
  const gain = end - start;
  let increments: number[];
  if (gain >= steps && gain > 0) increments = spreadIncrements(gain, steps);
  else if (gain > 0) {
    increments = Array.from({ length: steps }, (_, i) => (i >= steps - gain ? 1 : 0));
  } else {
    increments = spreadIncrements(gain, steps);
  }
  const out: number[] = [start];
  let value = start;
  for (const inc of increments) {
    value += inc;
    out.push(value);
  }
  out[count - 1] = end;
  return out;
}

export function buildPeaks(total: number, anchorIndex: number, anchorPeak: number, goal: number): number[] {
  if (total <= 0) return [];
  const anchor = Math.min(Math.max(0, anchorIndex), total - 1);
  const forward = seriesFrom(anchorPeak, goal, total - anchor);
  if (anchor === 0) return forward;
  const backStart = Math.max(1, anchorPeak - anchor);
  const back = seriesTo(backStart, anchorPeak, anchor + 1);
  return [...back.slice(0, -1), ...forward];
}

export function recommendPlan(testMax: number, goal: number): {
  weeks: number;
  daysPerWeek: number;
  sets: number;
  restBaseSec: number;
  restIncreasePerWeekSec: number;
  startPeak: number;
} {
  const safeGoal = clampInt(goal, 1, 999);
  const safeTest = clampInt(testMax, 0, 999);
  const daysPerWeek = 3;
  const sets = 5;
  const restIncreasePerWeekSec = 15;
  if (safeTest >= safeGoal) {
    return {
      weeks: 2,
      daysPerWeek,
      sets,
      restBaseSec: 60,
      restIncreasePerWeekSec,
      startPeak: safeGoal,
    };
  }
  const startPeak = Math.max(1, Math.min(safeGoal - 1, Math.round(safeTest * 0.6)));
  const gap = safeGoal - startPeak;
  const weeklyGain = clampInt(Math.round(safeGoal * 0.04), 1, 6);
  const weeks = clampInt(Math.ceil(gap / weeklyGain) + 1, 6, 30);
  const restBaseSec = safeTest < 8 ? 90 : 60;
  return { weeks, daysPerWeek, sets, restBaseSec, restIncreasePerWeekSec, startPeak };
}

export function planFromTest(
  testMax: number,
  goal: number,
  structure?: Partial<Pick<ProgramPlan, 'weeks' | 'daysPerWeek' | 'sets' | 'restBaseSec' | 'restIncreasePerWeekSec'>>,
): ProgramPlan {
  const rec = recommendPlan(testMax, goal);
  const daysPerWeek = clampInt(structure?.daysPerWeek ?? rec.daysPerWeek, 1, 7);
  const weeks = clampInt(structure?.weeks ?? rec.weeks, 1, 52);
  const sets = clampInt(structure?.sets ?? rec.sets, 1, 8);
  const restBaseSec = clampInt(structure?.restBaseSec ?? rec.restBaseSec, 15, 300);
  const restIncreasePerWeekSec = clampInt(structure?.restIncreasePerWeekSec ?? rec.restIncreasePerWeekSec, 0, 60);
  const goalN = clampInt(goal, 1, 999);
  const startPeak = Math.min(rec.startPeak, goalN);
  const peaks = buildPeaks(weeks * daysPerWeek, 0, startPeak, goalN);
  return { goal: goalN, weeks, daysPerWeek, sets, restBaseSec, restIncreasePerWeekSec, peaks };
}

export function planFromPosition(input: {
  goal: number;
  weeks: number;
  daysPerWeek: number;
  sets: number;
  restBaseSec: number;
  restIncreasePerWeekSec: number;
  atWeek: number;
  atDay: number;
  dayPeak: number;
}): PlanBuild {
  const daysPerWeek = clampInt(input.daysPerWeek, 1, 7);
  const sets = clampInt(input.sets, 1, 8);
  const restBaseSec = clampInt(input.restBaseSec, 15, 300);
  const restIncreasePerWeekSec = clampInt(input.restIncreasePerWeekSec, 0, 60);
  const goal = clampInt(input.goal, 1, 999);
  const dayPeak = clampInt(input.dayPeak, 1, 999);
  const atDay = clampInt(input.atDay, 1, daysPerWeek);
  let atWeek = clampInt(input.atWeek, 1, 52);
  let weeks = Math.max(clampInt(input.weeks, 1, 52), atWeek);
  let extended = weeks !== clampInt(input.weeks, 1, 52);
  let total = weeks * daysPerWeek;
  let index = sessionIndex(atWeek, atDay, daysPerWeek);
  if (index > total - 1) {
    atWeek = Math.max(atWeek, Math.ceil((index + 1) / daysPerWeek));
    weeks = Math.max(weeks, atWeek);
    total = weeks * daysPerWeek;
    index = sessionIndex(atWeek, atDay, daysPerWeek);
    extended = true;
  }
  // Keep today's number put. If it is the final session and still short of the
  // goal, add one week so the goal is not forced onto today.
  if (dayPeak < goal && index >= total - 1) {
    weeks += 1;
    total = weeks * daysPerWeek;
    extended = true;
  }
  const peaks = buildPeaks(total, index, dayPeak, goal);
  const next = peaks[index + 1];
  const steep = next !== undefined && next - peaks[index] >= 8;
  return {
    extended,
    steep,
    plan: { goal, weeks, daysPerWeek, sets, restBaseSec, restIncreasePerWeekSec, peaks },
  };
}

export function relevelUpcoming(plan: ProgramPlan, week: number, day: number, testedMax: number): PlanBuild {
  const trained = Math.max(1, Math.round(clampInt(testedMax, 0, 999) * 0.75));
  const dayPeak = Math.min(plan.goal, trained);
  return planFromPosition({
    goal: plan.goal,
    weeks: plan.weeks,
    daysPerWeek: plan.daysPerWeek,
    sets: plan.sets,
    restBaseSec: plan.restBaseSec,
    restIncreasePerWeekSec: plan.restIncreasePerWeekSec,
    atWeek: week,
    atDay: day,
    dayPeak,
  });
}

export function restForWeek(plan: Pick<ProgramPlan, 'restBaseSec' | 'restIncreasePerWeekSec'>, week: number): number {
  const raw = plan.restBaseSec + Math.max(0, week - 1) * plan.restIncreasePerWeekSec;
  return Math.min(600, Math.max(15, Math.round(raw)));
}

export function waveForSetCount(sets: number): number[] {
  const count = clampInt(sets, 1, 8);
  if (count === 1) return [1];
  const head = SET_WAVE.slice(0, -1);
  if (count - 1 === head.length) return [...head, 1];
  if (count - 1 < head.length) {
    const need = count - 1;
    const chosen: number[] = [];
    for (let i = 0; i < need; i += 1) {
      const idx = Math.round((i * (head.length - 1)) / Math.max(1, need - 1));
      chosen.push(head[idx]);
    }
    return [...chosen, 1];
  }
  const chosen: number[] = [];
  for (let i = 0; i < count - 1; i += 1) chosen.push(head[i % head.length]);
  return [...chosen, 1];
}

export function buildWorkout(plan: ProgramPlan, week: number, day: number): WorkoutTemplate {
  const index = sessionIndex(week, day, plan.daysPerWeek);
  const lastIndex = Math.max(0, plan.peaks.length - 1);
  const peak = plan.peaks[Math.min(Math.max(index, 0), lastIndex)] ?? plan.goal;
  const ratios = waveForSetCount(plan.sets);
  const sets: WorkoutSet[] = ratios.map((ratio, i) => {
    const isMax = i === ratios.length - 1;
    const reps = isMax ? peak : Math.max(1, Math.min(peak, Math.round(peak * ratio)));
    return { reps, isMax };
  });
  return { week, day, restSec: restForWeek(plan, week), sets };
}

export function isTargetHit(sets: WorkoutSet[], actuals: number[]): boolean {
  if (actuals.length !== sets.length) return false;
  return sets.every((set, i) => Number.isFinite(actuals[i]) && actuals[i] >= set.reps);
}

export function nextPosition(plan: ProgramPlan, week: number, day: number): { week: number; day: number } | null {
  const index = sessionIndex(week, day, plan.daysPerWeek) + 1;
  if (index >= plan.peaks.length) return null;
  return positionForIndex(index, plan.daysPerWeek);
}

/**
 * Hit every target, including at least N on the final set, and the next day
 * unlocks. Miss any logged rep and the same week and day stays, with the same
 * targets. Actual reps are what was logged, not the printed target.
 */
export function decideProgress(plan: ProgramPlan, week: number, day: number, actuals: number[]): ProgressDecision {
  const workout = buildWorkout(plan, week, day);
  const targets = workout.sets.map((set) => set.reps);
  if (!isTargetHit(workout.sets, actuals)) {
    return {
      result: 'miss',
      message: MISS_MESSAGE,
      nextWeek: week,
      nextDay: day,
      finished: false,
      targets,
    };
  }
  const next = nextPosition(plan, week, day);
  if (!next) {
    return {
      result: 'hit',
      message: FINISH_MESSAGE,
      nextWeek: week,
      nextDay: day,
      finished: true,
      targets,
    };
  }
  return {
    result: 'hit',
    message: HIT_MESSAGE,
    nextWeek: next.week,
    nextDay: next.day,
    finished: false,
    targets,
  };
}

export function medianPositive(values: number[]): number | null {
  const nums = values.filter((n) => Number.isFinite(n) && n >= 1).map((n) => Math.round(n));
  if (!nums.length) return null;
  nums.sort((a, b) => a - b);
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 1) return nums[mid];
  return Math.round((nums[mid - 1] + nums[mid]) / 2);
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatSetReps(reps: number, isMax: boolean): string {
  return isMax ? `${reps}+` : String(reps);
}
