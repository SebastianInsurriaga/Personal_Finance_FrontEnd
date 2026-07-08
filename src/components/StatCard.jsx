import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';

export default function StatCard({ title, value, subtitle, icon, color = 'primary.main', progress }) {
  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">{title}</Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>{value}</Typography>
          </Box>
          <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 2, color: 'white', bgcolor: color }}>
            {icon}
          </Box>
        </Box>
        {subtitle && <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>{subtitle}</Typography>}
        {typeof progress === 'number' && <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, progress))} sx={{ mt: 2, height: 8, borderRadius: 999 }} />}
      </CardContent>
    </Card>
  );
}
