import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, IconButton, Screen, Stepper } from '../components/ui';
import { useExercise, useStore } from '../store';

export function TestScreen() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode') === 'retest' ? 'retest' : 'initial';
  const exercise = useExercise(id);
  const navigate = useNavigate();
  const { applyInitialTest, applyRetest } = useStore();
  const [reps, setReps] = useState(mode === 'retest' ? 10 : 5);

  if (!exercise) {
    return (
      <Screen>
        <p className="page-pad">That exercise isn’t on this device.</p>
      </Screen>
    );
  }

  function save() {
    if (!exercise) return;
    if (mode === 'retest') applyRetest(exercise.id, reps);
    else applyInitialTest(exercise.id, reps);
    navigate(`/exercise/${exercise.id}`, { replace: true });
  }

  return (
    <Screen
      footer={
        <footer className="sticky-footer">
          <IconButton label="Cancel" name="close" onClick={() => navigate(-1)} />
          <Button onClick={save}>Save test</Button>
        </footer>
      }
    >
      <header className="page-head">
        <p className="kicker">{exercise.name}</p>
        <h1>{mode === 'retest' ? 'Retest' : 'Max test'}</h1>
      </header>
      <p className="lead">
        {mode === 'retest'
          ? 'Do one all-out set. The workouts still ahead are redrawn from 75% of this number, toward the same goal. History stays.'
          : `Do one all-out set. Week 1 starts near 60% of it and climbs to ${exercise.plan.goal}.`}
      </p>
      <Stepper label="Clean reps" value={reps} min={0} max={500} onChange={setReps} />
    </Screen>
  );
}
