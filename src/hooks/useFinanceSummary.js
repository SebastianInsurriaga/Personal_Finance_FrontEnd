import { useMemo } from 'react';
import { useFinance } from '../context/FinanceContext.jsx';
import { summarizeFinances } from '../utils/financeUtils.js';

export function useFinanceSummary() {
  const { state } = useFinance();
  return useMemo(() => summarizeFinances(state), [state]);
}
