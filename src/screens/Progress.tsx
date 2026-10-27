import { Link, useNavigate, useParams } from 'react-router-dom';
import { Chart } from '../components/Chart';
import { IconButton, Screen } from '../components/ui';
import { useExercise } from '../store';
import { exerciseColor } from '../templates';
import { HistoryList, useChart } from './History';

export function ProgressScreen() {
  const { id = '' } = useParams();
  const exercise = useExercise(id);
  const navigate = useNavigate();
  const points = useChart(id);

  if (!exercise) {
    return (
      <Screen>
        <p className="page-pad">That exercise isn’t on this device.</p>
        <Link className="btn primary" to="/">
          Back to workouts
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <header className="topbar">
        <IconButton label="Back" name="back" onClick={() => navigate(`/exercise/${exercise.id}`)} />
        <h1>{exercise.name}</h1>
        <span />
      </header>
      <section className="panel">
        <p className="kicker">Goal {exercise.plan.goal}</p>
        {points.length === 0 ? (
          <p className="empty-copy">No reps logged yet.</p>
        ) : (
          <Chart points={points} goal={exercise.plan.goal} color={exerciseColor(exercise.name)} />
        )}
      </section>
      <HistoryList exerciseId={exercise.id} />
    </Screen>
  );
}
