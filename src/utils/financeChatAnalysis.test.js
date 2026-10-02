import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFinanceChatFacts, getDeterministicFinanceReply, resolveFinanceChatPeriod } from './financeChatAnalysis.js';

test('calculates weekly budget and savings facts once when an automatic fixed expense is also recorded', () => {
  const state = {
    settings: { weeklyBudget: 500 },
    fixedExpenses: [{ name: 'Rent', type: 'Semanal', amount: 100, active: true, automatic: true }],
    movements: [
      { date: '2026-06-29', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-06-29', type: 'Gasto', amount: 250, category: 'Comida', concept: 'Groceries' },
      { date: '2026-06-29', type: 'Gasto', amount: 100, category: 'Hogar', concept: 'Rent' },
      { date: '2026-07-06', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-07-06', type: 'Gasto', amount: 550, category: 'Comida', concept: 'Groceries' },
      { date: '2026-07-13', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-07-13', type: 'Gasto', amount: 200, category: 'Transporte', concept: 'Bus' },
    ],
    goals: [],
    investments: [],
  };

  const facts = buildFinanceChatFacts(state, new Date('2026-07-20T12:00:00'));

  assert.equal(facts.period.completeWeeksWithMovements, 3);
  assert.equal(facts.weeklyBudget.exceededCount, 1);
  assert.equal(facts.weeklyBudget.withinCount, 2);
  assert.equal(facts.weeklyBudget.totalOverBudget, 150);
  assert.equal(facts.weeklyBudget.totalUnderBudgetMargin, 350);
  assert.equal(facts.savings.income, 3000);
  assert.equal(facts.savings.recordedExpenses, 1100);
  assert.equal(facts.savings.registeredNetSavings, 1900);
  assert.equal(facts.savings.estimatedAutomaticFixedExpenses, 300);
  assert.equal(facts.savings.estimatedNetSavings, 1700);

  const reply = getDeterministicFinanceReply('Calcula la tasa de ahorro y cuántas semanas excedí el presupuesto', facts);
    assert.match(reply, /1 de 3 semanas excedidas/);
    assert.match(reply, /Ahorro:/);
});

test('excludes opted-out expenses from weekly budget facts but keeps them in recorded spending', () => {
  const state = {
    settings: { weeklyBudget: 500 },
    fixedExpenses: [],
    movements: [
      { date: '2026-07-06', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-07-06', type: 'Gasto', amount: 400, category: 'Hogar', concept: 'Repair', excludeFromWeeklyBudget: true },
      { date: '2026-07-06', type: 'Gasto', amount: 200, category: 'Comida', concept: 'Groceries' },
      { date: '2026-07-13', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
    ],
    goals: [],
    investments: [],
  };

  const facts = buildFinanceChatFacts(state, new Date('2026-07-20T12:00:00'));

  assert.equal(facts.weeklyBudget.exceededCount, 0);
  assert.equal(facts.weeklyBudget.totalUnderBudgetMargin, 800);
  assert.equal(facts.savings.recordedExpenses, 600);
  assert.equal(facts.savings.registeredNetSavings, 1400);
});

test('includes the complete stored movement history instead of limiting it to 250 entries', () => {
  const movements = Array.from({ length: 300 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
    type: 'Ingreso',
    amount: 10,
    concept: 'Income',
  }));
  const facts = buildFinanceChatFacts({ settings: {}, fixedExpenses: [], movements, goals: [], investments: [] }, new Date('2026-12-31T12:00:00'));

  assert.equal(facts.movementCount, 300);
});

test('isolates an explicitly requested year from movements in other years', () => {
  const state = {
    settings: { weeklyBudget: 1000 },
    fixedExpenses: [],
    movements: [
      { date: '2025-01-01', type: 'Ingreso', amount: 100, concept: 'Income' },
      { date: '2025-01-06', type: 'Ingreso', amount: 200, concept: 'Income' },
      { date: '2025-01-13', type: 'Ingreso', amount: 300, concept: 'Income' },
      { date: '2025-01-20', type: 'Ingreso', amount: 400, concept: 'Income' },
      { date: '2025-01-27', type: 'Ingreso', amount: 500, concept: 'Income' },
      { date: '2026-01-05', type: 'Ingreso', amount: 900, concept: 'Income' },
    ],
    goals: [],
    investments: [],
  };

  const referenceDate = new Date('2026-09-26T12:00:00');
  const period = resolveFinanceChatPeriod('Resume mis finanzas durante 2025', state.movements, referenceDate);
  const facts = buildFinanceChatFacts(state, referenceDate, period, 'Resume mis finanzas durante 2025');

  assert.equal(period.start, '2025-01-01');
  assert.equal(period.end, '2025-12-31');
  assert.equal(facts.movementCount, 5);
  assert.equal(facts.period.completeWeeksWithMovements, 4);
  assert.equal(facts.savings.income, 1400);
  assert.equal(facts.period.excludedBoundaryMovementCount, 1);
    const reply = getDeterministicFinanceReply('Dame un resumen de mis movimientos durante 2025', facts);
    assert.match(reply, /Periodo: 1 ene 2025 al 31 dic 2025/);
  assert.match(reply, /en 5 movimientos/);
});

test('parses an explicit Spanish calendar date range', () => {
  const period = resolveFinanceChatPeriod(
    'Analiza del 1 de enero de 2025 al 31 de marzo de 2025',
    [],
    new Date('2026-09-26T12:00:00'),
  );

  assert.equal(period.start, '2025-01-01');
  assert.equal(period.end, '2025-03-31');
});

test('parses a numeric date range joined with y', () => {
  const period = resolveFinanceChatPeriod(
    'Analiza del 01/02/2025 y 31/03/2025',
    [],
    new Date('2026-09-26T12:00:00'),
  );

  assert.equal(period.start, '2025-02-01');
  assert.equal(period.end, '2025-03-31');
});

test('filters “este mes” to the current month and excludes older matching movements', () => {
  const state = {
    settings: { weeklyBudget: 1000 },
    fixedExpenses: [],
    movements: [
      { date: '2026-08-11', type: 'Gasto', amount: 100, category: 'Comida', concept: 'Comida' },
      { date: '2026-09-11', type: 'Gasto', amount: 25, category: 'Comida', concept: 'Comida' },
    ],
    goals: [],
    investments: [],
  };
  const question = 'Cuánto gasté en Comida este mes';
  const referenceDate = new Date('2026-09-26T12:00:00');
  const period = resolveFinanceChatPeriod(question, state.movements, referenceDate);
  const facts = buildFinanceChatFacts(state, referenceDate, period, question);
  const reply = getDeterministicFinanceReply(question, facts);

  assert.equal(period.start, '2026-09-01');
  assert.equal(period.end, '2026-09-26');
  assert.equal(facts.movementCount, 1);
  assert.equal(facts.matchingMovementTotals.expenses, 25);
  assert.match(reply, /\$25/);
  assert.doesNotMatch(reply, /100/);
});

test('resolves “mes pasado” and a named month without a year', () => {
  const referenceDate = new Date('2026-09-26T12:00:00');

  const previousMonth = resolveFinanceChatPeriod('Mis gastos del mes pasado', [], referenceDate);
  const namedMonth = resolveFinanceChatPeriod('Mis gastos en agosto', [], referenceDate);

  assert.equal(previousMonth.start, '2026-08-01');
  assert.equal(previousMonth.end, '2026-08-31');
  assert.equal(namedMonth.start, '2026-08-01');
  assert.equal(namedMonth.end, '2026-08-31');
});

test('does not mistake a future goal year for a historical data range', () => {
  const period = resolveFinanceChatPeriod(
    '¿Llegaré a mi meta en 2027?',
    [{ date: '2024-04-01' }, { date: '2026-03-15' }],
    new Date('2026-09-26T12:00:00'),
  );

  assert.equal(period.start, '2024-04-01');
  assert.equal(period.end, '2026-09-26');
  assert.equal(period.explicit, false);
});

test('finds old category movements only inside the requested period', () => {
  const state = {
    settings: { weeklyBudget: 1000 },
    fixedExpenses: [],
    movements: [
      { date: '2025-01-06', type: 'Gasto', amount: 250, category: 'Comida', concept: 'Supermercado' },
      { date: '2025-01-13', type: 'Gasto', amount: 100, category: 'Hogar', concept: 'Renta' },
      { date: '2026-01-05', type: 'Gasto', amount: 900, category: 'Comida', concept: 'Supermercado' },
    ],
    goals: [],
    investments: [],
  };
  const question = 'Cuánto gasté en comida durante 2025';
  const referenceDate = new Date('2026-09-26T12:00:00');
  const period = resolveFinanceChatPeriod(question, state.movements, referenceDate);
  const facts = buildFinanceChatFacts(state, referenceDate, period, question);
  const reply = getDeterministicFinanceReply(question, facts);

  assert.equal(facts.matchingMovementCount, 1);
  assert.equal(facts.matchingMovementTotals.expenses, 250);
  assert.match(reply, /\$250/);
  assert.doesNotMatch(reply, /900/);
});

test('answers the combined historical savings, budget, and goal-date question deterministically', () => {
  const state = {
    settings: { weeklyBudget: 500 },
    fixedExpenses: [{ name: 'Rent', type: 'Semanal', amount: 100, active: true, automatic: true }],
    movements: [
      { date: '2026-06-29', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-06-29', type: 'Gasto', amount: 250, category: 'Comida', concept: 'Groceries' },
      { date: '2026-06-29', type: 'Gasto', amount: 100, category: 'Hogar', concept: 'Rent' },
      { date: '2026-07-06', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-07-06', type: 'Gasto', amount: 550, category: 'Comida', concept: 'Groceries' },
      { date: '2026-07-13', type: 'Ingreso', amount: 1000, concept: 'Paycheck' },
      { date: '2026-07-13', type: 'Gasto', amount: 200, category: 'Transporte', concept: 'Bus' },
    ],
    goals: [{ name: 'Camioneta', status: 'activa', targetAmount: 2000, currentAmount: 1000 }],
    investments: [],
  };
  const facts = buildFinanceChatFacts(state, new Date('2026-07-20T12:00:00'));
  const question = 'Con este ritmo de ahorro, ¿cuándo alcanzaré mi meta de la camioneta? Calcula tasa histórica y semanas sobre presupuesto.';
  const reply = getDeterministicFinanceReply(question, facts);

  assert.match(reply, /Ahorro:/);
  assert.match(reply, /1 de 3 semanas excedidas/);
  assert.match(reply, /Camioneta: faltan/);
  assert.match(reply, /semanas \(aprox\./);
  assert.ok(reply.trim().split(/\s+/).length <= 60);

  const forecast = getDeterministicFinanceReply('Predice mis gastos para el próximo mes', facts);
  assert.match(forecast, /al mes/);
});