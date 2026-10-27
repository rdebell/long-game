import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { playBeep, vibrateAlert } from '../audio';
import { formatClock, formatSetReps, buildWorkout, type WorkoutTemplate } from '../progression/plan';
import { Button, Dialog, IconButton, Stepper } from '../components/ui';
import { useExercise, useStore } from '../store';
import { exerciseColor } from '../templates';

interface Session {
  name: string;
  color: string;
  week: number;
  day: number;
  workout: WorkoutTemplate;
}

export function WorkoutScreen() {
  const { id = '' } = useParams();
  const exercise = useExercise(id);
  const navigate = useNavigate();
  const { completeWorkout, state, setSound } = useStore();
  const sessionRef = useRef<Session | null>(null);
  if (exercise && !exercise.needsTest && exercise.status !== 'complete' && !sessionRef.current) {
    sessionRef.current = {
      name: exercise.name,
      color: exerciseColor(exercise.name),
      week: exercise.week,
      day: exercise.day,
      workout: buildWorkout(exercise.plan, exercise.week, exercise.day),
    };
  }
  const session = sessionRef.current;
  const sets = session?.workout.sets ?? [];
  const [setIndex, setSetIndex] = useState(0);
  const [actual, setActual] = useState(sets[0]?.reps ?? 0);
  const [editing, setEditing] = useState(false);
  const [logged, setLogged] = useState<number[]>([]);
  const [phase, setPhase] = useState<'work' | 'rest' | 'go' | 'result'>('work');
  const [restLeft, setRestLeft] = useState(0);
  const [quitOpen, setQuitOpen] = useState(false);
  const [decision, setDecision] = useState<ReturnType<typeof completeWorkout> | null>(null);
  const endRef = useRef(0);
  const saving = useRef(false);
  const soundRef = useRef(state.settings.soundEnabled);
  soundRef.current = state.settings.soundEnabled;

  useEffect(() => {
    if (phase !== 'rest') return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000));
      setRestLeft(left);
      if (left <= 0) {
        window.clearInterval(timer);
        alertUser();
        setPhase('go');
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'go') return;
    const timer = window.setTimeout(() => advanceSet(), 900);
    return () => window.clearTimeout(timer);
    // advanceSet is recreated each render; the timeout only needs to start once per go phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function alertUser() {
    if (!soundRef.current) return;
    playBeep();
    vibrateAlert();
  }

  function advanceSet() {
    setPhase('work');
    setSetIndex((index) => {
      const next = index + 1;
      setActual(sets[next]?.reps ?? 0);
      setEditing(false);
      return next;
    });
  }

  function beginRest() {
    const seconds = session?.workout.restSec ?? 60;
    endRef.current = Date.now() + seconds * 1000;
    setRestLeft(seconds);
    setPhase('rest');
  }

  function finishSet() {
    if (!session || saving.current || phase !== 'work') return;
    const nextLogged = [...logged, actual];
    setLogged(nextLogged);
    if (setIndex < sets.length - 1) {
      beginRest();
      return;
    }
    saving.current = true;
    const result = completeWorkout(id, nextLogged);
    setDecision(result);
    setPhase('result');
  }

  if (!exercise) {
    return (
      <div className="workout">
        <p className="page-pad">That exercise isn’t on this device.</p>
        <Button onClick={() => navigate('/')}>Back</Button>
      </div>
    );
  }
  if (exercise.needsTest) {
    return (
      <div className="workout">
        <p className="page-pad">Log a max test before the first workout.</p>
        <Button onClick={() => navigate(`/test/${exercise.id}?mode=initial`)}>Max test</Button>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="workout">
        <p className="page-pad">This plan is finished. Edit the goal if you want to keep going.</p>
        <Button onClick={() => navigate(`/changing/${exercise.id}`)}>Edit plan</Button>
      </div>
    );
  }

  const current = sets[Math.min(setIndex, sets.length - 1)];
  const displayIndex = phase === 'rest' || phase === 'go' ? setIndex + 1 : setIndex;
  const upcoming = sets[displayIndex];
  const crossedWeek =
    decision?.result === 'hit' && !decision.finished && decision.nextDay === 1 && decision.nextWeek !== session.week;

  return (
    <div className={`workout ${phase === 'go' ? 'flash' : ''}`}>
      <div className="sr-only" aria-live="assertive">
        {phase === 'result' ? decision?.message : phase === 'go' ? 'Rest finished' : ''}
      </div>
      <header className="topbar">
        <IconButton label="Quit workout" name="close" onClick={() => setQuitOpen(true)} />
        <p className="set-count">
          Set {Math.min(displayIndex + 1, sets.length)} of {sets.length}
        </p>
        <IconButton
          label={state.settings.soundEnabled ? 'Turn sound off' : 'Turn sound on'}
          name={state.settings.soundEnabled ? 'speaker' : 'speaker-off'}
          pressed={state.settings.soundEnabled}
          onClick={() => setSound(!state.settings.soundEnabled)}
        />
      </header>
      <div className="set-strip" aria-label="Sets">
        {sets.map((set, index) => {
          const done = index < displayIndex || phase === 'result';
          const active = index === displayIndex && phase !== 'result';
          const text = done && logged[index] !== undefined ? String(logged[index]) : formatSetReps(set.reps, set.isMax);
          return (
            <span key={index} className={`set-pill ${active ? 'current' : ''} ${done ? 'done' : ''}`}>
              {text}
            </span>
          );
        })}
      </div>
      {phase === 'result' && decision ? (
        <div className="workout-body">
          <p className={`result-title ${decision.result}`}>{decision.message}</p>
          <p className="result-next">
            {decision.finished
              ? 'Raise the goal in Edit plan if you want the numbers to keep climbing.'
              : decision.result === 'hit'
                ? `Next up is week ${decision.nextWeek}, day ${decision.nextDay}.`
                : `Week ${session.week}, day ${session.day} stays the same.`}
          </p>
          <ul className="result-sets">
            {sets.map((set, index) => (
              <li key={index} className={logged[index] < set.reps ? 'missed' : ''}>
                <span>{formatSetReps(set.reps, set.isMax)}</span>
                <span>{logged[index]}</span>
              </li>
            ))}
          </ul>
          <Button onClick={() => navigate(`/exercise/${exercise.id}`, { replace: true })}>Done</Button>
          {crossedWeek || decision.finished ? (
            <Button variant="ghost" onClick={() => navigate(`/test/${exercise.id}?mode=retest`)}>
              Log a max test
            </Button>
          ) : null}
        </div>
      ) : phase === 'rest' || phase === 'go' ? (
        <div className="workout-body">
          <p className="kicker">{phase === 'go' ? 'Go' : 'Rest'}</p>
          <p className="big-num">{phase === 'go' ? 'Go' : formatClock(restLeft)}</p>
          {upcoming ? (
            <p className="next-set">
              Next set · {formatSetReps(upcoming.reps, upcoming.isMax)}
            </p>
          ) : null}
          {phase === 'rest' ? (
            <Button
              variant="ghost"
              onClick={() => {
                alertUser();
                advanceSet();
              }}
            >
              Skip rest
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="workout-body">
            <p className="kicker" style={{ color: session.color }}>
              {session.name}
            </p>
            <p className="day-label">
              Week {session.week} · Day {session.day}
            </p>
            <p className="big-num">{formatSetReps(current.reps, current.isMax)}</p>
            <p className="target-note">
              {current.isMax ? 'As many as you can. At least this many.' : 'Target reps'}
            </p>
            {editing ? (
              <Stepper label="Actual reps" value={actual} min={0} max={999} onChange={setActual} />
            ) : null}
          </div>
          <footer className="workout-footer">
            <IconButton
              label={editing ? 'Hide actual reps' : 'Edit actual reps'}
              name="pencil"
              pressed={editing}
              onClick={() => setEditing((open) => !open)}
            />
            <Button onClick={finishSet}>Completed</Button>
          </footer>
        </>
      )}
      <Dialog
        open={quitOpen}
        title="Quit this workout?"
        body="Nothing is saved. This week and day stay where they are."
        confirmLabel="Quit"
        danger
        onCancel={() => setQuitOpen(false)}
        onConfirm={() => navigate(`/exercise/${exercise.id}`, { replace: true })}
      />
    </div>
  );
}
