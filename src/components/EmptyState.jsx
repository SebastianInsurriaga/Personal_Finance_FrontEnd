import { Box, Typography } from '@mui/material';

export default function EmptyState({ title = 'Sin información', description = 'Agrega datos para ver esta sección.' }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
      <Typography fontWeight={700} color="text.primary">{title}</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>{description}</Typography>
    </Box>
  );
}
