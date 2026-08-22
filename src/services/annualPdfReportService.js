import { jsPDF } from 'jspdf';
import { endOfMonth } from '../utils/dateUtils.js';
import { summarizeFinances } from '../utils/financeUtils.js';

const palette = { navy: [24, 39, 75], blue: [37, 99, 235], teal: [20, 184, 166], orange: [245, 158, 11], red: [239, 68, 68], ink: [31, 41, 55], muted: [107, 114, 128], light: [241, 245, 249], white: [255, 255, 255] };
const money = (value) => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });

export function generateAnnualFinancialReport(state, year) {
  const summaries = Array.from({ length: 12 }, (_, monthIndex) => summarizeFinances(state, endOfMonth(new Date(year, monthIndex, 1))));
  const totals = summaries.reduce((result, summary) => ({
    income: result.income + summary.monthlyIncome,
    expenses: result.expenses + summary.monthlyExpenses,
    savings: result.savings + summary.savingsThisMonth,
    returns: result.returns + summary.monthlyReturns,
  }), { income: 0, expenses: 0, savings: 0, returns: 0 });
  const categories = summaries.reduce((result, summary) => {
    summary.categoryData.forEach((category) => { result[category.name] = (result[category.name] || 0) + category.value; });
    return result;
  }, {});
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const header = (title, subtitle) => { doc.setFillColor(...palette.navy); doc.rect(0, 0, pageWidth, 25, 'F'); doc.setTextColor(...palette.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(title, 16, 12); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(subtitle, 16, 19); doc.setTextColor(...palette.ink); };
  const footer = () => { doc.setDrawColor(...palette.light); doc.line(16, pageHeight - 13, pageWidth - 16, pageHeight - 13); doc.setFontSize(8); doc.setTextColor(...palette.muted); doc.text('Reporte generado por Finanzas', 16, pageHeight - 7); doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - 35, pageHeight - 7); };
  const title = (text, y) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...palette.navy); doc.text(text, 16, y); doc.setDrawColor(...palette.teal); doc.line(16, y + 3, 48, y + 3); return y + 11; };
  const metric = (x, label, value, color) => { doc.setFillColor(...palette.light); doc.roundedRect(x, 36, 42, 25, 2, 2, 'F'); doc.setFillColor(...color); doc.rect(x, 36, 3, 25, 'F'); doc.setTextColor(...palette.muted); doc.setFontSize(8); doc.text(label, x + 8, 44); doc.setTextColor(...palette.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(money(value), x + 8, 55); };
  const table = (headers, rows, y, widths) => { const x = 16; const rowHeight = 7; const totalWidth = widths.reduce((sum, width) => sum + width, 0); doc.setFillColor(...palette.navy); doc.rect(x, y, totalWidth, rowHeight, 'F'); doc.setTextColor(...palette.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); let cursorX = x; headers.forEach((label, index) => { doc.text(label, cursorX + 2, y + 4.7); cursorX += widths[index]; }); rows.forEach((row, rowIndex) => { const rowY = y + rowHeight + rowIndex * rowHeight; doc.setFillColor(...(rowIndex % 2 ? palette.white : palette.light)); doc.rect(x, rowY, totalWidth, rowHeight, 'F'); doc.setTextColor(...palette.ink); doc.setFont('helvetica', 'normal'); cursorX = x; row.forEach((value, index) => { doc.text(String(value).slice(0, 24), cursorX + 2, rowY + 4.7); cursorX += widths[index]; }); }); };
  const chart = (data, y, chartTitle) => { y = title(chartTitle, y); const slot = 178 / Math.max(data.length, 1); const max = Math.max(...data.map((item) => Number(item.value || 0)), 1); data.forEach((item, index) => { const barHeight = (Number(item.value || 0) / max) * 38; const barX = 18 + index * slot; doc.setFillColor(...[palette.blue, palette.teal, palette.orange, palette.red][index % 4]); doc.roundedRect(barX, y + 43 - barHeight, Math.max(5, slot - 4), barHeight, 1, 1, 'F'); doc.setTextColor(...palette.muted); doc.setFontSize(6.5); doc.text(String(item.name).slice(0, 10), barX + (slot - 4) / 2, y + 49, { align: 'center' }); }); doc.setDrawColor(...palette.light); doc.line(16, y + 43, 194, y + 43); return y + 60; };

  header('Reporte financiero anual', `Resumen de ${year}`);
  metric(16, 'Ingresos', totals.income, palette.teal); metric(62, 'Gastos', totals.expenses, palette.red); metric(108, 'Ahorro', totals.savings, palette.blue); metric(154, 'Rendimiento', totals.returns, palette.orange);
  let y = title('Resumen anual', 75);
  table(['Indicador', 'Total'], [['Ingresos del año', money(totals.income)], ['Gastos del año', money(totals.expenses)], ['Ahorro acumulado', money(totals.savings)], ['Rendimientos estimados', money(totals.returns)], ['Meta de ahorro anual', money(Number(state.settings.monthlySavingsGoal || 0) * 12)]], y, [125, 65]);
  y = chart(summaries.map((summary, monthIndex) => ({ name: new Date(year, monthIndex, 1).toLocaleDateString('es-MX', { month: 'short' }), value: summary.monthlyExpenses })), 151, 'Gastos por mes');
  chart(Object.entries(categories).sort((first, second) => second[1] - first[1]).slice(0, 8).map(([name, value]) => ({ name, value })), y, 'Gastos por categoría'); footer();

  doc.addPage(); header('Detalle anual', `Información registrada durante ${year}`); y = title('Resumen mensual', 37);
  table(['Mes', 'Ingresos', 'Gastos', 'Ahorro', 'Rendimiento'], summaries.map((summary, monthIndex) => [new Date(year, monthIndex, 1).toLocaleDateString('es-MX', { month: 'long' }), money(summary.monthlyIncome), money(summary.monthlyExpenses), money(summary.savingsThisMonth), money(summary.monthlyReturns)]), y, [42, 38, 38, 40, 42]);
  y = title('Metas actuales', 145);
  table(['Meta', 'Actual', 'Objetivo', 'Avance'], state.goals.map((goal) => [goal.name, money(goal.currentAmount), money(goal.targetAmount), `${Math.round(Number(goal.targetAmount) ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0)}%`]), y, [80, 38, 38, 29]); footer();

  doc.addPage(); header('Patrimonio y compromisos', `Cierre del reporte ${year}`); y = title('Inversiones', 37);
  table(['Inversión', 'Capital', 'Tasa anual', 'Rend. mensual'], state.investments.map((investment) => { const annualReturn = Number(investment.capital || 0) * Number(investment.annualRate || 0) / 100; return [investment.name, money(investment.capital), `${investment.annualRate}%`, money(annualReturn / 12)]; }), y, [75, 42, 35, 33]);
  y = title('Gastos fijos activos', 100 + state.investments.length * 7);
  table(['Concepto', 'Frecuencia', 'Monto', 'Origen'], state.fixedExpenses.filter((expense) => expense.active).map((expense) => [expense.name, expense.type, money(expense.amount), expense.automatic ? 'Automático' : 'Manual']), y, [75, 40, 42, 28]); footer(); doc.save(`reporte-financiero-anual-${year}.pdf`);
}