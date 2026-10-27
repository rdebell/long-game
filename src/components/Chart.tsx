export function Chart({
  points,
  goal,
  color,
}: {
  points: { value: number }[];
  goal: number;
  color: string;
}) {
  const width = 320;
  const height = 168;
  const padX = 16;
  const padY = 22;
  const max = Math.max(goal, ...points.map((point) => point.value), 1);
  const y = (value: number) => height - padY - (value / max) * (height - padY * 2);
  const x = (index: number) =>
    points.length <= 1 ? width / 2 : padX + (index / (points.length - 1)) * (width - padX * 2);
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.value)}`).join(' ');
  const goalY = y(goal);

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Max reps over time, goal ${goal}`}>
      <line className="goal-line" x1={padX} x2={width - padX} y1={goalY} y2={goalY} />
      <text className="goal-label" x={padX} y={Math.max(14, goalY - 6)}>
        Goal {goal}
      </text>
      {points.length > 1 ? <path d={path} fill="none" stroke={color} strokeWidth="2.5" /> : null}
      {points.map((point, index) => (
        <circle key={`${point.value}-${index}`} cx={x(index)} cy={y(point.value)} r="4.5" fill={color} />
      ))}
    </svg>
  );
}
