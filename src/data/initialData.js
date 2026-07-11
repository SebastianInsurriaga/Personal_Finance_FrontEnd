export const categories = [
  'Transporte',
  'Comida',
  'Nomina',
  'Suscripciones',
  'Entretenimiento',
  'Compras',
  'Viajes',
  'Salud',
  'Hogar',
  'Deudas',
  'Otros',
];

export const goalColors = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const initialData = {
  preferences: {
    mode: 'dark',
    palette: 'default',
  },
  settings: {
    weeklySalary: 3500,
    weeklyBudget: 1200,
    monthlySavingsGoal: 8500,
    currentNetWorth: 42000,
  },
  goals: [
    { id: crypto.randomUUID(), name: 'Camioneta', targetAmount: 260000, currentAmount: 98000, color: '#2563eb', status: 'activa' },
    { id: crypto.randomUUID(), name: 'Viaje', targetAmount: 45000, currentAmount: 28000, color: '#14b8a6', status: 'activa' },
    { id: crypto.randomUUID(), name: 'Casa', targetAmount: 600000, currentAmount: 112000, color: '#f59e0b', status: 'activa' },
  ],
  investments: [
    { id: crypto.randomUUID(), name: 'Nu', capital: 18000, annualRate: 14.75 },
    { id: crypto.randomUUID(), name: 'Mercado Pago', capital: 9500, annualRate: 10.5 },
    { id: crypto.randomUUID(), name: 'PLATA', capital: 7200, annualRate: 12 },
  ],
  fixedExpenses: [
    { id: crypto.randomUUID(), name: 'Gasolina', type: 'Semanal', amount: 400, dayOfMonth: '', automatic: true, active: true },
    { id: crypto.randomUUID(), name: 'Spotify', type: 'Mensual', amount: 129, dayOfMonth: 1, automatic: true, active: true },
    { id: crypto.randomUUID(), name: 'Coppel', type: 'Mensual', amount: 850, dayOfMonth: 15, automatic: true, active: true },
    { id: crypto.randomUUID(), name: 'Internet', type: 'Mensual', amount: 499, dayOfMonth: 10, automatic: true, active: true },
  ],
  movements: [
    { id: crypto.randomUUID(), date: new Date().toISOString().slice(0, 10), concept: 'Comida', category: 'Comida', amount: 180, type: 'Gasto', notes: 'Comida del día' },
  ],
};
