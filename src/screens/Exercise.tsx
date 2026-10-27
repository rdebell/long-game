import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buildWorkout, formatClock, sessionIndex } from '../progression/plan';
import { RepLine } from '../components/Reps';
import { Icon } from '../components/Icons';
import { Button, Dialog, IconButton, Screen } from '../components/ui';
import { useExercise } from '../store';

export function ExerciseScreen() {
  const { id = '' } = useParams();
  const exercise = useExercise(id);
  const navigate = useNavigate();
  const scroller = useRef<HTMLDivElement>(null);
  const currentCard = useRef<HTMLElement>(null);
  const [restartOpen, setRestartOpen] = useState(false);

  const days = useMemo(() => {
    if (!exercise) return [];
    const list = [];
    for (let week = 1; week <= exercise.plan.weeks; week += 1) {
      for (let day = 1; day <= exercise.plan.daysPerWeek; day += 1) {
        list.push(buildWorkout(exercise.plan, week, day));
      }
    }
    return list;
  }, [exercise]);

  useEffect(() => {
    currentCard.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [exercise?.id, exercise?.week, exercise?.day, days.length]);

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

  const currentIndex = sessionIndex(exercise.week, exercise.day, exercise.plan.daysPerWeek);

  return (
    <Screen>
      <header className="topbar">
        <IconButton label="Back to workouts" name="back" onClick={() => navigate('/')} />
        <h1>{exercise.name}</h1>
        <IconButton label="Progress chart" name="chart" onClick={() => navigate(`/progress/${exercise.id}`)} />
      </header>
      <div className="goal-row">
        <div>
          <p className="kicker">Goal</p>
          <p className="goal-num">{exercise.plan.goal}</p>
        </div>
        <Button variant="ghost" onClick={() => setRestartOpen(true)}>
          Restart
        </Button>
      </div>
      <div className="inline-actions">
        <Button variant="ghost" onClick={() => navigate(`/changing/${exercise.id}`)}>
          Edit plan
        </Button>
        {exercise.needsTest ? null : (
          <Button variant="ghost" onClick={() => navigate(`/test/${exercise.id}?mode=retest`)}>
            Retest
          </Button>
        )}
      </div>
      {exercise.status === 'complete' ? (
        <p className="note">This plan is finished. Edit it to raise the goal and keep going.</p>
      ) : null}
      <div className="carousel-wrap">
        <div className="carousel" ref={scroller}>
          {days.map((day) => {
            const index = sessionIndex(day.week, day.day, exercise.plan.daysPerWeek);
            const place =
              exercise.status === 'complete' || index < currentIndex ? 'past' : index === currentIndex ? 'current' : 'future';
            return (
              <article
                key={`${day.week}-${day.day}`}
                ref={place === 'current' ? currentCard : undefined}
                className={`day-card ${place}`}
                aria-label={`Week ${day.week}, day ${day.day}`}
              >
                <p className="kicker">Week {day.week}</p>
                <div className="day-title">
                  <h2>Day {day.day}</h2>
                  {place === 'past' ? (
                    <span className="check" aria-label="Completed">
                      <Icon name="check" />
                    </span>
                  ) : null}
                </div>
                <RepLine sets={day.sets} />
                <p className="rest-note">Rest {formatClock(day.restSec)}</p>
                {place === 'current' && !exercise.needsTest ? (
                  <Button className="card-start" onClick={() => navigate(`/workout/${exercise.id}`)}>
                    Start
                  </Button>
                ) : null}
                {exercise.needsTest && place === 'current' ? (
                  <Button className="card-start" onClick={() => navigate(`/test/${exercise.id}?mode=initial`)}>
                    Max test
                  </Button>
                ) : null}
                {place === 'future' ? <p className="later">Later</p> : null}
              </article>
            );
          })}
        </div>
        <div className="carousel-nav">
          <Button
            variant="ghost"
            onClick={() => scroller.current?.scrollBy({ left: -280, behavior: 'smooth' })}
          >
            Previous
          </Button>
          <Button variant="ghost" onClick={() => scroller.current?.scrollBy({ left: 280, behavior: 'smooth' })}>
            Next
          </Button>
        </div>
      </div>
      <Dialog
        open={restartOpen}
        title="Restart this exercise?"
        body="Your history stays. The next step is a new max test, and the plan is built again from that number."
        confirmLabel="Restart"
        danger
        onCancel={() => setRestartOpen(false)}
        onConfirm={() => navigate(`/test/${exercise.id}?mode=initial`)}
      />
    </Screen>
  );
}
