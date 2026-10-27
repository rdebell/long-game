import { Link } from 'react-router-dom';
import { suggestToday } from '../progression/schedule';
import { toDateKey } from '../state/logic';
import { useStore } from '../store';
import { exerciseColor } from '../templates';
import { Screen } from '../components/ui';

export function Home() {
  const { state } = useStore();
  const today = toDateKey(new Date().toISOString());
  const trainable = state.exercises.filter((exercise) => exercise.status === 'active' && !exercise.needsTest);
  const sessions = state.logs
    .filter((log) => log.kind === 'workout')
    .map((log) => ({ exerciseId: log.exerciseId, date: toDateKey(log.completedAt) }));
  const suggestion = suggestToday(
    trainable.map((exercise) => exercise.id),
    sessions,
    today,
  );
  const dueId = suggestion.kind === 'due' ? suggestion.exerciseId : null;
  const dueName = state.exercises.find((exercise) => exercise.id === dueId)?.name;

  let title = 'Rest day';
  let body = 'Each exercise needs a day off between sessions.';
  if (suggestion.kind === 'due' && dueName) {
    title = dueName;
    body = 'Due today. Exercises alternate, and the same one waits at least a day.';
  } else if (suggestion.kind === 'rest' && suggestion.because === 'worked-today') {
    title = 'That’s enough for today';
    body = 'Come back tomorrow. The other exercise will be waiting.';
  }

  return (
    <Screen tabs>
      <header className="page-head">
        <p className="brand">Long Game</p>
        <h1>Workouts</h1>
      </header>
      <section className="today" aria-label="Today">
        <p className="kicker">Today</p>
        <h2>{title}</h2>
        <p>{body}</p>
      </section>
      {state.exercises.length === 0 ? (
        <div className="empty">
          <p>No exercises yet.</p>
          <Link className="btn primary" to="/all">
            Add an exercise
          </Link>
        </div>
      ) : (
        <div className="stack">
          {state.exercises.map((exercise) => {
            const to = exercise.needsTest ? `/test/${exercise.id}?mode=initial` : `/exercise/${exercise.id}`;
            return (
              <Link key={exercise.id} to={to} className="workout-card" style={{ borderLeftColor: exerciseColor(exercise.name) }}>
                <div className="card-top">
                  <p className="kicker">{exercise.name}</p>
                  {exercise.id === dueId ? <span className="pill">Due today</span> : null}
                </div>
                <p className="goal-line">Goal {exercise.plan.goal}</p>
                {exercise.needsTest ? (
                  <p className="position">Max test</p>
                ) : exercise.status === 'complete' ? (
                  <p className="position">Plan complete</p>
                ) : (
                  <div className="position-row">
                    <div>
                      <p className="kicker">Week</p>
                      <p className="position">{exercise.week}</p>
                    </div>
                    <div>
                      <p className="kicker">Day</p>
                      <p className="position">{exercise.day}</p>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
      <Link className="btn ghost wide" to="/all">
        All workouts
      </Link>
    </Screen>
  );
}
