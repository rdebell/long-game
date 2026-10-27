import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildWorkout, formatClock, medianPositive, planFromPosition } from '../progression/plan';
import { RepLine } from '../components/Reps';
import { Button, IconButton, Screen, Stepper } from '../components/ui';
import { useExercise, useStore } from '../store';

export function ChangingScreen() {
  const { id = '' } = useParams();
  const exercise = useExercise(id);
  const navigate = useNavigate();
  const { saveExercise } = useStore();
  const initialPeak = exercise ? buildWorkout(exercise.plan, exercise.week, exercise.day).sets.at(-1)?.reps ?? 1 : 1;
  const [goal, setGoal] = useState(exercise?.plan.goal ?? 20);
  const [weeks, setWeeks] = useState(exercise?.plan.weeks ?? 12);
  const [daysPerWeek, setDaysPerWeek] = useState(exercise?.plan.daysPerWeek ?? 3);
  const [sets, setSets] = useState(exercise?.plan.sets ?? 5);
  const [restBase, setRestBase] = useState(exercise?.plan.restBaseSec ?? 60);
  const [restIncrease, setRestIncrease] = useState(exercise?.plan.restIncreasePerWeekSec ?? 15);
  const [week, setWeek] = useState(exercise?.week ?? 1);
  const [day, setDay] = useState(exercise?.day ?? 1);
  const [dayPeak, setDayPeak] = useState(initialPeak);
  const [recent, setRecent] = useState(['', '', '']);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const calibration = medianPositive(recent.map((value) => Number(value))) ?? dayPeak;
  const preview = useMemo(() => {
    if (!exercise || exercise.needsTest || calibration > goal) return null;
    return planFromPosition({
      goal,
      weeks,
      daysPerWeek,
      sets,
      restBaseSec: restBase,
      restIncreasePerWeekSec: restIncrease,
      atWeek: week,
      atDay: Math.min(day, daysPerWeek),
      dayPeak: calibration,
    });
  }, [exercise, calibration, goal, weeks, daysPerWeek, sets, restBase, restIncrease, week, day]);

  if (!exercise) {
    return (
      <Screen>
        <p className="page-pad">That exercise isn’t on this device.</p>
      </Screen>
    );
  }

  const previewWorkout = preview
    ? buildWorkout(preview.plan, Math.min(week, preview.plan.weeks), Math.min(day, preview.plan.daysPerWeek))
    : null;

  function save() {
    const result = saveExercise(exercise!.id, {
      goal,
      weeks,
      daysPerWeek,
      sets,
      restBaseSec: restBase,
      restIncreasePerWeekSec: restIncrease,
      week,
      day: Math.min(day, daysPerWeek),
      dayPeak: calibration,
    });
    if (result.error) {
      setError(result.error);
      return;
    }
    const bits = [
      result.extended ? `Period is now long enough to include week ${week}.` : '',
      result.steep ? 'This period ends soon, so the reps jump quickly. Add weeks for a slower climb.' : '',
    ].filter(Boolean);
    if (bits.length) {
      setNote(bits.join(' '));
      setError('');
      return;
    }
    navigate(`/exercise/${exercise!.id}`);
  }

  return (
    <Screen
      footer={
        <footer className="sticky-footer">
          <IconButton label="Cancel" name="close" onClick={() => navigate(`/exercise/${exercise.id}`)} />
          <Button onClick={save}>Save</Button>
        </footer>
      }
    >
      <header className="page-head">
        <p className="kicker">{exercise.name}</p>
        <h1>Changing the workout</h1>
      </header>
      <Stepper label="Goal" hint="The last set reaches this number at the end of the period." value={goal} min={1} max={500} onChange={setGoal} />
      <Stepper label="Period" hint="Program length in weeks." value={weeks} min={1} max={36} onChange={setWeeks} format={(value) => `${value} weeks`} />
      <Stepper label="Schedule" hint="Training days each week." value={daysPerWeek} min={1} max={7} onChange={setDaysPerWeek} format={(value) => `${value} days a week`} />
      <Stepper label="Sets" hint="Sets in each workout. The last one is a max set." value={sets} min={1} max={8} onChange={setSets} format={(value) => `${value} sets`} />
      <Stepper label="Rest" hint="Base rest between sets." value={restBase} min={15} max={300} step={15} onChange={setRestBase} format={formatClock} />
      <Stepper label="Weekly rest increase" hint="Added to the rest each new week." value={restIncrease} min={0} max={60} step={15} onChange={setRestIncrease} format={(value) => `+${formatClock(value)}`} />
      {exercise.needsTest ? (
        <p className="note">Position starts after the max test. Save updates the goal and the shape of the plan.</p>
      ) : (
        <>
          <h2 className="section-title">Where you are</h2>
          <Stepper label="Week" value={week} min={1} max={36} onChange={setWeek} />
          <Stepper label="Day" value={Math.min(day, daysPerWeek)} min={1} max={daysPerWeek} onChange={setDay} />
          <Stepper
            label="Max set for this day"
            hint="The last set will ask for at least this many. History stays either way."
            value={dayPeak}
            min={1}
            max={500}
            onChange={setDayPeak}
          />
          <fieldset className="recent">
            <legend>Recent max sets</legend>
            <p>Optional. If you fill these in, their median replaces the max set above.</p>
            <div className="recent-row">
              {recent.map((value, index) => (
                <input
                  key={index}
                  inputMode="numeric"
                  aria-label={`Recent max set ${index + 1}`}
                  value={value}
                  placeholder="—"
                  onChange={(event) => {
                    const next = recent.slice();
                    next[index] = event.target.value.replace(/[^\d]/g, '');
                    setRecent(next);
                  }}
                />
              ))}
            </div>
          </fieldset>
          {previewWorkout ? (
            <div className="preview">
              <p className="kicker">This day</p>
              <RepLine sets={previewWorkout.sets} />
              {preview?.extended ? <p className="note">The period was lengthened so this week still exists.</p> : null}
              {preview?.steep ? <p className="note">The climb is steep. Add weeks if you want smaller jumps.</p> : null}
            </div>
          ) : (
            <p className="error" role="alert">
              The goal has to be at least this day's max set.
            </p>
          )}
        </>
      )}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? (
        <div className="note-block">
          <p>{note}</p>
          <Button onClick={() => navigate(`/exercise/${exercise.id}`)}>Done</Button>
        </div>
      ) : null}
    </Screen>
  );
}
