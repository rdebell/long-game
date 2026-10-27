import { describe, expect, it } from 'vitest';
import readme from '../README.md?raw';
import {
  DEFAULT_HEALTH_SHORTCUT_NAME,
  HEALTH_EXAMPLE_END,
  HEALTH_EXAMPLE_START,
  healthClipboardText,
  healthHandoff,
  healthPayloadText,
  healthShortcutUrl,
  readHealthSettings,
  workoutDurationMinutes,
} from './health';

const START = '2026-10-27T15:00:00.000Z';

function after(ms: number): string {
  return new Date(Date.parse(START) + ms).toISOString();
}

describe('workout duration', () => {
  it('rounds to the nearest minute and never goes below 1', () => {
    expect(workoutDurationMinutes(START, START)).toBe(1);
    expect(workoutDurationMinutes(START, after(29_000))).toBe(1);
    expect(workoutDurationMinutes(START, after(30_000))).toBe(1);
    expect(workoutDurationMinutes(START, after(89_000))).toBe(1);
    expect(workoutDurationMinutes(START, after(90_000))).toBe(2);
    expect(workoutDurationMinutes(START, after(10 * 60_000))).toBe(10);
    expect(workoutDurationMinutes(START, after(10 * 60_000 + 29_000))).toBe(10);
    expect(workoutDurationMinutes(START, after(10 * 60_000 + 30_000))).toBe(11);
    expect(workoutDurationMinutes(after(60_000), START)).toBe(1);
    expect(workoutDurationMinutes('nope', START)).toBe(1);
    expect(workoutDurationMinutes(START, 'nope')).toBe(1);
  });
});

describe('Health shortcut payload', () => {
  it('builds JSON the shortcut can read and a minutes-only clipboard fallback', () => {
    const payload = healthPayloadText(HEALTH_EXAMPLE_START, HEALTH_EXAMPLE_END);
    expect(payload).toEqual({
      minutes: 12,
      start: HEALTH_EXAMPLE_START,
      text: '{"minutes":12,"start":"2026-10-27T15:04:00.000Z"}',
    });
    expect(healthClipboardText(payload.minutes)).toBe('12');
    expect(healthClipboardText(0)).toBe('1');
    expect(healthClipboardText(Number.NaN)).toBe('1');
  });

  it('opens shortcuts://run-shortcut with the name and the JSON text', () => {
    const payload = '{"minutes":12,"start":"2026-10-27T15:04:00.000Z"}';
    expect(healthShortcutUrl(DEFAULT_HEALTH_SHORTCUT_NAME, payload)).toBe(
      'shortcuts://run-shortcut?name=Long%20Game%20to%20Health&input=text&text=%7B%22minutes%22%3A12%2C%22start%22%3A%222026-10-27T15%3A04%3A00.000Z%22%7D',
    );
    expect(healthShortcutUrl('  ', payload)).toContain('name=Long%20Game%20to%20Health');
    expect(healthShortcutUrl('A & B', payload)).toContain('name=A%20%26%20B');
  });

  it('uses the end time when the start time cannot be read', () => {
    const payload = healthPayloadText('nope', HEALTH_EXAMPLE_END);
    expect(payload.minutes).toBe(1);
    expect(payload.start).toBe(HEALTH_EXAMPLE_END);
    expect(JSON.parse(payload.text)).toEqual({ minutes: 1, start: HEALTH_EXAMPLE_END });
  });

  it('matches the URL and payload printed in the README', () => {
    const handoff = healthHandoff(HEALTH_EXAMPLE_START, HEALTH_EXAMPLE_END, DEFAULT_HEALTH_SHORTCUT_NAME);
    expect(handoff.clipboard).toBe('12');
    expect(readme).toContain(handoff.text);
    expect(readme).toContain(handoff.url);
    expect(readme).toContain('Functional Strength Training');
    expect(readme).toContain('Get Dictionary from Input');
    expect(readme).toContain('Get Clipboard');
    expect(readme).toContain(DEFAULT_HEALTH_SHORTCUT_NAME);
  });
});

describe('Health settings defaults', () => {
  it('turns the feature on when an older save has no Health keys', () => {
    expect(readHealthSettings({})).toEqual({
      healthLogEnabled: true,
      healthShortcutName: DEFAULT_HEALTH_SHORTCUT_NAME,
    });
    expect(readHealthSettings({ healthLogEnabled: false, healthShortcutName: '  Desk  ' })).toEqual({
      healthLogEnabled: false,
      healthShortcutName: 'Desk',
    });
    expect(readHealthSettings({ healthShortcutName: '   ' }).healthShortcutName).toBe(DEFAULT_HEALTH_SHORTCUT_NAME);
  });
});
