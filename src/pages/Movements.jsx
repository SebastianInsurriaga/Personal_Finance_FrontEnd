import { Alert, Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Snackbar, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { AddIcon, DeleteIcon, EditIcon } from '../components/AppIcons.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import { categories } from '../data/initialData.js';
import { useFinance } from '../context/FinanceContext.jsx';
import { formatCurrency } from '../utils/formatters.js';

const createEmptyMovement = () => ({
  date: new Date().toISOString().slice(0, 10),
  concept: '',
  category: 'Otros',
  amount: '',
  type: 'Gasto',
  notes: '',
});

export default function Movements() {
  const { state, dispatch } = useFinance();
  const [movement, setMovement] = useState(createEmptyMovement());
  const [editMovement, setEditMovement] = useState(createEmptyMovement());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const resetMovementForm = () => {
    setMovement(createEmptyMovement());
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingMovement(null);
    setEditMovement(createEmptyMovement());
  };

  const handleSaveMovement = (isEdit = false) => {
    const draft = isEdit ? editMovement : movement;
    if (!draft.concept || draft.amount === '' || draft.amount === null) return;

    const normalizedMovement = { ...draft, amount: Number(draft.amount) };

    if (isEdit && editingMovement) {
      dispatch({ type: 'UPDATE_MOVEMENT', payload: { ...normalizedMovement, id: editingMovement.id } });
      showAlert('Movimiento actualizado con éxito', 'success');
      closeEditDialog();
      return;
    }

    dispatch({ type: 'ADD_MOVEMENT', payload: normalizedMovement });
    resetMovementForm();
    showAlert('Movimiento registrado con éxito', 'success');
  };

  const openEditMovement = (item) => {
    setEditingMovement(item);
    setEditMovement({ ...item, amount: item.amount });
    setEditDialogOpen(true);
  };

  return (
    <Stack spacing={3}>
      <SectionHeader title="Movimientos" subtitle="Registra ingresos y gastos para actualizar el dashboard al instante." />
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Nuevo movimiento</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr 1fr 1fr 1fr' }, gap: 2 }}>
            <TextField type="date" label="Fecha" value={movement.date} InputLabelProps={{ shrink: true }} onChange={(event) => setMovement({ ...movement, date: event.target.value })} />
            <TextField label="Concepto" value={movement.concept} onChange={(event) => setMovement({ ...movement, concept: event.target.value })} />
            <FormControl><InputLabel>Categoría</InputLabel><Select label="Categoría" value={movement.category} onChange={(event) => setMovement({ ...movement, category: event.target.value })}>{categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</Select></FormControl>
            <TextField type="number" label="Monto" value={movement.amount} onChange={(event) => setMovement({ ...movement, amount: event.target.value })} />
            <FormControl><InputLabel>Tipo</InputLabel><Select label="Tipo" value={movement.type} onChange={(event) => setMovement({ ...movement, type: event.target.value })}><MenuItem value="Ingreso">Ingreso</MenuItem><MenuItem value="Gasto">Gasto</MenuItem></Select></FormControl>
          </Box>
          <TextField fullWidth multiline minRows={2} label="Notas" value={movement.notes} sx={{ mt: 2 }} onChange={(event) => setMovement({ ...movement, notes: event.target.value })} />
          <Button variant="contained" startIcon={<AddIcon />} sx={{ mt: 2 }} onClick={() => handleSaveMovement(false)}>Registrar movimiento</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Historial</Typography>
          {state.movements.length ? (
            <Stack spacing={1.5}>
              {state.movements
                .slice()
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => (
                  <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.4fr 1fr 1fr auto' }, gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Typography color="text.secondary">{item.date}</Typography>
                    <Box>
                      <Typography fontWeight={700}>{item.concept}</Typography>
                      {item.notes && <Typography variant="body2" color="text.secondary">{item.notes}</Typography>}
                    </Box>
                    <Typography>{item.category}</Typography>
                    <Typography fontWeight={700} color={item.type === 'Ingreso' ? 'success.main' : 'error.main'}>{item.type === 'Ingreso' ? '+' : '-'}{formatCurrency(item.amount)}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Editar"><IconButton onClick={() => openEditMovement(item)}><EditIcon /></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton onClick={() => {
                        dispatch({ type: 'DELETE_MOVEMENT', payload: item.id });
                        showAlert('Movimiento eliminado con éxito', 'success');
                      }}><DeleteIcon /></IconButton></Tooltip>
                    </Box>
                  </Box>
                ))}
            </Stack>
          ) : <EmptyState title="Sin movimientos" description="Agrega tu primer ingreso o gasto." />}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onClose={closeEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>Editar movimiento</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr 1fr 1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField type="date" label="Fecha" value={editMovement.date} InputLabelProps={{ shrink: true }} onChange={(event) => setEditMovement({ ...editMovement, date: event.target.value })} />
            <TextField label="Concepto" value={editMovement.concept} onChange={(event) => setEditMovement({ ...editMovement, concept: event.target.value })} />
            <FormControl><InputLabel>Categoría</InputLabel><Select label="Categoría" value={editMovement.category} onChange={(event) => setEditMovement({ ...editMovement, category: event.target.value })}>{categories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</Select></FormControl>
            <TextField type="number" label="Monto" value={editMovement.amount} onChange={(event) => setEditMovement({ ...editMovement, amount: event.target.value })} />
            <FormControl><InputLabel>Tipo</InputLabel><Select label="Tipo" value={editMovement.type} onChange={(event) => setEditMovement({ ...editMovement, type: event.target.value })}><MenuItem value="Ingreso">Ingreso</MenuItem><MenuItem value="Gasto">Gasto</MenuItem></Select></FormControl>
          </Box>
          <TextField fullWidth multiline minRows={2} label="Notas" value={editMovement.notes} sx={{ mt: 2 }} onChange={(event) => setEditMovement({ ...editMovement, notes: event.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancelar</Button>
          <Button variant="contained" onClick={() => handleSaveMovement(true)}>Guardar cambios</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={alert.open} autoHideDuration={4000} onClose={handleCloseAlert} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseAlert} severity={alert.severity} variant="filled" sx={{ width: '100%' }}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
