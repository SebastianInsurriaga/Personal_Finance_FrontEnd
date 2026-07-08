import { Box, Chip, Stack, Typography } from '@mui/material';

const weekdayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function getCellTone(events) {
  if (events.some((event) => event.status === 'vencido')) {
    return {
      borderColor: 'secondary.main',
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      chipColor: 'secondary',
    };
  }

  if (events.some((event) => event.status === 'proximo')) {
    return {
      borderColor: 'warning.main',
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      chipColor: 'warning',
    };
  }

  return {
    borderColor: 'divider',
    backgroundColor: 'background.default',
    chipColor: 'primary',
  };
}

export default function FixedExpensesCalendar({ days, monthName, weeklyExpenses = [] }) {
  return (
    <Box sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="text.secondary">{monthName}</Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1, mb: 1 }}>
        {weekdayLabels.map((day) => (
          <Typography key={day} variant="caption" sx={{ textAlign: 'center', fontWeight: 700, color: 'text.secondary' }}>
            {day}
          </Typography>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
        {days.map((cell) => {
          const tone = getCellTone(cell.events);
          return (
          <Box
            key={`${cell.date.getFullYear()}-${cell.date.getMonth()}-${cell.date.getDate()}`}
            sx={{
              minHeight: 78,
              p: 0.75,
              borderRadius: 2,
              border: '1px solid',
              borderColor: cell.isToday ? 'primary.main' : tone.borderColor,
              bgcolor: cell.isCurrentMonth ? tone.backgroundColor : 'action.hover',
              boxShadow: cell.isToday ? '0 8px 20px rgba(37, 99, 235, 0.16)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, color: cell.isCurrentMonth ? 'text.primary' : 'text.disabled' }}>
              {cell.date.getDate()}
            </Typography>
            <Stack spacing={0.5}>
              {cell.events.slice(0, 2).map((event) => (
                <Box key={event.id} sx={{ px: 0.75, py: 0.35, borderRadius: 999, bgcolor: event.status === 'vencido' ? 'secondary.main' : event.status === 'proximo' ? 'warning.main' : 'primary.main', color: 'white', overflow: 'hidden' }}>
                  <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {event.name}
                  </Typography>
                </Box>
              ))}
              {cell.events.length > 2 ? <Typography variant="caption" color="text.secondary">+{cell.events.length - 2}</Typography> : null}
            </Stack>
          </Box>
          );
        })}
      </Box>

      {weeklyExpenses.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Recurrentes semanales</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {weeklyExpenses.map((expense) => (
              <Chip key={expense.id} label={expense.name} color="secondary" variant="outlined" />
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
}
