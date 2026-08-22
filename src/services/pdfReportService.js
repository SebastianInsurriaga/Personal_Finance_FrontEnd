import { jsPDF } from 'jspdf';
import { endOfMonth, isBetween, startOfMonth } from '../utils/dateUtils.js';
import { summarizeFinances } from '../utils/financeUtils.js';

const colors = { navy: [24, 39, 75], blue: [37, 99, 235], teal: [20, 184, 166], orange: [245, 158, 11], red: [239, 68, 68], ink: [31, 41, 55], muted: [107, 114, 128], light: [241, 245, 249], white: [255, 255, 255] };
const currency = (value) => Number(value || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const dateText = (value) => new Date(`${value}T00:00:00`).toLocaleDateString('es-MX');

export function generateFinancialReport(state, selectedMonth) {
  const [year, month] = selectedMonth.split('-').map(Number);
  const selectedDate = endOfMonth(new Date(year, month - 1, 1));
  const summary = summarizeFinances(state, selectedDate);
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const movements = state.movements.filter((movement) => isBetween(movement.date, monthStart, monthEnd));
  const monthLabel = selectedDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const header = (title, subtitle = '') => {
    doc.setFillColor(...colors.navy); doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(...colors.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.text(title, 16, 12);
    if (subtitle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(subtitle, 16, 19); }
    doc.setTextColor(...colors.ink);
  };
  const footer = () => {
    doc.setDrawColor(...colors.light); doc.line(16, pageHeight - 13, pageWidth - 16, pageHeight - 13);
    doc.setFontSize(8); doc.setTextColor(...colors.muted); doc.text('Reporte generado por Finanzas', 16, pageHeight - 7); doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - 35, pageHeight - 7);
  };
  const sectionTitle = (title, y) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...colors.navy); doc.text(title, 16, y);
    doc.setDrawColor(...colors.teal); doc.setLineWidth(0.8); doc.line(16, y + 3, 48, y + 3); return y + 11;
  };
  const metric = (x, y, width, title, value, color) => {
    doc.setFillColor(...colors.light); doc.roundedRect(x, y, width, 25, 2, 2, 'F'); doc.setFillColor(...color); doc.rect(x, y, 3, 25, 'F');
    doc.setTextColor(...colors.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text(title, x + 8, y + 8);
    doc.setTextColor(...colors.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(currency(value), x + 8, y + 19);
  };
  const table = (headers, rows, startY, widths) => {
    const x = 16; const rowHeight = 7; const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    doc.setFillColor(...colors.navy); doc.rect(x, startY, totalWidth, rowHeight, 'F'); doc.setTextColor(...colors.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    let cursorX = x;
    headers.forEach((label, index) => { doc.text(label, cursorX + 2, startY + 4.7); cursorX += widths[index]; });
    rows.forEach((row, rowIndex) => {
      const y = startY + rowHeight + rowIndex * rowHeight; doc.setFillColor(...(rowIndex % 2 ? colors.white : colors.light)); doc.rect(x, y, totalWidth, rowHeight, 'F');
      doc.setTextColor(...colors.ink); doc.setFont('helvetica', 'normal'); cursorX = x;
      row.forEach((value, index) => { doc.text(doc.splitTextToSize(String(value), widths[index] - 4)[0], cursorX + 2, y + 4.7); cursorX += widths[index]; });
    });
    return startY + rowHeight * (rows.length + 1);
  };
  const barChart = (data, x, y, width, height, title) => {
    sectionTitle(title, y); const chartY = y + 8; const max = Math.max(...data.map((item) => Number(item.value || 0)), 1); const slot = (width - 10) / Math.max(data.length, 1); const barWidth = Math.min(22, slot - 4);
    data.forEach((item, index) => { const barHeight = (Number(item.value || 0) / max) * (height - 20); const barX = x + 5 + index * slot; doc.setFillColor(...[colors.blue, colors.teal, colors.orange, colors.red][index % 4]); doc.roundedRect(barX, chartY + height - barHeight, barWidth, barHeight, 1, 1, 'F'); doc.setTextColor(...colors.muted); doc.setFontSize(7); doc.text(String(item.name).slice(0, 12), barX + barWidth / 2, chartY + height + 5, { align: 'center' }); });
    doc.setDrawColor(...colors.light); doc.line(x, chartY + height, x + width, chartY + height);
  };

  header('Reporte financiero', `Resumen de ${monthLabel}`);
  doc.setTextColor(...colors.muted); doc.setFontSize(9); doc.text(`Periodo: ${monthStart.toLocaleDateString('es-MX')} - ${monthEnd.toLocaleDateString('es-MX')}`, 16, 35);
  let y = 44; const metricWidth = 42;
  metric(16, y, metricWidth, 'Ingresos', summary.monthlyIncome || 0, colors.teal); metric(62, y, metricWidth, 'Gastos', summary.monthlyExpenses, colors.red); metric(108, y, metricWidth, 'Ahorro', summary.savingsThisMonth, colors.blue); metric(154, y, metricWidth, 'Rendimiento', summary.monthlyReturns, colors.orange);
  y = sectionTitle('Resumen del periodo', 82);
  table(['Indicador', 'Total'], [['Ingresos registrados', currency(summary.monthlyIncome || 0)], ['Gastos manuales y fijos', currency(summary.monthlyExpenses)], ['Ahorro neto', currency(summary.savingsThisMonth)], ['Patrimonio estimado', currency(summary.netWorth)], ['Meta de ahorro', currency(summary.monthlySavingsGoal)]], y, [125, 65]);
  barChart(summary.categoryData.slice().sort((a, b) => b.value - a.value).slice(0, 6), 16, 145, 178, 48, 'Gastos por categoría');
  barChart([{ name: 'Ingresos', value: summary.monthlyIncome }, { name: 'Gastos', value: summary.monthlyExpenses }], 16, 216, 178, 38, 'Ingresos vs gastos'); footer();

  doc.addPage(); header('Detalle del periodo', monthLabel); y = 37;
  const movementRows = movements.length ? movements.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map((movement) => [dateText(movement.date), String(movement.concept || 'Sin concepto').slice(0, 25), movement.category || '-', movement.type, currency(movement.amount)]) : [['-', 'No hay movimientos registrados', '-', '-', currency(0)]];
  y = sectionTitle('Movimientos', y); y = table(['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto'], movementRows, y, [25, 62, 35, 28, 35]) + 7;
  y = sectionTitle('Metas', y);
  const goalRows = state.goals.length ? state.goals.map((goal) => [`${goal.name} (${goal.status})`, currency(goal.currentAmount), currency(goal.targetAmount), `${Math.round(Number(goal.targetAmount) ? (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100 : 0)}%`]) : [['Sin metas', '-', '-', '-']];
  table(['Meta', 'Actual', 'Objetivo', 'Avance'], goalRows, y, [80, 38, 38, 29]); footer();

  doc.addPage(); header('Patrimonio y compromisos', monthLabel); y = 37; y = sectionTitle('Inversiones', y);
  const investmentRows = state.investments.length ? summary.investmentsWithReturns.map((investment) => [investment.name, currency(investment.capital), `${investment.annualRate}%`, currency(investment.monthlyReturn)]) : [['Sin inversiones', '-', '-', '-']];
  y = table(['Inversión', 'Capital', 'Tasa anual', 'Rend. mensual'], investmentRows, y, [75, 42, 35, 33]) + 10; y = sectionTitle('Gastos fijos activos', y);
  const fixedRows = state.fixedExpenses.filter((expense) => expense.active).map((expense) => [expense.name, expense.type, currency(expense.amount), expense.automatic ? 'Automático' : 'Manual']);
  table(['Concepto', 'Frecuencia', 'Monto', 'Origen'], fixedRows.length ? fixedRows : [['Sin gastos fijos', '-', '-', '-']], y, [75, 40, 42, 28]); footer(); doc.save(`reporte-financiero-${selectedMonth}.pdf`);
}