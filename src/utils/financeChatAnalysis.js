import { endOfWeek, startOfWeek } from './dateUtils.js';
import { getAutomaticFixedExpenses, getMovementsExcludingAutomaticDuplicates } from './financeUtils.js';

const monthIndexes = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

function parseMovementDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function amountTotal(movements, type) {
  return movements
    .filter((movement) => movement.type === type)
    .reduce((total, movement) => total + Number(movement.amount || 0), 0);
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function makePeriod(start, end, explicit, referenceDate) {
  const endKey = end > dateKey(referenceDate) ? dateKey(referenceDate) : end;
  return {
    start,
    end: endKey,
    label: start === endKey ? start : `${start} a ${endKey}`,
    explicit,
  };
}

export function resolveFinanceChatPeriod(question, movements, referenceDate = new Date()) {
  const normalizedQuestion = normalizeText(question);
  const asOf = dateKey(referenceDate);
  const validMovements = (Array.isArray(movements) ? movements : [])
    .filter((movement) => parseMovementDate(movement.date))
    .sort((first, second) => first.date.localeCompare(second.date));
  const allHistoryStart = validMovements[0]?.date || asOf;

  const naturalDateRange = normalizedQuestion.match(/\b(?:del?\s+)?(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\s+(?:al|hasta|y)\s+(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})\b/);
  if (naturalDateRange) {
    const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = naturalDateRange;
    if (monthIndexes[startMonth] !== undefined && monthIndexes[endMonth] !== undefined) {
      const start = dateKey(new Date(Number(startYear), monthIndexes[startMonth], Number(startDay)));
      const end = dateKey(new Date(Number(endYear), monthIndexes[endMonth], Number(endDay)));
      return makePeriod(start, end, true, referenceDate);
    }
  }

  const isoDateRange = normalizedQuestion.match(/\b(\d{4}-\d{2}-\d{2})\s+(?:al|hasta|a|y)\s+(\d{4}-\d{2}-\d{2})\b/);
  if (isoDateRange) return makePeriod(isoDateRange[1], isoDateRange[2], true, referenceDate);

  const numericDateRange = normalizedQuestion.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s+(?:al|hasta|a|y)\s+(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (numericDateRange) {
    const [, startDay, startMonth, startYear, endDay, endMonth, endYear] = numericDateRange;
    const start = dateKey(new Date(Number(startYear), Number(startMonth) - 1, Number(startDay)));
    const end = dateKey(new Date(Number(endYear), Number(endMonth) - 1, Number(endDay)));
    return makePeriod(start, end, true, referenceDate);
  }

  const namedMonthRange = normalizedQuestion.match(/\b(?:de\s+)?([a-z]+)\s+(?:a|hasta|y)\s+([a-z]+)\s+(?:de\s+)?(\d{4})\b/);
  if (namedMonthRange && monthIndexes[namedMonthRange[1]] !== undefined && monthIndexes[namedMonthRange[2]] !== undefined) {
    const year = Number(namedMonthRange[3]);
    return makePeriod(
      dateKey(new Date(year, monthIndexes[namedMonthRange[1]], 1)),
      dateKey(new Date(year, monthIndexes[namedMonthRange[2]] + 1, 0)),
      true,
      referenceDate,
    );
  }

  if (/\b(?:este|actual)\s+mes\b|\bmes\s+(?:actual|en curso)\b/.test(normalizedQuestion)) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    return makePeriod(dateKey(new Date(year, month, 1)), asOf, true, referenceDate);
  }

  if (/\bmes\s+(?:pasado|anterior)\b|\bmes anterior\b/.test(normalizedQuestion)) {
    const previousMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    return makePeriod(
      dateKey(previousMonth),
      dateKey(new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0)),
      true,
      referenceDate,
    );
  }

  const namedMonth = normalizedQuestion.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(20\d{2}))?\b/);
  if (namedMonth) {
    const month = monthIndexes[namedMonth[1]];
    const currentYear = referenceDate.getFullYear();
    const year = namedMonth[2]
      ? Number(namedMonth[2])
      : month <= referenceDate.getMonth() ? currentYear : currentYear - 1;
    return makePeriod(dateKey(new Date(year, month, 1)), dateKey(new Date(year, month + 1, 0)), true, referenceDate);
  }

  const rollingMonths = normalizedQuestion.match(/ultim(?:o|os|a|as)\s+(\d{1,3})\s+mes(?:es)?/);
  if (rollingMonths) {
    const count = Number(rollingMonths[1]);
    const endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const start = dateKey(new Date(endDate.getFullYear(), endDate.getMonth() - count + 1, 1));
    return makePeriod(start, asOf, true, referenceDate);
  }

  const rollingWeeks = normalizedQuestion.match(/ultim(?:o|os|a|as)\s+(\d{1,3})\s+semanas?/);
  if (rollingWeeks) {
    const startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    startDate.setDate(startDate.getDate() - Number(rollingWeeks[1]) * 7 + 1);
    return makePeriod(dateKey(startDate), asOf, true, referenceDate);
  }

  const previousYear = normalizedQuestion.match(/(?:ano pasado|ano anterior|ultimo ano)/);
  if (previousYear) {
    const year = referenceDate.getFullYear() - 1;
    return makePeriod(`${year}-01-01`, `${year}-12-31`, true, referenceDate);
  }

  if (/\beste ano\b|\bano actual\b/.test(normalizedQuestion)) {
    return makePeriod(`${referenceDate.getFullYear()}-01-01`, asOf, true, referenceDate);
  }

  const year = normalizedQuestion.match(/\b(20\d{2})\b/);
  const hasHistoricalPeriodContext = /\b(en|durante|del|de|ano|historico|historia|movimientos|gastos|ingresos|resumen|periodo|analiza|revisa)\b/.test(normalizedQuestion);
  if (year && hasHistoricalPeriodContext && Number(year[1]) <= referenceDate.getFullYear()) {
    const selectedYear = Number(year[1]);
    return makePeriod(`${selectedYear}-01-01`, `${selectedYear}-12-31`, true, referenceDate);
  }

  return makePeriod(allHistoryStart, asOf, false, referenceDate);
}

