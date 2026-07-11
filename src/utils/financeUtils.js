import { endOfMonth, endOfWeek, isBetween, startOfMonth, startOfWeek, toDate } from './dateUtils.js';

export function getInvestmentReturns(investments) {
  return investments.map((investment) => {
    const annual = Number(investment.capital || 0) * (Number(investment.annualRate || 0) / 100);
    return {
      ...investment,
      dailyReturn: annual / 365,
      monthlyReturn: annual / 12,
      annualReturn: annual,
    };
  });
}

export function getProratedInvestmentReturnsForMonth(investments, date = new Date(), referenceDate) {
  const targetDate = toDate(date);
  const reference = toDate(referenceDate || date);
  const investmentReturns = getInvestmentReturns(investments);
  const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const daysElapsed = targetDate.getFullYear() === reference.getFullYear() && targetDate.getMonth() === reference.getMonth()
    ? reference.getDate()
    : daysInMonth;

  return investmentReturns.reduce((sum, investment) => sum + investment.monthlyReturn * (daysElapsed / daysInMonth), 0);
}

export function getAutomaticFixedExpenses(fixedExpenses, date = new Date()) {
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const currentDate = toDate(date);

  return fixedExpenses.filter((expense) => {
    if (!expense.active || !expense.automatic) return false;
    if (expense.type === 'Semanal') return true;

    if (expense.type === 'Única') {
      if (!expense.dueDate) return false;
      const dueDate = toDate(expense.dueDate);
      return isBetween(dueDate, weekStart, weekEnd);
    }

    const day = Number(expense.dayOfMonth);
    if (!day) return false;
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return isBetween(dueDate, weekStart, weekEnd);
  });
}

export function removeExpiredFixedExpenses(fixedExpenses, date = new Date()) {
  const today = new Date(toDate(date).getFullYear(), toDate(date).getMonth(), toDate(date).getDate());

  return fixedExpenses.filter((expense) => {
    if (expense.type !== 'Única' || !expense.dueDate) return true;
    const dueDate = toDate(expense.dueDate);
    return dueDate >= today;
  });
}

