import { Alert, Box, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import FinancialCharts from '../components/FinancialCharts.jsx';
import FixedExpensesCalendar from '../components/FixedExpensesCalendar.jsx';
import GoalProgress from '../components/GoalProgress.jsx';
import { SavingsIcon, TrendIcon, WalletIcon } from '../components/AppIcons.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { useFinanceSummary } from '../hooks/useFinanceSummary.js';
import { formatCurrency } from '../utils/formatters.js';

function budgetColor(percent, available) {
  if (available < 0) return 'error.main';
  if (percent < 20) return 'warning.main';
  if (percent > 40) return 'success.main';
  return 'primary.main';
}

export default function Dashboard() {
  const summary = useFinanceSummary();
  const color = budgetColor(summary.remainingPercent, summary.weeklyAvailable);

  return (
    <Stack spacing={3}>
      <SectionHeader title="Dashboard" subtitle={`Resumen automático de ${summary.monthName}`} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', xl: 'repeat(4, 1fr)' }, gap: 3 }}>
        <StatCard title="Patrimonio actual" value={formatCurrency(summary.netWorth)} subtitle="Incluye rendimientos del mes" icon={<WalletIcon />} color="primary.main" />
        <StatCard title="Disponible esta semana" value={formatCurrency(summary.weeklyAvailable)} subtitle={`${Math.round(summary.remainingPercent)}% del presupuesto`} icon={<WalletIcon />} color={color} progress={summary.remainingPercent} />
        <StatCard title="Gastado esta semana" value={formatCurrency(summary.weeklyExpenses + summary.automaticWeekly)} subtitle="Gastos manuales + fijos automáticos" icon={<TrendIcon />} color="error.main" />
        <StatCard title="Ahorro del mes" value={formatCurrency(summary.savingsThisMonth)} subtitle={`Meta: ${formatCurrency(summary.monthlySavingsGoal)}`} icon={<SavingsIcon />} color="secondary.main" />
        <StatCard title="Presupuesto semanal" value={formatCurrency(summary.weeklyBudget)} subtitle={`Fijos automáticos: ${formatCurrency(summary.automaticWeekly)}`} icon={<WalletIcon />} color="primary.main" />
        <StatCard title="Gastado este mes" value={formatCurrency(summary.monthlyExpenses)} subtitle="Solo movimientos registrados" icon={<TrendIcon />} color="warning.main" />
        <StatCard title="Rendimiento diario" value={formatCurrency(summary.dailyReturns)} subtitle="Estimado por inversiones" icon={<TrendIcon />} color="success.main" />
        <StatCard title="Rendimiento mensual" value={formatCurrency(summary.monthlyReturns)} subtitle="Estimado por tasa anual" icon={<TrendIcon />} color="secondary.main" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' }, gap: 3 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Estado financiero</Typography>
            <Alert severity={summary.status.tone} sx={{ borderRadius: 2 }}>
              <Typography fontWeight={700}>{summary.status.title}</Typography>
              <Typography variant="body2">{summary.status.message}</Typography>
            </Alert>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography fontWeight={700}>Presupuesto semanal</Typography>
                <Chip label={summary.weeklyAvailable < 0 ? 'Excedido' : `${Math.round(summary.remainingPercent)}% disponible`} color={summary.weeklyAvailable < 0 ? 'error' : summary.remainingPercent < 20 ? 'warning' : 'success'} />
              </Box>
              <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, summary.remainingPercent))} sx={{ height: 12, borderRadius: 999, '& .MuiLinearProgress-bar': { bgcolor: color } }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Próximos pagos</Typography>
            <Stack spacing={1.5}>
              {summary.upcomingPayments.map((payment) => (
                <Box key={payment.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: payment.status === 'vencido' ? 'rgba(139, 92, 246, 0.12)' : payment.status === 'proximo' ? 'rgba(245, 158, 11, 0.12)' : 'action.hover', border: '1px solid', borderColor: payment.status === 'vencido' ? 'secondary.main' : payment.status === 'proximo' ? 'warning.main' : 'divider' }}>
                  <Box>
                    <Typography fontWeight={700}>{payment.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{payment.label}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight={700}>{formatCurrency(payment.amount)}</Typography>
                    <Typography variant="caption" sx={{ color: payment.status === 'vencido' ? 'secondary.main' : payment.status === 'proximo' ? 'warning.main' : 'text.secondary' }}>
                      {payment.status === 'vencido' ? 'Vencido' : payment.status === 'proximo' ? 'Próximo' : 'Programado'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Calendario de pagos</Typography>
          <FixedExpensesCalendar days={summary.fixedExpensesCalendar.days} monthName={summary.fixedExpensesCalendar.monthName} weeklyExpenses={summary.fixedExpensesCalendar.weeklyExpenses} />
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Tendencias</Typography>
          <Stack spacing={1.5}>
            {summary.trendInsights.length ? summary.trendInsights.map((insight, index) => (
              <Box key={`${insight}-${index}`} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body1">{insight}</Typography>
              </Box>
            )) : <Typography color="text.secondary">Aún no hay suficientes datos para mostrar tendencias.</Typography>}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Metas</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {summary.goalsProgress.map((goal) => <GoalProgress key={goal.id} goal={goal} />)}
          </Box>
        </CardContent>
      </Card>

      <FinancialCharts categoryData={summary.categoryData} weeklyBars={summary.weeklyBars} savingsTrend={summary.savingsTrend} />
    </Stack>
  );
}
