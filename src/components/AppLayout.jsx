import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { DashboardIcon, DarkModeIcon, LightModeIcon, MenuIcon, PaletteIcon, PaymentsIcon, SettingsIcon, WalletIcon } from './AppIcons.jsx';

const drawerWidth = 248;
const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Configuración', path: '/configuracion', icon: <SettingsIcon /> },
  { label: 'Movimientos', path: '/movimientos', icon: <PaymentsIcon /> },
];

export default function AppLayout({ children, mode, onToggleMode, onSetPalette, selectedPalette }) {
  const isDesktop = useMediaQuery((theme) => theme.breakpoints.up('md'));
  const [open, setOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const palettes = [
    { id: 'default', label: 'Por defecto', colors: ['#2563eb', '#14b8a6', '#16a34a'] },
    { id: 'sunset', label: 'Atardecer', colors: ['#f97316', '#ec4899', '#8b5cf6'] },
    { id: 'mint', label: 'Menta', colors: ['#10b981', '#6366f1', '#22c55e'] },
    { id: 'ocean', label: 'Océano', colors: ['#0ea5e9', '#0f766e', '#22c55e'] },
    { id: 'berry', label: 'Frambuesa', colors: ['#8b5cf6', '#db2777', '#14b8a6'] },
    { id: 'citrus', label: 'Cítricos', colors: ['#eab308', '#ea580c', '#84cc16'] },
    { id: 'twilight', label: 'Crepúsculo', colors: ['#4f46e5', '#7c3aed', '#06b6d4'] },
    { id: 'aurora', label: 'Aurora', colors: ['#0f766e', '#0891b2', '#7c3aed'] },
  ];

  const drawer = (
    <Box sx={{ height: '100%', px: 2, py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, px: 1 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 2, bgcolor: 'primary.main', color: 'white' }}>
          <WalletIcon />
        </Box>
        <Box>
          <Typography variant="h6">Mi Banco</Typography>
          <Typography variant="body2" color="text.secondary">Finanzas personales</Typography>
        </Box>
      </Box>
      <List sx={{ display: 'grid', gap: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            onClick={() => setOpen(false)}
            sx={{
              borderRadius: 2,
              '&.active': {
                bgcolor: 'primary.main',
                color: 'white',
                '& .MuiListItemIcon-root': { color: 'white' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 42 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(16px)', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ ml: { md: `${drawerWidth}px` }, gap: 1 }}>
          {!isDesktop && (
            <IconButton onClick={() => setOpen(true)} aria-label="Abrir menú">
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Panel financiero</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={() => setPaletteOpen(true)} aria-label="Paletas de color">
              <PaletteIcon />
            </IconButton>
            <IconButton onClick={onToggleMode} aria-label="Cambiar tema">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Box component="nav">
        <Drawer variant={isDesktop ? 'permanent' : 'temporary'} open={isDesktop || open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: drawerWidth, borderRight: 0 } }}>
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ ml: { md: `${drawerWidth}px` }, px: { xs: 2, sm: 3, lg: 4 }, pt: 11, pb: 5 }}>
        {children}
      </Box>

      <Drawer anchor="right" open={paletteOpen} onClose={() => setPaletteOpen(false)}>
        <Box sx={{ width: 320, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Paletas visuales</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Elige una plantilla de color para tu app. Solo cambia el aspecto visual.
          </Typography>
          <Stack spacing={2}>
            {palettes.map((palette) => (
              <Box key={palette.id} sx={{ p: 2, borderRadius: 3, border: 1, borderColor: selectedPalette === palette.id ? 'primary.main' : 'divider', cursor: 'pointer' }} onClick={() => { onSetPalette(palette.id); setPaletteOpen(false); }}>
                <Typography fontWeight={700}>{palette.label}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {palette.colors.map((color) => (
                    <Box key={color} sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: color, border: '1px solid', borderColor: 'divider' }} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
}