export function getMonthlyAutomaticFixedExpenses(fixedExpenses, date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const selectedDate = toDate(date);

  return fixedExpenses.reduce((sum, expense) => {
    if (!expense.active || !expense.automatic) return sum;
    const amount = Number(expense.amount || 0);

    if (expense.type === 'Semanal') {
      let weekStart = new Date(monthStart);
      const dayOfWeek = weekStart.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      weekStart.setDate(weekStart.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      let weeklyCount = 0;
      while (weekStart <= selectedDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        if (weekStart >= monthStart && weekStart <= monthEnd) {
          weeklyCount += 1;
        }
        weekStart.setDate(weekStart.getDate() + 7);
      }

      return sum + amount * weeklyCount;
    }

    if (expense.type === 'Única') {
      if (!expense.dueDate) return sum;
      const dueDate = toDate(expense.dueDate);
      if (dueDate.getFullYear() === year && dueDate.getMonth() === month && dueDate <= selectedDate) {
        return sum + amount;
      }
      return sum;
    }

    if (expense.type === 'Mensual') {
      const day = Number(expense.dayOfMonth || 1);
      const dueDate = new Date(year, month, day);
      if (dueDate > selectedDate) return sum;
      return sum + amount;
    }

    return sum;
  }, 0);
}

function getExpensePaymentMeta(expense, date = new Date()) {
  if (expense.type === 'Semanal') {
    const daysUntil = 7 - (date.getDay() || 7);
    return {
      daysUntil: Math.max(0, daysUntil),
      status: daysUntil <= 3 ? 'proximo' : 'normal',
      label: `${expense.type === 'Semanal' ? 'Cada semana' : `Día ${expense.dayOfMonth}`} • ${daysUntil === 0 ? 'hoy' : `en ${daysUntil} días`}`,
    };
  }

  if (expense.type === 'Única') {
    const targetDate = toDate(expense.dueDate);
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isOverdue = targetDate < today;
    const daysUntil = isOverdue ? 0 : Math.ceil((targetDate - today) / 86400000);

    return {
      daysUntil,
      status: isOverdue ? 'vencido' : daysUntil <= 3 ? 'proximo' : 'normal',
      label: `Única • ${isOverdue ? 'vencido' : daysUntil === 0 ? 'hoy' : `en ${daysUntil} días`}`,
    };
  }

  const targetDate = new Date(date.getFullYear(), date.getMonth(), Number(expense.dayOfMonth || 1));
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isOverdue = targetDate < today;
  const daysUntil = isOverdue ? 0 : Math.ceil((targetDate - today) / 86400000);

  return {
    daysUntil,
    status: isOverdue ? 'vencido' : daysUntil <= 3 ? 'proximo' : 'normal',
    label: `Día ${expense.dayOfMonth} • ${isOverdue ? 'vencido' : daysUntil === 0 ? 'hoy' : `en ${daysUntil} días`}`,
  };
}

export function getFixedExpensesCalendar(fixedExpenses, date = new Date()) {
  const monthStart = startOfMonth(date);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayIndex = monthStart.getDay();
  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  const eventsByDate = fixedExpenses.reduce((acc, expense) => {
    if (!expense.active) return acc;

    const eventDate = expense.type === 'Única' && expense.dueDate
      ? toDate(expense.dueDate)
      : new Date(date.getFullYear(), date.getMonth(), Number(expense.dayOfMonth || 1));

    if (expense.type === 'Mensual' && (!expense.dayOfMonth || eventDate.getMonth() !== date.getMonth() || eventDate.getFullYear() !== date.getFullYear())) return acc;
    if (expense.type === 'Única' && (!expense.dueDate || eventDate.getMonth() !== date.getMonth() || eventDate.getFullYear() !== date.getFullYear())) return acc;
    if (expense.type === 'Semanal') return acc;

    const key = eventDate.toISOString().slice(0, 10);
    const eventMeta = getExpensePaymentMeta(expense, date);

    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...expense, ...eventMeta });
    return acc;
  }, {});

  const days = Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - firstDayIndex;
    const currentDate = new Date(date.getFullYear(), date.getMonth(), dayOffset + 1);
    const key = currentDate.toISOString().slice(0, 10);

    return {
      date: currentDate,
      isCurrentMonth: currentDate.getMonth() === date.getMonth(),
      isToday: currentDate.toDateString() === new Date().toDateString(),
      events: currentDate.getMonth() === date.getMonth() ? eventsByDate[key] || [] : [],
    };
  });

  return {
    monthName: date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
    days,
    weeklyExpenses: fixedExpenses.filter((expense) => expense.active && expense.type === 'Semanal'),
  };
}

export function getUpcomingPayments(fixedExpenses, date = new Date()) {
  const statusPriority = { vencido: 0, proximo: 1, normal: 2 };

  return fixedExpenses
    .filter((expense) => expense.active)
    .map((expense) => ({
      ...expense,
      ...getExpensePaymentMeta(expense, date),
    }))
    .sort((a, b) => statusPriority[a.status] - statusPriority[b.status] || a.daysUntil - b.daysUntil)
    .slice(0, 5);
}

function getMovementsExcludingAutomaticDuplicates(movements, fixedExpenses, start, end) {
  const automaticExpenses = fixedExpenses.filter((expense) => expense.active && expense.automatic);

  return movements.filter((movement) => {
    if (movement.type !== 'Gasto') return true;

    const movementDate = toDate(movement.date);
    if (!isBetween(movementDate, start, end)) return true;

    const movementAmount = Number(movement.amount || 0);
    const comparableText = [movement.concept, movement.category, movement.notes]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase().trim())
      .join(' ');

    return !automaticExpenses.some((expense) => {
      if (Number(expense.amount || 0) !== movementAmount) return false;
      const expenseText = [expense.name].filter(Boolean).map((value) => String(value).toLowerCase().trim()).join(' ');
      return expenseText && comparableText.includes(expenseText);
    });
  });
}

