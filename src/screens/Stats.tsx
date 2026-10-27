import { useState } from 'react';
import { Chart } from '../components/Chart';
import { Screen } from '../components/ui';
import { useStore } from '../store';
import { exerciseColor } from '../templates';
import { HistoryList, useChart } from './History';

export function Stats() {
  const { state } = useStore();
  const [selected, setSelected] = useState(state.exercises[0]?.id ?? '');
  const exercise = state.exercises.find((item) => item.id === selected) ?? state.exercises[0];
  const points = useChart(exercise?.id ?? '');

  return (
    <Screen tabs>
      <header className="page-head">
        <p className="brand">Long Game</p>
        <h1>Stats</h1>
      </header>
      {state.exercises.length === 0 || !exercise ? (
        <p className="empty-copy">Add an exercise to see progress.</p>
      ) : (
        <>
          <div className="chip-row" role="tablist" aria-label="Exercise">
            {state.exercises.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === exercise.id}
                className={item.id === exercise.id ? 'chip on' : 'chip'}
                onClick={() => setSelected(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <section className="panel">
            {points.length === 0 ? (
              <p className="empty-copy">The line starts after the first workout or max test. The goal is {exercise.plan.goal}.</p>
            ) : (
              <Chart points={points} goal={exercise.plan.goal} color={exerciseColor(exercise.name)} />
            )}
          </section>
          <HistoryList exerciseId={exercise.id} />
        </>
      )}
    </Screen>
  );
}
