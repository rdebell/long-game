type IconName =
  | 'close'
  | 'speaker'
  | 'speaker-off'
  | 'pencil'
  | 'chart'
  | 'check'
  | 'back'
  | 'workouts'
  | 'stats'
  | 'settings';

export function Icon({ name }: { name: IconName }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 24,
    height: 24,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      );
    case 'speaker':
      return (
        <svg {...common}>
          <path d="M4 10h3l5-4v12l-5-4H4z" />
          <path d="M16 9.5a3.5 3.5 0 010 5" />
          <path d="M18.5 7a7 7 0 010 10" />
        </svg>
      );
    case 'speaker-off':
      return (
        <svg {...common}>
          <path d="M4 10h3l5-4v12l-5-4H4z" />
          <path d="M17 10l4 4M21 10l-4 4" />
        </svg>
      );
    case 'pencil':
      return (
        <svg {...common}>
          <path d="M14 5l5 5-9.5 9.5H4.5V14.5z" />
          <path d="M12.5 6.5l5 5" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M6 16l4-5 3 3 5-7" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="M5 12.5l4.2 4.2L19 7" />
        </svg>
      );
    case 'back':
      return (
        <svg {...common}>
          <path d="M15 5L8 12l7 7" />
        </svg>
      );
    case 'workouts':
      return (
        <svg {...common}>
          <path d="M4 9h2v6H4zM18 9h2v6h-2zM6 11h12v2H6z" />
          <path d="M8 8h2v8H8zM14 8h2v8h-2z" />
        </svg>
      );
    case 'stats':
      return (
        <svg {...common}>
          <path d="M5 19V10M12 19V5M19 19v-7" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6" />
        </svg>
      );
    default:
      return null;
  }
}