export function summarizeFinances(state, date = new Date()) {
  const { settings, fixedExpenses, movements, goals, investments } = state;
  const weekStart = startOfWeek(date);
  const weekEnd = endOfWeek(date);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const monthName = date.toLocaleDateString('es-MX', { month: 'long' });

  const weekMovements = getMovementsExcludingAutomaticDuplicates(movements.filter((movement) => isBetween(movement.date, weekStart, weekEnd)), fixedExpenses, weekStart, weekEnd);
  const monthMovements = getMovementsExcludingAutomaticDuplicates(movements.filter((movement) => isBetween(movement.date, monthStart, monthEnd)), fixedExpenses, monthStart, monthEnd);
  const weeklyExpenses = weekMovements.filter((movement) => movement.type === 'Gasto').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const monthlyManualExpenses = monthMovements.filter((movement) => movement.type === 'Gasto').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const monthlyAutomaticExpenses = getMonthlyAutomaticFixedExpenses(fixedExpenses, date);
  const monthlyExpenses = monthlyManualExpenses + monthlyAutomaticExpenses;
  const monthlyIncome = monthMovements.filter((movement) => movement.type === 'Ingreso').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const automaticExpenses = getAutomaticFixedExpenses(fixedExpenses, date);
  const automaticWeekly = automaticExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const weeklyBudget = Number(settings.weeklyBudget || 0);
  const weeklyAvailable = weeklyBudget - automaticWeekly - weeklyExpenses;
  const remainingPercent = weeklyBudget ? (weeklyAvailable / weeklyBudget) * 100 : 0;
  const investmentsWithReturns = getInvestmentReturns(investments);
  const dailyReturns = investmentsWithReturns.reduce((sum, investment) => sum + investment.dailyReturn, 0);
  const monthlyReturns = getProratedInvestmentReturnsForMonth(investments, date, date);
  const shouldAdjustNetWorthForSync = !settings.lastNetWorthSyncDate;
  const netWorthBase = Number(settings.currentNetWorth || 0) - (shouldAdjustNetWorthForSync ? monthlyAutomaticExpenses : 0);
  const savingsThisMonth = monthlyIncome + monthlyReturns - monthlyExpenses;
  const netWorth = netWorthBase + monthlyReturns;
  const goalsProgress = goals.map((goal) => {
    const isCompleted = goal.status === 'terminada';
    return {
      ...goal,
      isCompleted,
      progress: isCompleted ? 0 : Math.min(100, Number(goal.targetAmount) ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0),
    };
  });
  const trendInsights = getTrendInsights({ settings, fixedExpenses, movements, goals, investments }, date);

  return {
    monthName,
    monthlySavingsGoal: Number(settings.monthlySavingsGoal || 0),
    weeklyBudget,
    automaticWeekly,
    weeklyExpenses,
    monthlyExpenses,
    weeklyAvailable,
    remainingPercent,
    savingsThisMonth,
    netWorth,
    dailyReturns,
    monthlyReturns,
    investmentsWithReturns,
    goalsProgress,
    upcomingPayments: getUpcomingPayments(fixedExpenses, date),
    fixedExpensesCalendar: getFixedExpensesCalendar(fixedExpenses, date),
    categoryData: getCategoryData(monthMovements),
    weeklyBars: [
      { name: 'Presupuesto', monto: weeklyBudget },
      { name: 'Gastado', monto: weeklyExpenses + automaticWeekly },
    ],
    savingsTrend: getSavingsTrend(movements, fixedExpenses, investments, date),
    status: getFinancialStatus(weeklyAvailable, remainingPercent, savingsThisMonth, settings.monthlySavingsGoal),
    trendInsights,
  };
}

