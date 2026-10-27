import { useRef, useState } from 'react';
import { parseBackup, serializeBackup } from '../state/backup';
import type { AppState, ThemeChoice } from '../state/types';
import { Button, Dialog, Screen } from '../components/ui';
import { useStore } from '../store';

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function Settings() {
  const { state, persisted, setTheme, setSound, replaceState, resetTraining } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<AppState | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  function exportBackup() {
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'long-game-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) {
      setError(parsed.error);
      setPending(null);
      return;
    }
    setError('');
    setPending(parsed.state);
  }

  return (
    <Screen tabs>
      <header className="page-head">
        <p className="brand">Long Game</p>
        <h1>Settings</h1>
      </header>
      {!persisted ? (
        <p className="error" role="alert">
          This browser blocked local storage. The session will forget changes when you leave.
        </p>
      ) : null}
      <section className="panel">
        <h2>Appearance</h2>
        <div className="segment" role="group" aria-label="Theme">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              aria-pressed={state.settings.theme === theme.id}
              className={state.settings.theme === theme.id ? 'on' : ''}
              onClick={() => setTheme(theme.id)}
            >
              {theme.label}
            </button>
          ))}
        </div>
        <button type="button" className="switch-row" aria-pressed={state.settings.soundEnabled} onClick={() => setSound(!state.settings.soundEnabled)}>
          <span>Sound and vibration</span>
          <span>{state.settings.soundEnabled ? 'On' : 'Off'}</span>
        </button>
      </section>
      <section className="panel">
        <h2>Backup</h2>
        <p>The log stays in this browser. Export a JSON file if you want a copy, then import it here later.</p>
        <div className="inline-actions">
          <Button onClick={exportBackup}>Export</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Import
          </Button>
        </div>
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
      <section className="panel">
        <h2>Add to your home screen</h2>
        <p>
          On iPhone, open this page in Safari, tap Share, then Add to Home Screen. It opens full screen, like an app, and
          keeps working offline after the first visit.
        </p>
      </section>
      <section className="panel">
        <h2>How the numbers move</h2>
        <p>
          Each day ends with a max set, shown as N+. You pass the day only if every set reaches its target, including at
          least N on the last one. The next day is then a little harder. Miss any set and the same week and day comes
          back, with the same numbers. The wave inside a day is 71%, 91%, 71%, 64%, then the max set, so the middle is
          heavy and the fourth set is lighter.
        </p>
      </section>
      <Button variant="danger" onClick={() => setResetOpen(true)}>
        Restore the starter plan
      </Button>
      <Dialog
        open={pending !== null}
        title="Replace everything on this device?"
        body="Importing a backup overwrites the exercises and the log stored in this browser."
        confirmLabel="Import"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) replaceState(pending);
          setPending(null);
        }}
      />
      <Dialog
        open={resetOpen}
        title="Restore the starter plan?"
        body="Push-ups return to week 12, day 2, goal 100. Pull-ups return to week 8, day 3, goal 40. The log on this device is cleared."
        confirmLabel="Restore"
        danger
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetTraining();
          setResetOpen(false);
        }}
      />
    </Screen>
  );
}
