export interface SuggestionDue {
  kind: 'due';
  exerciseId: string;
}

export interface SuggestionRest {
  kind: 'rest';
  because: 'worked-today' | 'need-a-day-off';
}

export type Suggestion = SuggestionDue | SuggestionRest;

export function daysBetween(earlier: string, later: string): number {
  const a = Date.parse(`${earlier}T00:00:00Z`);
  const b = Date.parse(`${later}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * One exercise per calendar day, alternating through the list.
 * The same exercise needs at least one full day off between sessions.
 */
export function suggestToday(
  exerciseIds: string[],
  sessions: { exerciseId: string; date: string }[],
  today: string,
): Suggestion {
  if (exerciseIds.length === 0) {
    return { kind: 'rest', because: 'need-a-day-off' };
  }
  if (sessions.some((session) => session.date === today && exerciseIds.includes(session.exerciseId))) {
    return { kind: 'rest', because: 'worked-today' };
  }

  const lastById = new Map<string, string>();
  for (const session of sessions) {
    if (!exerciseIds.includes(session.exerciseId)) continue;
    const prev = lastById.get(session.exerciseId);
    if (!prev || session.date > prev) lastById.set(session.exerciseId, session.date);
  }

  const eligible = exerciseIds.filter((id) => {
    const last = lastById.get(id);
    if (!last) return true;
    return daysBetween(last, today) >= 2;
  });
  if (eligible.length === 0) return { kind: 'rest', because: 'need-a-day-off' };

  const latest = sessions
    .filter((session) => exerciseIds.includes(session.exerciseId))
    .reduce<{ exerciseId: string; date: string } | null>((best, session) => {
      if (!best || session.date > best.date) return session;
      return best;
    }, null);

  if (!latest) {
    const day = Number(today.slice(8, 10));
    const index = Number.isFinite(day) ? day % eligible.length : 0;
    return { kind: 'due', exerciseId: eligible[index] };
  }

  const pool = eligible.filter((id) => id !== latest.exerciseId);
  const candidates = pool.length > 0 ? pool : eligible;
  const ranked = [...candidates].sort((a, b) => {
    const left = lastById.get(a);
    const right = lastById.get(b);
    if (!left && !right) return exerciseIds.indexOf(a) - exerciseIds.indexOf(b);
    if (!left) return -1;
    if (!right) return 1;
    if (left !== right) return left < right ? -1 : 1;
    return exerciseIds.indexOf(a) - exerciseIds.indexOf(b);
  });
  return { kind: 'due', exerciseId: ranked[0] };
}
