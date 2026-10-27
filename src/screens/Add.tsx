import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, IconButton, Screen, Stepper } from '../components/ui';
import { useStore } from '../store';

export function AddExercise() {
  const navigate = useNavigate();
  const location = useLocation();
  const seed = (location.state ?? {}) as { name?: string; goal?: number };
  const { addExercise } = useStore();
  const [name, setName] = useState(seed.name ?? '');
  const [goal, setGoal] = useState(seed.goal ?? 20);
  const [mode, setMode] = useState<'test' | 'place'>('test');
  const [weeks, setWeeks] = useState(16);
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState(1);
  const [dayPeak, setDayPeak] = useState(10);
  const [error, setError] = useState('');

  function save() {
    const result = addExercise({
      name,
      goal,
      mode,
      weeks: Math.max(weeks, week),
      week,
      day,
      dayPeak,
    });
    if (result.error || !result.id) {
      setError(result.error ?? 'Could not add that exercise.');
      return;
    }
    if (mode === 'test') navigate(`/test/${result.id}?mode=initial`, { replace: true });
    else navigate(`/exercise/${result.id}`, { replace: true });
  }

  return (
    <Screen
      footer={
        <footer className="sticky-footer">
          <IconButton label="Cancel" name="close" onClick={() => navigate('/all')} />
          <Button onClick={save}>Add exercise</Button>
        </footer>
      }
    >
      <header className="page-head">
        <p className="kicker">New</p>
        <h1>Add an exercise</h1>
      </header>
      <label className="text-field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Dips" />
      </label>
      <Stepper label="Goal" value={goal} min={1} max={500} onChange={setGoal} />
      <div className="choice-row">
        <button type="button" className={mode === 'test' ? 'choice on' : 'choice'} onClick={() => setMode('test')}>
          Start with a max test
        </button>
        <button type="button" className={mode === 'place' ? 'choice on' : 'choice'} onClick={() => setMode('place')}>
          I’m already in a program
        </button>
      </div>
      {mode === 'place' ? (
        <>
          <Stepper label="Period" value={weeks} min={1} max={36} onChange={setWeeks} format={(value) => `${value} weeks`} />
          <Stepper label="Week" value={week} min={1} max={36} onChange={setWeek} />
          <Stepper label="Day" value={day} min={1} max={3} onChange={setDay} />
          <Stepper label="Max set for this day" value={dayPeak} min={1} max={500} onChange={setDayPeak} />
          {week > weeks ? <p className="note">The period will extend through week {week} so this day exists.</p> : null}
        </>
      ) : (
        <p className="note">You’ll enter one all-out set next. Week 1 is built from that number and the goal.</p>
      )}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </Screen>
  );
}
