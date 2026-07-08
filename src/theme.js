import { createTheme } from '@mui/material/styles';

const paletteTemplates = {
  default: {
    primary: '#2563eb',
    secondary: '#14b8a6',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  sunset: {
    primary: '#f97316',
    secondary: '#ec4899',
    success: '#8b5cf6',
    warning: '#f59e0b',
    error: '#fb7185',
  },
  mint: {
    primary: '#10b981',
    secondary: '#6366f1',
    success: '#22c55e',
    warning: '#facc15',
    error: '#ef4444',
  },
  ocean: {
    primary: '#0ea5e9',
    secondary: '#0f766e',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#f97316',
  },
  berry: {
    primary: '#8b5cf6',
    secondary: '#db2777',
    success: '#14b8a6',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  citrus: {
    primary: '#eab308',
    secondary: '#ea580c',
    success: '#84cc16',
    warning: '#f97316',
    error: '#dc2626',
  },
  twilight: {
    primary: '#4f46e5',
    secondary: '#7c3aed',
    success: '#06b6d4',
    warning: '#f59e0b',
    error: '#e11d48',
  },
  aurora: {
    primary: '#0f766e',
    secondary: '#0891b2',
    success: '#84cc16',
    warning: '#f59e0b',
    error: '#7c3aed',
  },
};

export function createAppTheme(mode, paletteName = 'default') {
  const isDark = mode === 'dark';
  const palette = paletteTemplates[paletteName] || paletteTemplates.default;

  return createTheme({
    palette: {
      mode,
      primary: { main: palette.primary },
      secondary: { main: palette.secondary },
      success: { main: palette.success },
      warning: { main: palette.warning },
      error: { main: palette.error },
      background: {
        default: isDark ? '#0f172a' : '#f4f7fb',
        paper: isDark ? '#172033' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#101828',
        secondary: isDark ? '#a8b3c7' : '#667085',
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: 0 },
      h5: { fontWeight: 700, letterSpacing: 0 },
      h6: { fontWeight: 700, letterSpacing: 0 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: isDark
              ? '0 16px 48px rgba(0,0,0,0.25)'
              : '0 16px 40px rgba(15, 23, 42, 0.08)',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
    },
  });
}
