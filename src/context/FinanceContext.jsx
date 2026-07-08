import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { initialData } from '../data/initialData.js';
import { loadState, mergeStateWithFallback, saveState } from '../services/storageService.js';

const FinanceContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_MODE':
      return { ...state, preferences: { ...state.preferences, mode: state.preferences.mode === 'dark' ? 'light' : 'dark' } };
    case 'SET_PALETTE':
      return { ...state, preferences: { ...state.preferences, palette: action.payload } };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'ADD_GOAL':
      return { ...state, goals: [{ ...action.payload, id: crypto.randomUUID() }, ...state.goals] };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map((goal) => (goal.id === action.payload.id ? action.payload : goal)) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter((goal) => goal.id !== action.payload) };
    case 'ADD_INVESTMENT':
      return { ...state, investments: [{ ...action.payload, id: crypto.randomUUID() }, ...state.investments] };
    case 'UPDATE_INVESTMENT':
      return { ...state, investments: state.investments.map((investment) => (investment.id === action.payload.id ? action.payload : investment)) };
    case 'DELETE_INVESTMENT':
      return { ...state, investments: state.investments.filter((investment) => investment.id !== action.payload) };
    case 'ADD_FIXED_EXPENSE':
      return { ...state, fixedExpenses: [{ ...action.payload, id: crypto.randomUUID() }, ...state.fixedExpenses] };
    case 'UPDATE_FIXED_EXPENSE':
      return { ...state, fixedExpenses: state.fixedExpenses.map((expense) => (expense.id === action.payload.id ? action.payload : expense)) };
    case 'DELETE_FIXED_EXPENSE':
      return { ...state, fixedExpenses: state.fixedExpenses.filter((expense) => expense.id !== action.payload) };
    case 'ADD_MOVEMENT': {
      const movement = { ...action.payload, id: crypto.randomUUID() };
      const amount = Number(movement.amount || 0);
      return {
        ...state,
        settings: {
          ...state.settings,
          currentNetWorth: Number(state.settings.currentNetWorth || 0) + (movement.type === 'Ingreso' ? amount : -amount),
        },
        movements: [movement, ...state.movements],
      };
    }
    case 'UPDATE_MOVEMENT': {
      const oldMovement = state.movements.find((movement) => movement.id === action.payload.id);
      const oldEffect = oldMovement ? (oldMovement.type === 'Ingreso' ? Number(oldMovement.amount || 0) : -Number(oldMovement.amount || 0)) : 0;
      const newEffect = action.payload.type === 'Ingreso' ? Number(action.payload.amount || 0) : -Number(action.payload.amount || 0);
      return {
        ...state,
        settings: {
          ...state.settings,
          currentNetWorth: Number(state.settings.currentNetWorth || 0) + newEffect - oldEffect,
        },
        movements: state.movements.map((movement) => (movement.id === action.payload.id ? { ...action.payload, id: action.payload.id } : movement)),
      };
    }
    case 'DELETE_MOVEMENT': {
      const movementToRemove = state.movements.find((movement) => movement.id === action.payload);
      if (!movementToRemove) return state;
      const effect = movementToRemove.type === 'Ingreso' ? Number(movementToRemove.amount || 0) : -Number(movementToRemove.amount || 0);
      return {
        ...state,
        settings: {
          ...state.settings,
          currentNetWorth: Number(state.settings.currentNetWorth || 0) - effect,
        },
        movements: state.movements.filter((movement) => movement.id !== action.payload),
      };
    }
    case 'REPLACE_STATE':
      return mergeStateWithFallback(action.payload, state);
    default:
      return state;
  }
}

export function FinanceProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialData, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      toggleColorMode: () => dispatch({ type: 'TOGGLE_MODE' }),
      setPalette: (palette) => dispatch({ type: 'SET_PALETTE', payload: palette }),
    }),
    [state],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance debe usarse dentro de FinanceProvider');
  }
  return context;
}
