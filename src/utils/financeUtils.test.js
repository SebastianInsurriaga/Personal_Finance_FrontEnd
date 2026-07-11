import test from 'node:test';
import assert from 'node:assert/strict';
import { getMonthlyAutomaticFixedExpenses, summarizeFinances } from './financeUtils.js';

test('counts weekly automatic expenses by the weeks that have actually occurred in the month up to the selected date', () => {
  const fixedExpenses = [
    {
      id: 'weekly-expense',
      active: true,
      automatic: true,
      type: 'Semanal',
      amount: 1000,
    },
  ];

  const result = getMonthlyAutomaticFixedExpenses(fixedExpenses, new Date('2026-07-11'));

  assert.equal(result, 1000);
});

test('does not count monthly fixed expenses before their due day', () => {
  const fixedExpenses = [
    { id: 'monthly-later', name: 'Coppel', active: true, automatic: true, type: 'Mensual', amount: 850, dayOfMonth: 15 },
  ];

  const result = getMonthlyAutomaticFixedExpenses(fixedExpenses, new Date('2026-07-11'));

  assert.equal(result, 0);
});

test('includes monthly automatic fixed expenses in monthly expense totals and savings', () => {
  const state = {
    settings: { weeklyBudget: 5000, monthlySavingsGoal: 8000, currentNetWorth: 0 },
    fixedExpenses: [
      { id: 'seguro', name: 'Seguro', active: true, automatic: true, type: 'Mensual', amount: 116, dayOfMonth: 1 },
      { id: 'gasolina', name: 'Gasolina', active: true, automatic: true, type: 'Semanal', amount: 400 },
    ],
    movements: [
      { id: 'income', type: 'Ingreso', amount: 4458, date: '2026-07-11', concept: 'Pago semanal', category: 'Salario' },
      { id: 'gas', type: 'Gasto', amount: 400, date: '2026-07-11', concept: 'Gasolina', category: 'Transporte' },
      { id: 'dlc', type: 'Gasto', amount: 409, date: '2026-07-11', concept: 'DLC', category: 'Entretenimiento' },
    ],
    goals: [],
    investments: [],
  };

  const summary = summarizeFinances(state, new Date('2026-07-11'));

  assert.equal(summary.monthlyExpenses, 116 + 400 + 409);
  assert.equal(summary.savingsThisMonth, 4458 - 116 - 400 - 409);
});

test('reduces net worth when automatic fixed expenses have already become due and config was not synced yet', () => {
  const state = {
    settings: { weeklyBudget: 5000, monthlySavingsGoal: 8000, currentNetWorth: 10000 },
    fixedExpenses: [
      { id: 'seguro', name: 'Seguro', active: true, automatic: true, type: 'Mensual', amount: 116, dayOfMonth: 1 },
      { id: 'gasolina', name: 'Gasolina', active: true, automatic: true, type: 'Semanal', amount: 400 },
    ],
    movements: [],
    goals: [],
    investments: [],
  };

  const summary = summarizeFinances(state, new Date('2026-07-11'));

  assert.equal(summary.netWorth, 10000 - 516);
});

test('keeps currentNetWorth when config already synced with automatic fixed expenses', () => {
  const state = {
    settings: { weeklyBudget: 5000, monthlySavingsGoal: 8000, currentNetWorth: 9484, lastNetWorthSyncDate: '2026-07-11' },
    fixedExpenses: [
      { id: 'seguro', name: 'Seguro', active: true, automatic: true, type: 'Mensual', amount: 116, dayOfMonth: 1 },
      { id: 'gasolina', name: 'Gasolina', active: true, automatic: true, type: 'Semanal', amount: 400 },
    ],
    movements: [],
    goals: [],
    investments: [],
  };

  const summary = summarizeFinances(state, new Date('2026-07-11'));

  assert.equal(summary.netWorth, 9484);
});

test('prorates investment returns for the current month only', () => {
  const state = {
    settings: { weeklyBudget: 5000, monthlySavingsGoal: 8000, currentNetWorth: 0 },
    fixedExpenses: [],
    movements: [
      { id: 'income', type: 'Ingreso', amount: 1000, date: '2026-07-11', concept: 'Nomina', category: 'Nomina' },
    ],
    goals: [],
    investments: [
      { id: 'inv-1', name: 'Test', capital: 36500, annualRate: 12 },
    ],
  };

  const summary = summarizeFinances(state, new Date('2026-07-11'));
  const expectedMonthlyReturn = (36500 * 0.12 / 12) * (11 / 31);

  assert.equal(Math.round(summary.savingsThisMonth), Math.round(1000 + expectedMonthlyReturn));
});

test('last savings trend point matches savingsThisMonth for the selected month', () => {
  const state = {
    settings: { weeklyBudget: 10000, monthlySavingsGoal: 12400, currentNetWorth: 100000 },
    fixedExpenses: [
      { id: 'seguro', name: 'Seguro', active: true, automatic: true, type: 'Mensual', amount: 116, dayOfMonth: 1 },
      { id: 'gasolina', name: 'Gasolina', active: true, automatic: true, type: 'Semanal', amount: 400 },
    ],
    movements: [
      { id: 'income', type: 'Ingreso', amount: 4458, date: '2026-07-11', concept: 'Nomina', category: 'Nomina' },
      { id: 'gas', type: 'Gasto', amount: 400, date: '2026-07-11', concept: 'Gasolina', category: 'Transporte' },
      { id: 'dlc', type: 'Gasto', amount: 409, date: '2026-07-11', concept: 'DLC', category: 'Entretenimiento' },
    ],
    goals: [],
    investments: [
      { id: 'inv-1', name: 'PLATA', capital: 36286, annualRate: 10 },
      { id: 'inv-2', name: 'Mercado Pago', capital: 25000, annualRate: 12 },
      { id: 'inv-3', name: 'NU', capital: 25000, annualRate: 13 },
    ],
  };

  const date = new Date('2026-07-11');
  const summary = summarizeFinances(state, date);
  const trend = summary.savingsTrend;
  const lastPoint = trend[trend.length - 1];

  assert.equal(Math.round(lastPoint.ahorro), Math.round(summary.savingsThisMonth));
});
