import { describe, expect, it } from 'vitest';
import { suggestToday } from './schedule';

const ids = ['pull-ups', 'push-ups'];

describe('suggestToday', () => {
  it('alternates by the calendar before anyone has trained', () => {
    const first = suggestToday(ids, [], '2026-10-01');
    const second = suggestToday(ids, [], '2026-10-02');
    expect(first.kind).toBe('due');
    expect(second.kind).toBe('due');
    if (first.kind === 'due' && second.kind === 'due') {
      expect(first.exerciseId).not.toBe(second.exerciseId);
    }
  });

  it('suggests the other exercise the day after one was done', () => {
    expect(
      suggestToday(ids, [{ exerciseId: 'push-ups', date: '2026-10-26' }], '2026-10-27'),
    ).toEqual({ kind: 'due', exerciseId: 'pull-ups' });
  });

  it('keeps a single exercise on rest the next day', () => {
    expect(
      suggestToday(['push-ups'], [{ exerciseId: 'push-ups', date: '2026-10-26' }], '2026-10-27'),
    ).toEqual({ kind: 'rest', because: 'need-a-day-off' });
  });

  it('brings an exercise back after a day off', () => {
    expect(
      suggestToday(['push-ups'], [{ exerciseId: 'push-ups', date: '2026-10-25' }], '2026-10-27'),
    ).toEqual({ kind: 'due', exerciseId: 'push-ups' });
  });

  it('stops suggesting more work after a session today', () => {
    expect(
      suggestToday(ids, [{ exerciseId: 'push-ups', date: '2026-10-27' }], '2026-10-27'),
    ).toEqual({ kind: 'rest', because: 'worked-today' });
  });

  it('returns to the exercise that has been resting longer', () => {
    expect(
      suggestToday(
        ids,
        [
          { exerciseId: 'pull-ups', date: '2026-10-25' },
          { exerciseId: 'push-ups', date: '2026-10-26' },
        ],
        '2026-10-27',
      ),
    ).toEqual({ kind: 'due', exerciseId: 'pull-ups' });
  });
});
