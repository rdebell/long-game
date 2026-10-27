import { chartPoints } from '../state/logic';
import type { LogEntry } from '../state/types';
import { useStore } from '../store';

export function HistoryList({ exerciseId }: { exerciseId: string }) {
  const { state } = useStore();
  const logs = state.logs.filter((log) => log.exerciseId === exerciseId);
  if (logs.length === 0) {
    return <p className="empty-copy">No sessions yet. A finished workout or a max test will show up here, including repeats.</p>;
  }
  return (
    <ol className="log-list">
      {logs.map((log) => (
        <li key={log.id}>
          <LogRow log={log} />
        </li>
      ))}
    </ol>
  );
}

function LogRow({ log }: { log: LogEntry }) {
  const when = new Date(log.completedAt);
  const label = Number.isNaN(when.getTime())
    ? log.completedAt
    : when.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const title =
    log.kind === 'test' ? `Max test · ${log.maxReps ?? log.actuals[0] ?? 0}` : `Week ${log.week} · Day ${log.day}`;
  return (
    <article className="log-item">
      <div>
        <p className={log.result === 'miss' ? 'missed' : log.result === 'hit' ? 'hit' : ''}>
          {log.result === 'hit' ? 'Hit' : log.result === 'miss' ? 'Miss' : 'Test'}
        </p>
        <h3>{title}</h3>
        {log.kind === 'workout' ? <p className="log-reps">{log.actuals.join('  ')}</p> : null}
      </div>
      <time dateTime={log.completedAt}>{label}</time>
    </article>
  );
}

export function useChart(exerciseId: string) {
  const { state } = useStore();
  const logs = state.logs.filter((log) => log.exerciseId === exerciseId);
  return chartPoints(logs);
}