function getTrendInsights(state, date) {
  const { settings, fixedExpenses, movements, investments } = state;
  const currentWeek = { start: startOfWeek(date), end: endOfWeek(date) };
  const previousWeekDate = new Date(date);
  previousWeekDate.setDate(previousWeekDate.getDate() - 7);
  const previousWeek = { start: startOfWeek(previousWeekDate), end: endOfWeek(previousWeekDate) };
  const currentMonth = { start: startOfMonth(date), end: endOfMonth(date) };
  const previousMonthDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const previousMonth = { start: startOfMonth(previousMonthDate), end: endOfMonth(previousMonthDate) };

  const currentWeekMovements = movements.filter((movement) => isBetween(movement.date, currentWeek.start, currentWeek.end));
  const previousWeekMovements = movements.filter((movement) => isBetween(movement.date, previousWeek.start, previousWeek.end));
  const currentMonthMovements = movements.filter((movement) => isBetween(movement.date, currentMonth.start, currentMonth.end));
  const previousMonthMovements = movements.filter((movement) => isBetween(movement.date, previousMonth.start, previousMonth.end));

  const currentWeekExpenses = currentWeekMovements.filter((movement) => movement.type === 'Gasto').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const previousWeekExpenses = previousWeekMovements.filter((movement) => movement.type === 'Gasto').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const currentAutomaticExpenses = getAutomaticFixedExpenses(fixedExpenses, date).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const previousAutomaticExpenses = getAutomaticFixedExpenses(fixedExpenses, previousWeek.end).reduce((sum, expense) => sum + Number(expense.amount), 0);
  const currentMonthExpenses = currentMonthMovements.filter((movement) => movement.type === 'Gasto').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const previousMonthExpenses = previousMonthMovements.filter((movement) => movement.type === 'Gasto').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const currentMonthIncome = currentMonthMovements.filter((movement) => movement.type === 'Ingreso').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const previousMonthIncome = previousMonthMovements.filter((movement) => movement.type === 'Ingreso').reduce((sum, movement) => sum + Number(movement.amount), 0);
  const currentMonthAutomaticExpenses = getMonthlyAutomaticFixedExpenses(fixedExpenses, date);
  const previousMonthAutomaticExpenses = getMonthlyAutomaticFixedExpenses(fixedExpenses, previousMonth.start);
  const currentMonthReturns = getProratedInvestmentReturnsForMonth(investments, date, date);
  const previousMonthReturns = getProratedInvestmentReturnsForMonth(investments, previousMonth.start, endOfMonth(previousMonth.start));
  const currentMonthSavings = currentMonthIncome - currentMonthExpenses - currentMonthAutomaticExpenses + currentMonthReturns;
  const previousMonthSavings = previousMonthIncome - previousMonthExpenses - previousMonthAutomaticExpenses + previousMonthReturns;

  const insights = [];
  const addComparisonInsight = (message) => {
    if (message) insights.push(message);
  };

  if (previousWeekExpenses > 0) {
    const difference = currentWeekExpenses - previousWeekExpenses;
    const percentage = Math.abs((difference / previousWeekExpenses) * 100);
    const verb = difference >= 0 ? 'más' : 'menos';
    addComparisonInsight(`Esta semana gastaste ${formatMoney(currentWeekExpenses)}, ${percentage.toFixed(0)}% ${verb} que la anterior.`);
  }

  if (previousAutomaticExpenses > 0 || currentAutomaticExpenses > 0) {
    const difference = currentAutomaticExpenses - previousAutomaticExpenses;
    const percentage = previousAutomaticExpenses ? Math.abs((difference / previousAutomaticExpenses) * 100) : 0;
    const verb = difference >= 0 ? 'más' : 'menos';
    addComparisonInsight(`Tus gastos fijos automáticos sumaron ${formatMoney(currentAutomaticExpenses)}, ${percentage.toFixed(0)}% ${verb} que la semana anterior.`);
  }

  if (previousMonthSavings !== 0 || currentMonthSavings !== 0) {
    const difference = currentMonthSavings - previousMonthSavings;
    const percentage = previousMonthSavings ? Math.abs((difference / previousMonthSavings) * 100) : 0;
    const verb = difference >= 0 ? 'más' : 'menos';
    addComparisonInsight(`Este mes ahorraste ${formatMoney(currentMonthSavings)}, ${percentage.toFixed(0)}% ${verb} que el mes anterior.`);
  }

  const categoryTotalsCurrent = currentMonthMovements.filter((movement) => movement.type === 'Gasto').reduce((acc, movement) => {
    acc[movement.category] = (acc[movement.category] || 0) + Number(movement.amount);
    return acc;
  }, {});
  const categoryTotalsPrevious = previousMonthMovements.filter((movement) => movement.type === 'Gasto').reduce((acc, movement) => {
    acc[movement.category] = (acc[movement.category] || 0) + Number(movement.amount);
    return acc;
  }, {});

  const topCategory = Object.entries(categoryTotalsCurrent)
    .map(([name, currentAmount]) => ({ name, currentAmount, previousAmount: categoryTotalsPrevious[name] || 0 }))
    .filter((item) => item.previousAmount > 0 || item.currentAmount > 0)
    .sort((a, b) => b.currentAmount - a.currentAmount)[0];

  if (topCategory && topCategory.previousAmount > 0) {
    const difference = topCategory.currentAmount - topCategory.previousAmount;
    const percentage = Math.abs((difference / topCategory.previousAmount) * 100);
    const verb = difference >= 0 ? 'más' : 'menos';
    addComparisonInsight(`En ${topCategory.name} gastaste ${formatMoney(topCategory.currentAmount)}, ${percentage.toFixed(0)}% ${verb} que el mes anterior.`);
  }

  return insights.slice(0, 4);
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

export function getCategoryData(movements) {
  const totals = movements
    .filter((movement) => movement.type === 'Gasto')
    .reduce((acc, movement) => {
      acc[movement.category] = (acc[movement.category] || 0) + Number(movement.amount);
      return acc;
    }, {});

  return Object.entries(totals).map(([name, value]) => ({ name, value }));
}

function getSavingsTrend(movements, fixedExpenses, investments, selectedDate) {
  const currentReference = toDate(selectedDate || new Date());
  const firstMovementDate = movements
    .map((movement) => new Date(movement.date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a - b)[0];

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(currentReference);
    date.setMonth(currentReference.getMonth() - (5 - index));
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const monthLabel = date.toLocaleDateString('es-MX', { month: 'short' });

    if (firstMovementDate && end < startOfMonth(firstMovementDate)) {
      return {
        month: monthLabel,
        ahorro: 0,
      };
    }

    const monthlyAutomaticExpenses = getMonthlyAutomaticFixedExpenses(fixedExpenses, date);
    const monthMovements = getMovementsExcludingAutomaticDuplicates(
      movements.filter((movement) => isBetween(movement.date, start, end)),
      fixedExpenses,
      start,
      end,
    );
    const expenses = monthMovements
      .filter((movement) => movement.type === 'Gasto')
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
    const income = monthMovements
      .filter((movement) => movement.type === 'Ingreso')
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
    const referenceDate = date.getMonth() === currentReference.getMonth() && date.getFullYear() === currentReference.getFullYear()
      ? currentReference
      : endOfMonth(date);
    const monthlyReturns = getProratedInvestmentReturnsForMonth(investments, date, referenceDate);

    return {
      month: monthLabel,
      ahorro: income - expenses - monthlyAutomaticExpenses + monthlyReturns,
    };
  });
}

function getFinancialStatus(weeklyAvailable, remainingPercent, savingsThisMonth, savingsGoal) {
  if (weeklyAvailable < 0) return { tone: 'error', title: 'Atención', message: 'Esta semana ya excediste tu presupuesto.' };
  if (savingsThisMonth >= Number(savingsGoal || 0)) return { tone: 'success', title: 'Excelente', message: 'Este mes estás cumpliendo tu meta de ahorro.' };
  if (remainingPercent <= 20) return { tone: 'warning', title: 'Cuida el ritmo', message: 'Tu presupuesto semanal está por debajo del 20%.' };
  return { tone: 'success', title: 'Buen avance', message: `Todavía puedes gastar ${weeklyAvailable.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })} esta semana.` };
}
