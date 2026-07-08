import { Box, Card, CardContent, Typography, useTheme } from '@mui/material';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import EmptyState from './EmptyState.jsx';

function ChartCard({ title, children }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{title}</Typography>
        <Box sx={{ width: '100%', height: 280 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}

export default function FinancialCharts({ categoryData, weeklyBars, savingsTrend }) {
  const theme = useTheme();
  const axisColor = theme.palette.text.secondary;
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
      <ChartCard title="Gastos por categoría">
        {categoryData.length ? (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                {categoryData.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-MX')}`} />
            </PieChart>
          </ResponsiveContainer>
        ) : <EmptyState description="Registra gastos para activar la gráfica." />}
      </ChartCard>
      <ChartCard title="Presupuesto semanal vs gasto">
        <ResponsiveContainer>
          <BarChart data={weeklyBars}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="name" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-MX')}`} />
            <Bar dataKey="monto" radius={[8, 8, 0, 0]} fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Ahorro mensual">
        <ResponsiveContainer>
          <LineChart data={savingsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="month" stroke={axisColor} />
            <YAxis stroke={axisColor} />
            <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-MX')}`} />
            <Line type="monotone" dataKey="ahorro" stroke={theme.palette.success.main} strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Comparación por categoría">
        {categoryData.length ? (
          <ResponsiveContainer>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis dataKey="name" stroke={axisColor} />
              <YAxis stroke={axisColor} />
              <Tooltip formatter={(value) => `$${Number(value).toLocaleString('es-MX')}`} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill={theme.palette.warning.main} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState description="No hay gastos del mes actual." />}
      </ChartCard>
    </Box>
  );
}
