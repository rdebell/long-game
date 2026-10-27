/** Shortcuts name the Log to Health button opens, unless Settings has another name. */
export const DEFAULT_HEALTH_SHORTCUT_NAME = 'Long Game to Health';

/** 15:04 to 15:16 is 12 minutes. The help page and the README use this window. */
export const HEALTH_EXAMPLE_START = '2026-10-27T15:04:00.000Z';
export const HEALTH_EXAMPLE_END = '2026-10-27T15:16:00.000Z';

export interface HealthSettings {
  healthLogEnabled: boolean;
  healthShortcutName: string;
}

export function defaultHealthSettings(): HealthSettings {
  return {
    healthLogEnabled: true,
    healthShortcutName: DEFAULT_HEALTH_SHORTCUT_NAME,
  };
}

/** Missing keys keep the feature on and the default shortcut name, so older saves still load. */
export function readHealthSettings(item: Record<string, unknown>): HealthSettings {
  const name = typeof item.healthShortcutName === 'string' ? item.healthShortcutName.trim() : '';
  return {
    healthLogEnabled: item.healthLogEnabled !== false,
    healthShortcutName: name || DEFAULT_HEALTH_SHORTCUT_NAME,
  };
}

/** Nearest whole minute between start and end. A short or unreadable session still counts as 1. */
export function workoutDurationMinutes(startedAt: string, endedAt: string): number {
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 1;
  return Math.max(1, Math.round((endMs - startMs) / 60_000));
}

export interface HealthPayload {
  minutes: number;
  start: string;
  text: string;
}

/**
 * Text passed as the shortcut input.
 * `{"minutes":12,"start":"2026-10-27T15:04:00.000Z"}`
 * The clipboard fallback is only the minutes (`healthClipboardText`).
 */
export function healthPayloadText(startedAt: string, endedAt: string): HealthPayload {
  const minutes = workoutDurationMinutes(startedAt, endedAt);
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  const start = Number.isFinite(startMs)
    ? new Date(startMs).toISOString()
    : Number.isFinite(endMs)
      ? new Date(endMs).toISOString()
      : new Date(0).toISOString();
  return { minutes, start, text: JSON.stringify({ minutes, start }) };
}

export function healthClipboardText(minutes: number): string {
  if (!Number.isFinite(minutes)) return '1';
  return String(Math.max(1, Math.round(minutes)));
}

/** `shortcuts://run-shortcut?name=<name>&input=text&text=<payload>` */
export function healthShortcutUrl(shortcutName: string, payloadText: string): string {
  const name = shortcutName.trim() || DEFAULT_HEALTH_SHORTCUT_NAME;
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(payloadText)}`;
}

export function healthHandoff(startedAt: string, endedAt: string, shortcutName: string) {
  const payload = healthPayloadText(startedAt, endedAt);
  return {
    ...payload,
    clipboard: healthClipboardText(payload.minutes),
    url: healthShortcutUrl(shortcutName, payload.text),
  };
}

/** Copy the minute count. Selection copy runs first so the tap's user activation is still valid. */
export function copyHealthMinutes(minutes: number): Promise<boolean> {
  const text = healthClipboardText(minutes);
  if (copyWithSelection(text)) return Promise.resolve(true);
  const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
  if (!clipboard?.writeText) return Promise.resolve(false);
  return clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

function copyWithSelection(text: string): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
