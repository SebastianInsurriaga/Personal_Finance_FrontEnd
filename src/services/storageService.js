const STORAGE_KEY = 'personal-finance-app-state';

export function mergeStateWithFallback(importedState, fallbackState) {
  if (!importedState || typeof importedState !== 'object' || Array.isArray(importedState)) {
    return fallbackState;
  }

  return {
    ...fallbackState,
    ...importedState,
    preferences: { ...fallbackState.preferences, ...(importedState.preferences || {}) },
    settings: { ...fallbackState.settings, ...(importedState.settings || {}) },
    goals: Array.isArray(importedState.goals) ? importedState.goals : fallbackState.goals,
    investments: Array.isArray(importedState.investments) ? importedState.investments : fallbackState.investments,
    fixedExpenses: Array.isArray(importedState.fixedExpenses) ? importedState.fixedExpenses : fallbackState.fixedExpenses,
    movements: Array.isArray(importedState.movements) ? importedState.movements : fallbackState.movements,
  };
}

export function loadState(fallbackState) {
  try {
    const rawState = localStorage.getItem(STORAGE_KEY);
    if (!rawState) return fallbackState;

    const parsedState = JSON.parse(rawState);
    return mergeStateWithFallback(parsedState, fallbackState);
  } catch {
    return fallbackState;
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportStateToJson(state) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importStateFromJson(jsonText, fallbackState) {
  try {
    const parsed = JSON.parse(jsonText);
    if (parsed?.state) {
      return mergeStateWithFallback(parsed.state, fallbackState);
    }

    return mergeStateWithFallback(parsed, fallbackState);
  } catch {
    return fallbackState;
  }
}
