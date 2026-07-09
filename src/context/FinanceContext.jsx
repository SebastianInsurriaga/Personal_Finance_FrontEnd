import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { initialData } from '../data/initialData.js';
import { loadState, mergeStateWithFallback, saveState } from '../services/storageService.js';
import { removeExpiredFixedExpenses } from '../utils/financeUtils.js';

const FinanceContext = createContext(null);

function getMovementEffect(movement) {
  const amount = Number(movement.amount || 0);
  return movement.type === 'Ingreso' ? amount : -amount;
}

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
    case 'CLEAN_EXPIRED_FIXED_EXPENSES':
      return { ...state, fixedExpenses: action.payload };
    case 'ADD_MOVEMENT': {
      const movement = { ...action.payload, id: crypto.randomUUID() };
      return {
        ...state,
        settings: {
          ...state.settings,
          currentNetWorth: Number(state.settings.currentNetWorth || 0) + getMovementEffect(movement),
        },
        movements: [movement, ...state.movements],
      };
    }
    case 'UPDATE_MOVEMENT': {
      const oldMovement = state.movements.find((movement) => movement.id === action.payload.id);
      const oldEffect = oldMovement ? getMovementEffect(oldMovement) : 0;
      const newEffect = getMovementEffect(action.payload);
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
      const effect = getMovementEffect(movementToRemove);
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

  useEffect(() => {
    const cleanedFixedExpenses = removeExpiredFixedExpenses(state.fixedExpenses, new Date());
    if (cleanedFixedExpenses.length !== state.fixedExpenses.length) {
      dispatch({ type: 'CLEAN_EXPIRED_FIXED_EXPENSES', payload: cleanedFixedExpenses });
    }
  }, [state.fixedExpenses]);

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
