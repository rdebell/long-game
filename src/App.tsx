import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { unlockAudio } from './audio';
import { Icon } from './components/Icons';
import { AddExercise } from './screens/Add';
import { AllWorkouts } from './screens/All';
import { ChangingScreen } from './screens/Changing';
import { ExerciseScreen } from './screens/Exercise';
import { Home } from './screens/Home';
import { ProgressScreen } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Stats } from './screens/Stats';
import { TestScreen } from './screens/Test';
import { WorkoutScreen } from './screens/Workout';
import { StoreProvider, useStore } from './store';

export function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </StoreProvider>
  );
}

function Shell() {
  const location = useLocation();
  const { state } = useStore();
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [online, setOnline] = useState(() => navigator.onLine);
  const showTabs = location.pathname === '/' || location.pathname === '/stats' || location.pathname === '/settings';
  const mode = state.settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : state.settings.theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (mode === 'dark') document.documentElement.dataset.theme = 'dark';
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? '#141311' : '#EFEAE2');
  }, [mode]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <div className="frame">
      {!online ? <p className="offline">Offline. Your log is still on this device.</p> : null}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/all" element={<AllWorkouts />} />
          <Route path="/add" element={<AddExercise />} />
          <Route path="/exercise/:id" element={<ExerciseScreen />} />
          <Route path="/workout/:id" element={<WorkoutScreen />} />
          <Route path="/changing/:id" element={<ChangingScreen />} />
          <Route path="/progress/:id" element={<ProgressScreen />} />
          <Route path="/test/:id" element={<TestScreen />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {showTabs ? (
        <nav className="tabbar" aria-label="Primary">
          <NavLink to="/" end>
            <Icon name="workouts" />
            Workouts
          </NavLink>
          <NavLink to="/stats">
            <Icon name="stats" />
            Stats
          </NavLink>
          <NavLink to="/settings">
            <Icon name="settings" />
            Settings
          </NavLink>
        </nav>
      ) : null}
    </div>
  );
}
