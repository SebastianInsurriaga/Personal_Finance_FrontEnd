import { Box, Chip, LinearProgress, Typography } from '@mui/material';
import { formatCurrency, formatPercent } from '../utils/formatters.js';

export default function GoalProgress({ goal }) {
  return (
    <Box sx={{ p: 2, borderRadius: 2, bgcolor: goal.isCompleted ? 'success.light' : 'background.paper', border: goal.isCompleted ? '1px solid' : 'none', borderColor: 'success.main' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1, alignItems: 'center' }}>
        <Typography fontWeight={700}>{goal.name}</Typography>
        {goal.isCompleted ? <Chip label="Terminada" color="success" size="small" /> : <Typography color="text.secondary">{formatPercent(goal.progress)}</Typography>}
      </Box>
      <LinearProgress
        variant="determinate"
        value={goal.isCompleted ? 100 : goal.progress}
        sx={{
          height: 10,
          borderRadius: 999,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: goal.isCompleted ? 'success.main' : goal.color },
        }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
        {goal.isCompleted ? 'Meta completada' : `${formatCurrency(goal.currentAmount)} de ${formatCurrency(goal.targetAmount)}`}
      </Typography>
    </Box>
  );
}