export function buildFinanceChatFacts(state, referenceDate = new Date(), selectedPeriod, question = '') {
  const allMovements = (Array.isArray(state.movements) ? state.movements : [])
    .filter((movement) => parseMovementDate(movement.date) && Number.isFinite(Number(movement.amount)))
    .slice()
    .sort((first, second) => first.date.localeCompare(second.date));
  const requestedPeriod = selectedPeriod || resolveFinanceChatPeriod('', allMovements, referenceDate);
  const movements = allMovements.filter((movement) => movement.date >= requestedPeriod.start && movement.date <= requestedPeriod.end);
  const fixedExpenses = Array.isArray(state.fixedExpenses) ? state.fixedExpenses : [];
  const firstMovementDate = movements.length ? parseMovementDate(movements[0].date) : null;
  const lastMovementDate = movements.length ? parseMovementDate(movements[movements.length - 1].date) : null;
  const firstWeekStart = firstMovementDate ? startOfWeek(firstMovementDate) : null;
  const currentWeekStart = startOfWeek(referenceDate);
  const weeklyMovementGroups = new Map();
  const rangeStart = parseMovementDate(requestedPeriod.start);
  const rangeEnd = new Date(`${requestedPeriod.end}T23:59:59.999`);

  movements.forEach((movement) => {
    const weekStart = startOfWeek(parseMovementDate(movement.date));
    const key = dateKey(weekStart);
    if (!weeklyMovementGroups.has(key)) weeklyMovementGroups.set(key, { start: weekStart, movements: [] });
    weeklyMovementGroups.get(key).movements.push(movement);
  });

  const completeWeeks = [...weeklyMovementGroups.values()]
    .filter(({ start }) => {
      const end = endOfWeek(start);
      return start >= rangeStart && end <= rangeEnd && start < currentWeekStart && (start > firstWeekStart || firstMovementDate.getTime() === firstWeekStart.getTime());
    })
    .sort((first, second) => first.start - second.start)
    .map(({ start, movements: weekMovements }) => {
      const end = endOfWeek(start);
      const uniqueMovements = getMovementsExcludingAutomaticDuplicates(weekMovements, fixedExpenses, start, end);
      const income = amountTotal(uniqueMovements, 'Ingreso');
      const variableExpenses = amountTotal(uniqueMovements, 'Gasto');
      const budgetExpenses = amountTotal(uniqueMovements.filter((movement) => !movement.excludeFromWeeklyBudget), 'Gasto');
      const recordedExpenses = amountTotal(weekMovements, 'Gasto');
      const fixedExpensesDue = getAutomaticFixedExpenses(fixedExpenses, end)
        .reduce((total, expense) => total + Number(expense.amount || 0), 0);
      const budget = Number(state.settings?.weeklyBudget || 0);
      const totalExpenses = budgetExpenses + fixedExpensesDue;

      return {
        start: dateKey(start),
        end: dateKey(end),
        income,
        recordedExpenses,
        variableExpenses,
        budgetExpenses,
        automaticFixedExpenses: fixedExpensesDue,
        totalExpenses,
        budget,
        remainingBudget: budget - totalExpenses,
      };
    });

  const completeWeekIncome = completeWeeks.reduce((total, week) => total + week.income, 0);
  const recordedExpenses = completeWeeks.reduce((total, week) => total + week.recordedExpenses, 0);
  const variableExpenses = completeWeeks.reduce((total, week) => total + week.variableExpenses, 0);
  const estimatedFixedExpenses = completeWeeks.reduce((total, week) => total + week.automaticFixedExpenses, 0);
  const budgetWeeks = completeWeeks.filter((week) => week.budget > 0);
  const exceededWeeks = budgetWeeks.filter((week) => week.remainingBudget < 0);
  const withinBudgetWeeks = budgetWeeks.filter((week) => week.remainingBudget >= 0);
  const categoryTotals = {};

  completeWeeks.forEach((week) => {
    const start = new Date(`${week.start}T00:00:00`);
    const end = endOfWeek(start);
    const weekMovements = weeklyMovementGroups.get(week.start).movements;
    const uniqueMovements = getMovementsExcludingAutomaticDuplicates(weekMovements, fixedExpenses, start, end);
    uniqueMovements.filter((movement) => movement.type === 'Gasto').forEach((movement) => {
      const category = movement.category || 'Sin categoría';
      categoryTotals[category] = (categoryTotals[category] || 0) + Number(movement.amount || 0);
    });
  });

  const registeredNetSavings = completeWeekIncome - recordedExpenses;
  const estimatedNetSavings = completeWeekIncome - variableExpenses - estimatedFixedExpenses;
  const periodIncome = amountTotal(movements, 'Ingreso');
  const periodRecordedExpenses = amountTotal(movements, 'Gasto');
  const periodCategoryTotals = movements
    .filter((movement) => movement.type === 'Gasto')
    .reduce((totals, movement) => {
      const category = movement.category || 'Sin categoría';
      totals[category] = (totals[category] || 0) + Number(movement.amount || 0);
      return totals;
    }, {});
  const periodStart = completeWeeks[0]?.start || null;
  const periodEnd = completeWeeks[completeWeeks.length - 1]?.end || null;
  const periodSavingsRate = completeWeekIncome > 0 ? (estimatedNetSavings / completeWeekIncome) * 100 : null;

  const matchedKeywords = normalizeText(question)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word) && !['para', 'este', 'esta', 'como', 'cuanto', 'cuando', 'toma', 'todos', 'todas', 'durante', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'movimientos', 'movimiento', 'registrados', 'registrado', 'gasto', 'gastos', 'gaste', 'ingreso', 'ingresos', 'pague', 'pago', 'historico', 'historicos', 'semana', 'semanas', 'meses', 'ano', 'anos', 'periodo', 'presupuesto', 'ahorro', 'ahorrar', 'resumen', 'total'].includes(word));
  const matchingMovements = matchedKeywords.length
    ? movements.filter((movement) => matchedKeywords.some((word) => normalizeText([movement.concept, movement.category, movement.notes].filter(Boolean).join(' ')).includes(word)))
    : [];
  const fixedExpensesWithoutStartDate = fixedExpenses.filter((expense) => expense.active && expense.automatic && !expense.startDate);

  return {
    source: 'Estado financiero guardado en localStorage',
    asOf: dateKey(referenceDate),
    requestedPeriod,
    totalStoredMovementCount: allMovements.length,
    movementCount: movements.length,
    firstMovementDate: firstMovementDate ? dateKey(firstMovementDate) : null,
    lastMovementDate: lastMovementDate ? dateKey(lastMovementDate) : null,
    period: {
      requestedStart: requestedPeriod.start,
      requestedEnd: requestedPeriod.end,
      label: requestedPeriod.label,
      explicit: requestedPeriod.explicit,
      start: periodStart,
      end: periodEnd,
      completeWeeksWithMovements: completeWeeks.length,
      excludedBoundaryMovementCount: movements.length - completeWeeks.reduce((total, week) => total + weeklyMovementGroups.get(week.start).movements.length, 0),
    },
    periodTotals: {
      movementCount: movements.length,
      income: periodIncome,
      recordedExpenses: periodRecordedExpenses,
      recordedNetSavings: periodIncome - periodRecordedExpenses,
      expensesByCategory: Object.entries(periodCategoryTotals)
        .map(([category, amount]) => ({ category, amount }))
        .sort((first, second) => second.amount - first.amount),
    },
    settings: {
      weeklyBudget: Number(state.settings?.weeklyBudget || 0),
      currentNetWorth: Number(state.settings?.currentNetWorth || 0),
      monthlySavingsGoal: Number(state.settings?.monthlySavingsGoal || 0),
    },
    savings: {
      income: completeWeekIncome,
      recordedExpenses,
      registeredNetSavings,
      estimatedAutomaticFixedExpenses: estimatedFixedExpenses,
      estimatedNetSavings,
      estimatedSavingsRatePercent: periodSavingsRate,
      averageEstimatedSavingsPerObservedWeek: completeWeeks.length ? estimatedNetSavings / completeWeeks.length : null,
      averageVariableExpensesPerObservedWeek: completeWeeks.length ? variableExpenses / completeWeeks.length : null,
      averageAutomaticFixedExpensesPerObservedWeek: completeWeeks.length ? estimatedFixedExpenses / completeWeeks.length : null,
    },
    weeklyBudget: {
      observedWeeks: budgetWeeks.length,
      exceededCount: exceededWeeks.length,
      withinCount: withinBudgetWeeks.length,
      totalOverBudget: exceededWeeks.reduce((total, week) => total - week.remainingBudget, 0),
      totalUnderBudgetMargin: withinBudgetWeeks.reduce((total, week) => total + week.remainingBudget, 0),
      recentWeeks: budgetWeeks.slice(-12),
    },
    expensesByCategory: Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((first, second) => second.amount - first.amount),
    activeFixedExpenses: fixedExpenses
      .filter((expense) => expense.active)
      .map(({ name, type, amount, automatic, startDate, expiresAt, dayOfMonth, dueDate }) => ({
        name, type, amount: Number(amount || 0), automatic: Boolean(automatic), startDate: startDate || null,
        expiresAt: expiresAt || null, dayOfMonth: dayOfMonth || null, dueDate: dueDate || null,
      })),
    goals: (Array.isArray(state.goals) ? state.goals : []).map((goal) => ({
      name: goal.name,
      status: goal.status,
      targetAmount: Number(goal.targetAmount || 0),
      currentAmount: Number(goal.currentAmount || 0),
      remainingAmount: Number(goal.targetAmount || 0) - Number(goal.currentAmount || 0),
    })),
    investments: (Array.isArray(state.investments) ? state.investments : []).map((investment) => ({
      name: investment.name,
      capital: Number(investment.capital || 0),
      annualRate: Number(investment.annualRate || 0),
    })),
    recentMovements: movements.slice(-25).map(({ date, concept, category, amount, type }) => ({
      date, concept: String(concept || '').slice(0, 100), category: category || 'Sin categoría', amount: Number(amount), type,
    })),
    matchingMovements: matchingMovements.slice(0, 50).map(({ date, concept, category, amount, type }) => ({
      date, concept: String(concept || '').slice(0, 100), category: category || 'Sin categoría', amount: Number(amount), type,
    })),
    matchingMovementCount: matchingMovements.length,
    matchingMovementTotals: {
      income: amountTotal(matchingMovements, 'Ingreso'),
      expenses: amountTotal(matchingMovements, 'Gasto'),
    },
    matchingTerms: matchedKeywords,
    assumptions: [
      'El análisis semanal usa semanas completas de lunes a domingo con movimientos guardados; excluye la primera semana parcial y la semana actual.',
      fixedExpensesWithoutStartDate.length
        ? 'El ahorro estimado aplica los gastos fijos automáticos sin fecha de inicio durante todo el periodo solicitado; ese historial de vigencia no está disponible.'
        : 'El ahorro estimado aplica los gastos fijos automáticos considerando las fechas de inicio configuradas.',
      'Los gastos fijos automáticos que coinciden por nombre y monto con un movimiento se cuentan una sola vez.',
    ],
  };
}

