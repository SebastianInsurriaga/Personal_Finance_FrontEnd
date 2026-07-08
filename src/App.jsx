import { CssBaseline, ThemeProvider } from '@mui/material';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Settings from './pages/Settings.jsx';
import Movements from './pages/Movements.jsx';
import { useFinance } from './context/FinanceContext.jsx';
import { createAppTheme } from './theme.js';

export default function App() {
  const { state, toggleColorMode, setPalette } = useFinance();
  const theme = createAppTheme(state.preferences.mode, state.preferences.palette);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppLayout mode={state.preferences.mode} onToggleMode={toggleColorMode} onSetPalette={setPalette} selectedPalette={state.preferences.palette}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/configuracion" element={<Settings />} />
          <Route path="/movimientos" element={<Movements />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </ThemeProvider>
  );
}
