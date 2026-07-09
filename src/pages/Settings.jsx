import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { AddIcon, DeleteIcon, EditIcon, SaveIcon } from '../components/AppIcons.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import { goalColors, initialData } from '../data/initialData.js';
import { useFinance } from '../context/FinanceContext.jsx';
import { exportStateToJson, importStateFromJson } from '../services/storageService.js';
import { getInvestmentReturns } from '../utils/financeUtils.js';
import { formatCurrency } from '../utils/formatters.js';
import { CircularProgress } from '@mui/material';

const emptyGoal = { name: '', targetAmount: '', currentAmount: '', color: goalColors[0], status: 'activa' };
const emptyInvestment = { name: '', capital: '', annualRate: '' };
const emptyExpense = { name: '', type: 'Semanal', amount: '', dayOfMonth: '', dueDate: '', automatic: true, active: true };

export default function Settings() {
  const { state, dispatch } = useFinance();
  const [settings, setSettings] = useState(state.settings);
  const [goal, setGoal] = useState(emptyGoal);
  const [investment, setInvestment] = useState(emptyInvestment);
  const [expense, setExpense] = useState(emptyExpense);
  const [goalEditForm, setGoalEditForm] = useState(emptyGoal);
  const [investmentEditForm, setInvestmentEditForm] = useState(emptyInvestment);
  const [expenseEditForm, setExpenseEditForm] = useState(emptyExpense);
  const [isJsonProcessing, setIsJsonProcessing] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [investmentDialogOpen, setInvestmentDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const investments = getInvestmentReturns(state.investments);
  const fileInputRef = useRef(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  useEffect(() => {
    setSettings(state.settings);
  }, [state.settings]);

  const handleCloseAlert = (event, reason) => {
    if (reason === 'clickaway') return;
    setAlert((prev) => ({ ...prev, open: false }));
  };

  const saveSettings = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: normalizeNumbers(settings) });
    showAlert('Configuración guardada con éxito', 'success');
  };

  const addGoal = () => {
    if (!goal.name) return;
    dispatch({ type: 'ADD_GOAL', payload: normalizeNumbers(goal) });
    setGoal({ ...emptyGoal });
    showAlert('Meta agregada con éxito', 'success');
  };

  const addInvestment = () => {
    if (!investment.name) return;
    dispatch({ type: 'ADD_INVESTMENT', payload: normalizeNumbers(investment) });
    setInvestment({ ...emptyInvestment });
    showAlert('Inversión agregada con éxito', 'success');
  };

  const addExpense = () => {
    if (!expense.name) return;
    if (expense.type === 'Única' && !expense.dueDate) {
      showAlert('Selecciona una fecha de vencimiento para el gasto único.', 'error');
      return;
    }
    dispatch({ type: 'ADD_FIXED_EXPENSE', payload: normalizeNumbers(expense) });
    setExpense({ ...emptyExpense });
    showAlert('Gasto fijo agregado con éxito', 'success');
  };

  const openGoalEditor = (item) => {
    setEditingGoal(item);
    setGoalEditForm({ ...item });
    setGoalDialogOpen(true);
  };

  const closeGoalEditor = () => {
    setGoalDialogOpen(false);
    setEditingGoal(null);
    setGoalEditForm({ ...emptyGoal });
  };

  const saveGoal = () => {
    if (!goalEditForm.name) return;
    dispatch({ type: 'UPDATE_GOAL', payload: { ...normalizeNumbers(goalEditForm), id: editingGoal.id } });
    showAlert('Meta actualizada con éxito', 'success');
    closeGoalEditor();
  };

  const openInvestmentEditor = (item) => {
    setEditingInvestment(item);
    setInvestmentEditForm({ ...item });
    setInvestmentDialogOpen(true);
  };

  const closeInvestmentEditor = () => {
    setInvestmentDialogOpen(false);
    setEditingInvestment(null);
    setInvestmentEditForm({ ...emptyInvestment });
  };

  const saveInvestment = () => {
    if (!investmentEditForm.name) return;
    dispatch({ type: 'UPDATE_INVESTMENT', payload: { ...normalizeNumbers(investmentEditForm), id: editingInvestment.id } });
    showAlert('Inversión actualizada con éxito', 'success');
    closeInvestmentEditor();
  };

  const openExpenseEditor = (item) => {
    setEditingExpense(item);
    setExpenseEditForm({ ...item });
    setExpenseDialogOpen(true);
  };

  const closeExpenseEditor = () => {
    setExpenseDialogOpen(false);
    setEditingExpense(null);
    setExpenseEditForm({ ...emptyExpense });
  };

  const saveExpense = () => {
    if (!expenseEditForm.name) return;
    if (expenseEditForm.type === 'Única' && !expenseEditForm.dueDate) {
      showAlert('Selecciona una fecha de vencimiento para el gasto único.', 'error');
      return;
    }
    dispatch({ type: 'UPDATE_FIXED_EXPENSE', payload: { ...normalizeNumbers(expenseEditForm), id: editingExpense.id } });
    showAlert('Gasto fijo actualizado con éxito', 'success');
    closeExpenseEditor();
  };

  const handleExportData = () => {
    try {
      setIsJsonProcessing(true);
      const blob = new Blob([exportStateToJson(state)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finanzas-personales-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showAlert('Copia de seguridad exportada correctamente', 'success');
    } finally {
      setIsJsonProcessing(false);
    }
  };

  const handleImportData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsJsonProcessing(true);
      const text = await file.text();
      const importedState = importStateFromJson(text, initialData);
      dispatch({ type: 'REPLACE_STATE', payload: importedState });
      showAlert('Datos importados correctamente', 'success');
    } catch {
      showAlert('No se pudo importar el archivo. Asegúrate de subir un JSON válido.', 'error');
    } finally {
      event.target.value = '';
      setIsJsonProcessing(false);
    }
  };

  return (
    <Stack spacing={3}>
      <SectionHeader title="Configuración" subtitle="Define la estrategia que alimenta todo el dashboard." />
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
            <Typography variant="h6">Respaldo y restauración</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
              <Button variant="outlined" onClick={handleExportData} disabled={isJsonProcessing}>
                {isJsonProcessing ? <CircularProgress size={18} /> : 'Exportar JSON'}
              </Button>
              <Button variant="contained" onClick={() => fileInputRef.current?.click()} disabled={isJsonProcessing}>
                {isJsonProcessing ? 'Procesando...' : 'Importar JSON'}
              </Button>
            </Stack>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Exporta toda la información de la app para moverla a otro navegador o dispositivo.
          </Typography>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleImportData} />
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Base financiera</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            <MoneyField label="Salario semanal neto" value={settings.weeklySalary} onChange={(weeklySalary) => setSettings({ ...settings, weeklySalary })} />
            <MoneyField label="Presupuesto semanal" value={settings.weeklyBudget} onChange={(weeklyBudget) => setSettings({ ...settings, weeklyBudget })} />
            <MoneyField label="Meta de ahorro mensual" value={settings.monthlySavingsGoal} onChange={(monthlySavingsGoal) => setSettings({ ...settings, monthlySavingsGoal })} />
            <MoneyField label="Patrimonio actual" value={settings.currentNetWorth} onChange={(currentNetWorth) => setSettings({ ...settings, currentNetWorth })} />
          </Box>
          <Button startIcon={<SaveIcon />} variant="contained" sx={{ mt: 2 }} onClick={saveSettings}>Guardar configuración</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Metas</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr 1fr auto' }, gap: 2, mb: 3 }}>
            <TextField label="Nombre" value={goal.name} onChange={(event) => setGoal({ ...goal, name: event.target.value })} />
            <MoneyField label="Monto objetivo" value={goal.targetAmount} onChange={(targetAmount) => setGoal({ ...goal, targetAmount })} />
            <MoneyField label="Monto actual" value={goal.currentAmount} onChange={(currentAmount) => setGoal({ ...goal, currentAmount })} />
            <FormControl>
              <InputLabel>Color</InputLabel>
              <Select label="Color" value={goal.color} onChange={(event) => setGoal({ ...goal, color: event.target.value })}>
                {goalColors.map((color) => <MenuItem key={color} value={color}><Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: color, mr: 1 }} />{color}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Estado</InputLabel>
              <Select label="Estado" value={goal.status} onChange={(event) => setGoal({ ...goal, status: event.target.value })}>
                <MenuItem value="activa">Activa</MenuItem>
                <MenuItem value="terminada">Terminada</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" startIcon={<AddIcon />} onClick={addGoal}>Agregar</Button>
          </Box>
          <EditableList
            items={state.goals}
            fields={['name', 'targetAmount', 'currentAmount', 'status']}
            deleteType="DELETE_GOAL"
            onEdit={openGoalEditor}
            onDeleteSuccess={() => showAlert('Meta eliminada con éxito', 'success')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Inversiones</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' }, gap: 2, mb: 3 }}>
            <TextField label="Nombre" value={investment.name} onChange={(event) => setInvestment({ ...investment, name: event.target.value })} />
            <MoneyField label="Capital" value={investment.capital} onChange={(capital) => setInvestment({ ...investment, capital })} />
            <TextField type="number" label="Tasa anual %" value={investment.annualRate} onChange={(event) => setInvestment({ ...investment, annualRate: event.target.value })} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={addInvestment}>Agregar</Button>
          </Box>
          <Stack spacing={1.5}>
            {investments.map((item) => (
              <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr repeat(4, auto)' }, gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography fontWeight={700}>{item.name}</Typography>
                <Chip label={`Capital ${formatCurrency(item.capital)}`} />
                <Chip label={`Diario ${formatCurrency(item.dailyReturn)}`} color="success" />
                <Chip label={`Mensual ${formatCurrency(item.monthlyReturn)}`} color="primary" />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Editar"><IconButton onClick={() => openInvestmentEditor(item)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton onClick={() => {
                    dispatch({ type: 'DELETE_INVESTMENT', payload: item.id });
                    showAlert('Inversión eliminada con éxito', 'success');
                  }}><DeleteIcon /></IconButton></Tooltip>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Gastos fijos</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr 1fr auto auto' }, gap: 2, mb: 3, alignItems: 'center' }}>
            <TextField label="Nombre" value={expense.name} onChange={(event) => setExpense({ ...expense, name: event.target.value })} />
            <FormControl><InputLabel>Tipo</InputLabel><Select label="Tipo" value={expense.type} onChange={(event) => setExpense({ ...expense, type: event.target.value })}><MenuItem value="Semanal">Semanal</MenuItem><MenuItem value="Mensual">Mensual</MenuItem><MenuItem value="Única">Única</MenuItem></Select></FormControl>
            <MoneyField label="Monto" value={expense.amount} onChange={(amount) => setExpense({ ...expense, amount })} />
            <TextField type="number" label="Día del mes" disabled={expense.type === 'Semanal' || expense.type === 'Única'} value={expense.dayOfMonth} onChange={(event) => setExpense({ ...expense, dayOfMonth: event.target.value })} />
            <TextField type="date" label="Fecha de vencimiento" disabled={expense.type !== 'Única'} value={expense.dueDate || ''} onChange={(event) => setExpense({ ...expense, dueDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            <ToggleLabel label="Automático" checked={expense.automatic} onChange={(automatic) => setExpense({ ...expense, automatic })} />
            <ToggleLabel label="Activo" checked={expense.active} onChange={(active) => setExpense({ ...expense, active })} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={addExpense}>Agregar</Button>
          </Box>
          <Stack spacing={1.5}>
            {state.fixedExpenses.map((item) => (
              <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr repeat(6, auto)' }, gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Typography fontWeight={700}>{item.name}</Typography>
                <Chip label={item.type} />
                <Chip label={formatCurrency(item.amount)} />
                <Chip label={item.type === 'Mensual' ? `Día ${item.dayOfMonth || '-'}` : item.type === 'Única' ? `Vence ${item.dueDate || '-'}` : 'Cada semana'} color="info" />
                <Chip label={item.automatic ? 'Automático' : 'Manual'} color={item.automatic ? 'primary' : 'default'} />
                <Chip label={item.active ? 'Activo' : 'Inactivo'} color={item.active ? 'success' : 'default'} />
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Editar"><IconButton onClick={() => openExpenseEditor(item)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton onClick={() => {
                    dispatch({ type: 'DELETE_FIXED_EXPENSE', payload: item.id });
                    showAlert('Gasto fijo eliminado con éxito', 'success');
                  }}><DeleteIcon /></IconButton></Tooltip>
                </Box>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={goalDialogOpen} onClose={closeGoalEditor} maxWidth="md" fullWidth>
        <DialogTitle>Editar meta</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField label="Nombre" value={goalEditForm.name} onChange={(event) => setGoalEditForm({ ...goalEditForm, name: event.target.value })} />
            <MoneyField label="Monto objetivo" value={goalEditForm.targetAmount} onChange={(targetAmount) => setGoalEditForm({ ...goalEditForm, targetAmount })} />
            <MoneyField label="Monto actual" value={goalEditForm.currentAmount} onChange={(currentAmount) => setGoalEditForm({ ...goalEditForm, currentAmount })} />
            <FormControl><InputLabel>Color</InputLabel><Select label="Color" value={goalEditForm.color} onChange={(event) => setGoalEditForm({ ...goalEditForm, color: event.target.value })}>{goalColors.map((color) => <MenuItem key={color} value={color}><Box sx={{ width: 18, height: 18, borderRadius: '50%', bgcolor: color, mr: 1 }} />{color}</MenuItem>)}</Select></FormControl>
            <FormControl><InputLabel>Estado</InputLabel><Select label="Estado" value={goalEditForm.status} onChange={(event) => setGoalEditForm({ ...goalEditForm, status: event.target.value })}><MenuItem value="activa">Activa</MenuItem><MenuItem value="terminada">Terminada</MenuItem></Select></FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeGoalEditor}>Cancelar</Button>
          <Button variant="contained" onClick={saveGoal}>Guardar cambios</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={investmentDialogOpen} onClose={closeInvestmentEditor} maxWidth="md" fullWidth>
        <DialogTitle>Editar inversión</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mt: 1 }}>
            <TextField label="Nombre" value={investmentEditForm.name} onChange={(event) => setInvestmentEditForm({ ...investmentEditForm, name: event.target.value })} />
            <MoneyField label="Capital" value={investmentEditForm.capital} onChange={(capital) => setInvestmentEditForm({ ...investmentEditForm, capital })} />
            <TextField type="number" label="Tasa anual %" value={investmentEditForm.annualRate} onChange={(event) => setInvestmentEditForm({ ...investmentEditForm, annualRate: event.target.value })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInvestmentEditor}>Cancelar</Button>
          <Button variant="contained" onClick={saveInvestment}>Guardar cambios</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={expenseDialogOpen} onClose={closeExpenseEditor} maxWidth="md" fullWidth>
        <DialogTitle>Editar gasto fijo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr 1fr auto' }, gap: 2, mt: 1, alignItems: 'center' }}>
            <TextField label="Nombre" value={expenseEditForm.name} onChange={(event) => setExpenseEditForm({ ...expenseEditForm, name: event.target.value })} />
            <FormControl><InputLabel>Tipo</InputLabel><Select label="Tipo" value={expenseEditForm.type} onChange={(event) => setExpenseEditForm({ ...expenseEditForm, type: event.target.value })}><MenuItem value="Semanal">Semanal</MenuItem><MenuItem value="Mensual">Mensual</MenuItem><MenuItem value="Única">Única</MenuItem></Select></FormControl>
            <MoneyField label="Monto" value={expenseEditForm.amount} onChange={(amount) => setExpenseEditForm({ ...expenseEditForm, amount })} />
            <TextField type="number" label="Día del mes" disabled={expenseEditForm.type === 'Semanal' || expenseEditForm.type === 'Única'} value={expenseEditForm.dayOfMonth} onChange={(event) => setExpenseEditForm({ ...expenseEditForm, dayOfMonth: event.target.value })} />
            <TextField type="date" label="Fecha de vencimiento" disabled={expenseEditForm.type !== 'Única'} value={expenseEditForm.dueDate || ''} onChange={(event) => setExpenseEditForm({ ...expenseEditForm, dueDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            <ToggleLabel label="Automático" checked={expenseEditForm.automatic} onChange={(automatic) => setExpenseEditForm({ ...expenseEditForm, automatic })} />
            <ToggleLabel label="Activo" checked={expenseEditForm.active} onChange={(active) => setExpenseEditForm({ ...expenseEditForm, active })} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeExpenseEditor}>Cancelar</Button>
          <Button variant="contained" onClick={saveExpense}>Guardar cambios</Button>
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

function MoneyField({ label, value, onChange }) {
  return <TextField type="number" label={label} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function ToggleLabel({ label, checked, onChange }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Switch checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <Typography variant="body2">{label}</Typography>
    </Box>
  );
}

function EditableList({ items, fields, deleteType, onDeleteSuccess, onEdit }) {
  const { dispatch } = useFinance();
  return (
    <Stack spacing={1.5}>
      {items.map((item) => (
        <Box key={item.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${fields.length}, 1fr) auto` }, gap: 2, alignItems: 'center', p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          {fields.map((field) => <Typography key={field}><Typography component="span" color="text.secondary">{field}: </Typography>{String(item[field])}</Typography>)}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Editar"><IconButton onClick={() => onEdit?.(item)}><EditIcon /></IconButton></Tooltip>
            <Tooltip title="Eliminar"><IconButton onClick={() => {
              dispatch({ type: deleteType, payload: item.id });
              if (onDeleteSuccess) onDeleteSuccess();
            }}><DeleteIcon /></IconButton></Tooltip>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

function normalizeNumbers(record) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      if (['weeklySalary', 'weeklyBudget', 'monthlySavingsGoal', 'currentNetWorth', 'targetAmount', 'currentAmount', 'capital', 'annualRate', 'amount', 'dayOfMonth'].includes(key)) {
        return [key, value === '' ? '' : Number(value)];
      }
      return [key, value];
    }),
  );
}
