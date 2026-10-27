import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dialog, IconButton, Screen } from '../components/ui';
import { useStore } from '../store';
import { TEMPLATES } from '../templates';

export function AllWorkouts() {
  const { state, removeExercise } = useStore();
  const navigate = useNavigate();
  const [removeId, setRemoveId] = useState<string | null>(null);
  const removing = state.exercises.find((exercise) => exercise.id === removeId);

  return (
    <Screen>
      <header className="topbar">
        <IconButton label="Back to workouts" name="back" onClick={() => navigate('/')} />
        <h1>All workouts</h1>
        <span />
      </header>
      <h2 className="section-title">Yours</h2>
      {state.exercises.length === 0 ? <p className="empty-copy">Nothing saved on this device yet.</p> : null}
      <ul className="plain-list">
        {state.exercises.map((exercise) => (
          <li key={exercise.id}>
            <Link to={exercise.needsTest ? `/test/${exercise.id}?mode=initial` : `/exercise/${exercise.id}`}>
              <strong>{exercise.name}</strong>
              <span>
                {exercise.needsTest
                  ? 'Max test'
                  : exercise.status === 'complete'
                    ? 'Complete'
                    : `Week ${exercise.week} · Day ${exercise.day}`}
              </span>
            </Link>
            <button type="button" className="text-danger" onClick={() => setRemoveId(exercise.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <h2 className="section-title">Add</h2>
      <div className="template-list">
        {TEMPLATES.map((template) => (
          <button
            key={template.name}
            type="button"
            className="template"
            onClick={() => navigate('/add', { state: { name: template.name, goal: template.goal } })}
          >
            <strong>{template.name}</strong>
            <span>Goal {template.goal}</span>
            <small>{template.note}</small>
          </button>
        ))}
        <button type="button" className="template" onClick={() => navigate('/add', { state: { name: '', goal: 20 } })}>
          <strong>Custom</strong>
          <span>Your own exercise and goal</span>
        </button>
      </div>
      <Dialog
        open={removing !== undefined && removing !== null}
        title={`Remove ${removing?.name ?? 'this exercise'}?`}
        body="Its log on this device will be deleted."
        confirmLabel="Remove"
        danger
        onCancel={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeId) removeExercise(removeId);
          setRemoveId(null);
        }}
      />
    </Screen>
  );
}
