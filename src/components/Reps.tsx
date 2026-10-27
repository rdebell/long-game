import { formatSetReps, type WorkoutSet } from '../progression/plan';

export function RepLine({ sets, actuals }: { sets: WorkoutSet[]; actuals?: number[] }) {
  return (
    <p className="rep-line">
      {sets.map((set, index) => {
        const missed = actuals !== undefined && actuals[index] < set.reps;
        const label = actuals ? String(actuals[index]) : formatSetReps(set.reps, set.isMax);
        return (
          <span key={index} className={`${set.isMax && !actuals ? 'is-max' : ''} ${missed ? 'missed' : ''}`.trim()}>
            {label}
          </span>
        );
      })}
    </p>
  );
}