function money(value) {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
}

function displayDate(value) {
  const date = parseMovementDate(value);
  return date ? date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : value;
}

export function getDeterministicFinanceReply(question, facts) {
  const normalizedQuestion = normalizeText(question);
  const asksBudget = /presupuesto|exced|me pase|me he pasado|por debajo|dentro del presupuesto/.test(normalizedQuestion);
  const asksSavings = /ahorro|tasa|flujo/.test(normalizedQuestion);
  const mentionedGoal = facts.goals.find((goal) => normalizedQuestion.includes(normalizeText(goal.name)));
  const asksGoalProjection = (/meta|objetivo/.test(normalizedQuestion) || mentionedGoal)
    && /cuando|fecha|semanas|meses|alcanz|ritmo|predic|proyect/.test(normalizedQuestion);
  const asksSpendingForecast = /predic|pronostic|proyect|estim/.test(normalizedQuestion) && /gasto|gastar|compra|presupuesto/.test(normalizedQuestion);
  const asksPeriodSummary = facts.period.explicit && !asksBudget && !asksSavings && !asksGoalProjection && !asksSpendingForecast && /resumen|analiza|total|movimientos|transacciones|gasto|ingreso/.test(normalizedQuestion);
  const asksMatchingMovementTotal = !asksBudget && !asksSavings && !asksGoalProjection && !asksSpendingForecast && facts.matchingMovementCount > 0 && facts.matchingTerms.length > 0 && /cuanto|total|gast|pag|suma|movimiento|transaccion/.test(normalizedQuestion);
  if (!asksBudget && !asksSavings && !asksGoalProjection && !asksSpendingForecast && !asksPeriodSummary && !asksMatchingMovementTotal) return null;

  const lines = [`Periodo: ${displayDate(facts.period.requestedStart)} al ${displayDate(facts.period.requestedEnd)}`];
  if (asksMatchingMovementTotal) {
    const matchingCategory = facts.periodTotals.expensesByCategory.find((item) => normalizedQuestion.includes(normalizeText(item.category)));
    const matchingLabel = matchingCategory?.category || facts.matchingTerms.join(', ');
    lines.push(facts.matchingMovementCount
      ? `Movimientos de ${matchingLabel}: ${facts.matchingMovementCount}, por ${money(facts.matchingMovementTotals.expenses)}.`
      : `No encontré movimientos de ${matchingLabel} en este periodo.`);
  } else if (asksPeriodSummary) {
    const totals = facts.periodTotals;
    lines.push(`Ingresos: ${money(totals.income)}. Gastos: ${money(totals.recordedExpenses)}. Saldo: ${money(totals.recordedNetSavings)} en ${totals.movementCount} movimientos.`);
  }

  if (asksBudget) {
    const budget = facts.weeklyBudget;
    lines.push(budget.observedWeeks
      ? `Presupuesto: ${budget.exceededCount} de ${budget.observedWeeks} semanas excedidas (${money(budget.totalOverBudget)}); ${budget.withinCount} dentro (margen ${money(budget.totalUnderBudgetMargin)}).`
      : 'No hay semanas completas con movimientos y presupuesto configurado para comparar.');
  }

  if (asksSavings) {
    const savings = facts.savings;
    if (facts.period.completeWeeksWithMovements && savings.income > 0) {
      lines.push(`Ahorro: ${money(savings.registeredNetSavings)} registrado; ${money(savings.estimatedNetSavings)} estimado con fijos (${savings.estimatedSavingsRatePercent.toFixed(1)}% de ingresos).`);
    } else {
      lines.push('No hay suficientes semanas completas con ingresos para calcular la tasa de ahorro.');
    }
  }

  if (asksSpendingForecast) {
    const variableWeekly = facts.savings.averageVariableExpensesPerObservedWeek;
    const fixedWeekly = facts.savings.averageAutomaticFixedExpensesPerObservedWeek;
    if (variableWeekly !== null && facts.period.completeWeeksWithMovements) {
      const monthlyEstimate = (variableWeekly + fixedWeekly) * 52 / 12;
      lines.push(`Gasto promedio: ${money(variableWeekly)} variable y ${money(fixedWeekly)} fijo por semana; unos ${money(monthlyEstimate)} al mes.`);
    } else {
      lines.push('No hay semanas completas suficientes para estimar gastos futuros.');
    }
  }

  if (asksGoalProjection) {
    const goalName = mentionedGoal;
    const weeklySavings = facts.savings.averageEstimatedSavingsPerObservedWeek;
    if (goalName && goalName.remainingAmount > 0 && weeklySavings > 0) {
      const weeksToGoal = Math.ceil(goalName.remainingAmount / weeklySavings);
      const targetDate = new Date(`${facts.asOf}T12:00:00`);
      targetDate.setDate(targetDate.getDate() + weeksToGoal * 7);
      lines.push(`${goalName.name}: faltan ${money(goalName.remainingAmount)}; al ritmo actual, unas ${weeksToGoal} semanas (aprox. ${targetDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}).`);
    } else if (goalName) {
      lines.push(`${goalName.name}: faltan ${money(goalName.remainingAmount)}; no hay un ritmo de ahorro positivo para estimar la fecha.`);
    }
  }

  if (facts.period.excludedBoundaryMovementCount) {
      const movementNoun = facts.period.excludedBoundaryMovementCount === 1 ? 'movimiento' : 'movimientos';
      lines.push(`Nota: ${facts.period.excludedBoundaryMovementCount} ${movementNoun} de semanas parciales no cuentan para el presupuesto.`);
  }
  if (facts.activeFixedExpenses.some((expense) => expense.automatic && !expense.startDate)) {
    lines.push('Nota: los gastos fijos sin fecha de inicio son estimados.');
  }
  return lines.join('\n');
}