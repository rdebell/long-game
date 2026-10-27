export interface ExerciseTemplate {
  name: string;
  goal: number;
  note: string;
}

export const TEMPLATES: ExerciseTemplate[] = [
  { name: 'Pull-ups', goal: 20, note: 'Palms away. A fresh one starts at a goal of 20.' },
  { name: 'Push-ups', goal: 100, note: 'Chest to the floor, arms lock out.' },
  { name: 'Chin-ups', goal: 20, note: 'Palms toward you.' },
  { name: 'Dips', goal: 30, note: 'Bars or rings, shoulders down.' },
  { name: 'Squats', goal: 50, note: 'Bodyweight, full depth.' },
  { name: 'Sit-ups', goal: 40, note: 'Shoulders reach the knees.' },
];

export function exerciseColor(name: string): string {
  const known: Record<string, string> = {
    'pull-ups': '#C4501A',
    'push-ups': '#1F6F5B',
    'chin-ups': '#8C3B2A',
    dips: '#2C4A6E',
    squats: '#8A5A2A',
    'sit-ups': '#6B3A4A',
  };
  return known[name.toLowerCase()] ?? '#5C5346';
}
