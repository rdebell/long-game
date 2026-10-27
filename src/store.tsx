import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ProgressDecision } from './progression/plan';
import { loadState, saveState } from './storage';
import {
  addExercise,
  applyInitialTest,
  applyRetest,
  completeWorkout,
  removeExercise,
  resetTraining,
  saveExerciseSettings,
} from './state/logic';
import type { AppState, ExerciseDraft, ThemeChoice } from './state/types';

interface Store {
  state: AppState;
  persisted: boolean;
  completeWorkout: (
    exerciseId: string,
    actuals: number[],
    timing?: { startedAt: string; endedAt: string },
  ) => ProgressDecision;
  saveExercise: (exerciseId: string, draft: ExerciseDraft) => { extended: boolean; steep: boolean; error?: string };
  addExercise: (input: {
    name: string;
    goal: number;
    mode: 'test' | 'place';
    week?: number;
    day?: number;
    dayPeak?: number;
    weeks?: number;
  }) => { id?: string; error?: string };
  removeExercise: (exerciseId: string) => void;
  applyInitialTest: (exerciseId: string, testMax: number) => void;
  applyRetest: (exerciseId: string, testMax: number) => void;
  setTheme: (theme: ThemeChoice) => void;
  setSound: (enabled: boolean) => void;
  setHealthLog: (enabled: boolean) => void;
  setHealthShortcutName: (name: string) => void;
  replaceState: (next: AppState) => void;
  resetTraining: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [persisted, setPersisted] = useState(true);

  const api = useMemo<Store>(() => {
    const commit = (next: AppState) => {
      setState(next);
      setPersisted(saveState(next));
    };
    return {
      state,
      persisted,
      completeWorkout: (exerciseId, actuals, timing) => {
        const endedAt = timing?.endedAt ?? new Date().toISOString();
        const result = completeWorkout(state, {
          exerciseId,
          actuals,
          now: endedAt,
          startedAt: timing?.startedAt,
        });
        commit(result.state);
        return result.decision;
      },
      saveExercise: (exerciseId, draft) => {
        const result = saveExerciseSettings(state, exerciseId, draft);
        if (!result.error) commit(result.state);
        return { extended: result.extended, steep: result.steep, error: result.error };
      },
      addExercise: (input) => {
        const result = addExercise(state, input);
        if (!result.error && result.id) commit(result.state);
        return { id: result.id, error: result.error };
      },
      removeExercise: (exerciseId) => commit(removeExercise(state, exerciseId)),
      applyInitialTest: (exerciseId, testMax) => {
        commit(applyInitialTest(state, { exerciseId, testMax, now: new Date().toISOString() }));
      },
      applyRetest: (exerciseId, testMax) => {
        commit(applyRetest(state, { exerciseId, testMax, now: new Date().toISOString() }));
      },
      setTheme: (theme) => commit({ ...state, settings: { ...state.settings, theme } }),
      setSound: (enabled) => commit({ ...state, settings: { ...state.settings, soundEnabled: enabled } }),
      setHealthLog: (enabled) => commit({ ...state, settings: { ...state.settings, healthLogEnabled: enabled } }),
      setHealthShortcutName: (name) =>
        commit({ ...state, settings: { ...state.settings, healthShortcutName: name } }),
      replaceState: (next) => commit(next),
      resetTraining: () => commit(resetTraining(state)),
    };
  }, [state, persisted]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('Store missing');
  return store;
}

export function useExercise(id: string | undefined) {
  const { state } = useStore();
  return state.exercises.find((exercise) => exercise.id === id) ?? null;
}
