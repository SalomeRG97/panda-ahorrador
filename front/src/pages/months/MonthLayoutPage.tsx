import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ApiService } from '../../services/api.service';
import { useToast } from '../../context/ToastContext';
import { Category, BudgetExpense, ExtraExpense, Income, Week, MonthChallengeData, ChallengeDayProgress, RecurrenceFrequency, RecurrenceScope } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { PaymentMethodSelect } from '../../components/PaymentMethodSelect';
import { RecurrenceScopeModal } from '../../components/common/RecurrenceScopeModal';
import { ModalPortal } from '../../components/common/ModalPortal';

export const MonthLayoutPage: React.FC = () => {
  const { yearId, monthId } = useParams<{ yearId: string; monthId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const yId = parseInt(yearId || '0', 10);
  const mId = parseInt(monthId || '0', 10);

  const initialTab = (searchParams.get('tab') as any) || 'calendar';
  const [activeTab, setActiveTab] = useState<'calendar' | 'incomes' | 'summary' | 'challenge'>(
    ['calendar', 'incomes', 'summary', 'challenge'].includes(initialTab) ? initialTab : 'calendar'
  );

  const [monthDetails, setMonthDetails] = useState<any>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [calendarDays, setCalendarDays] = useState<{ dayNumber: number | null; dateStr: string; expenses: BudgetExpense[] }[]>([]);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<any[]>([]);
  const [challengeData, setChallengeData] = useState<MonthChallengeData | null>(null);

  const [monthSaving, setMonthSaving] = useState<number>(0);
  const [savingsWithdrawn, setSavingsWithdrawn] = useState<number>(0);
  const [totalIncomes, setTotalIncomes] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalRemaining, setTotalRemaining] = useState<number>(0);

  const [paymentMethodsOverall, setPaymentMethodsOverall] = useState<{ method: string; total: number }[]>([]);
  const [categoryPaymentBreakdown, setCategoryPaymentBreakdown] = useState<
    {
      categoryId: number;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      total: number;
      methods: { method: string; total: number }[];
      expanded?: boolean;
    }[]
  >([]);

  // Estados para desglose presupuestado (colapsable)
  const [showBudgetBreakdown, setShowBudgetBreakdown] = useState(false);
  const [budgetPaymentMethodsOverall, setBudgetPaymentMethodsOverall] = useState<{ method: string; total: number }[]>([]);
  const [budgetCategoryPaymentBreakdown, setBudgetCategoryPaymentBreakdown] = useState<
    {
      categoryId: number;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      total: number;
      methods: { method: string; total: number }[];
      expanded?: boolean;
    }[]
  >([]);

  // Modales
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<number | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<BudgetExpense | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingExpenseRecurrenceId, setEditingExpenseRecurrenceId] = useState<number | null>(null);
  const [editingRealAmount, setEditingRealAmount] = useState<number>(0);
  const [recurrenceModal, setRecurrenceModal] = useState<{
    isOpen: boolean;
    action: 'edit' | 'delete';
    expenseId?: number;
    concept?: string;
    date?: string;
  }>({
    isOpen: false,
    action: 'delete',
  });
  const [calendarView, setCalendarView] = useState<'grid' | 'list'>(
    (localStorage.getItem('budgetCalendarView') as 'grid' | 'list') || 'grid'
  );

  const changeCalendarView = (view: 'grid' | 'list') => {
    setCalendarView(view);
    localStorage.setItem('budgetCalendarView', view);
  };

  const [newExpense, setNewExpense] = useState<Partial<BudgetExpense>>({ budget_amount: 0, concept: '', payment_method: '' });
  const [newIncome, setNewIncome] = useState<Partial<Income>>({ amount: 0, concept: '' });

  const { success, error, warning, confirm } = useToast();

  const calculateTotals = (data: any) => {
    if (!data) return;
    const incTotal = (data.incomes || []).reduce((sum: number, i: Income) => sum + parseFloat(i.amount as any || 0), 0);
    const budgetSum = (data.budgetExpenses || []).reduce(
      (sum: number, e: BudgetExpense) => {
        const realAmt = parseFloat(e.real_amount as any);
        return sum + (!isNaN(realAmt) ? realAmt : 0);
      },
      0
    );
    const extraSum = (data.extraExpenses || []).reduce((sum: number, e: ExtraExpense) => sum + parseFloat(e.amount as any || 0), 0);

    const expTotal = budgetSum + extraSum;
    const saving = data.saving || 0;

    // Gastos pagados con ahorros: no descuentan del dinero libre del mes
    const isFromSavings = (pm?: string) => (pm || '').trim().toLowerCase() === 'retiro de ahorros';
    const withdrawn =
      (data.budgetExpenses || []).reduce(
        (sum: number, e: BudgetExpense) =>
          sum + (isFromSavings(e.payment_method) ? parseFloat(e.real_amount as any) || 0 : 0),
        0
      ) +
      (data.extraExpenses || []).reduce(
        (sum: number, e: ExtraExpense) =>
          sum + (isFromSavings(e.payment_method) ? parseFloat(e.amount as any) || 0 : 0),
        0
      );

    setTotalIncomes(incTotal);
    setTotalExpenses(expTotal);
    setSavingsWithdrawn(withdrawn);
    setTotalRemaining(incTotal - (expTotal - withdrawn) - saving);

    // Payment methods breakdown (Real / Gastado)
    const budgetExpenses: BudgetExpense[] = data.budgetExpenses || [];
    const extraExpenses: ExtraExpense[] = data.extraExpenses || [];

    type CatAccum = {
      categoryId: number;
      categoryName: string;
      categoryIcon: string;
      categoryColor: string;
      total: number;
      methodsMap: Map<string, number>;
    };

    const buildBreakdown = (getAmount: (exp: any, isExtra: boolean) => number) => {
      const categoryMap = new Map<number, CatAccum>();
      const overallMethodsMap = new Map<string, number>();

      const processExpense = (exp: any, isExtra = false) => {
        const catId = exp.category_id;
        const catName = exp.category_name || 'Sin Categoría';
        const catIcon = exp.category_icon || '🏷️';
        const catColor = exp.category_color || '#E8A0BF';
        const rawMethod = exp.payment_method ? exp.payment_method.trim() : '';
        const method = rawMethod ? rawMethod : 'Sin especificar';
        const amount = getAmount(exp, isExtra);

        if (!amount || isNaN(amount)) return;

        overallMethodsMap.set(method, (overallMethodsMap.get(method) || 0) + amount);

        if (!categoryMap.has(catId)) {
          categoryMap.set(catId, {
            categoryId: catId,
            categoryName: catName,
            categoryIcon: catIcon,
            categoryColor: catColor,
            total: 0,
            methodsMap: new Map<string, number>(),
          });
        }

        const catData = categoryMap.get(catId)!;
        catData.total += amount;
        catData.methodsMap.set(method, (catData.methodsMap.get(method) || 0) + amount);
      };

      budgetExpenses.forEach((e) => processExpense(e, false));
      extraExpenses.forEach((e) => processExpense(e, true));

      const methods = Array.from(overallMethodsMap.entries()).map(([method, total]) => ({ method, total }));
      const categories = Array.from(categoryMap.values()).map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        categoryIcon: cat.categoryIcon,
        categoryColor: cat.categoryColor,
        total: cat.total,
        methods: Array.from(cat.methodsMap.entries()).map(([method, total]) => ({ method, total })),
        expanded: false,
      }));

      return { methods, categories };
    };

    // Desglose REAL (gastos reales / lo que se gastó)
    const realBreakdown = buildBreakdown((exp, isExtra) => {
      if (isExtra) return parseFloat(exp.amount || 0);
      const realAmt = parseFloat(exp.real_amount);
      return !isNaN(realAmt) ? realAmt : 0;
    });

    setPaymentMethodsOverall(realBreakdown.methods);
    setCategoryPaymentBreakdown(realBreakdown.categories);

    // Desglose PRESUPUESTADO (solo budget_amount, sin usar real_amount)
    const budgetBreakdown = buildBreakdown((exp, isExtra) => {
      if (isExtra) return parseFloat(exp.amount || 0);
      return parseFloat(exp.budget_amount || 0);
    });

    setBudgetPaymentMethodsOverall(budgetBreakdown.methods);
    setBudgetCategoryPaymentBreakdown(budgetBreakdown.categories);
  };

  const generateCalendarGrid = (data: any) => {
    if (!data) return;
    const year = data.month.year;
    const monthNum = data.month.month_number;

    const firstDay = new Date(year, monthNum - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNum, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push({ dayNumber: null, dateStr: '', expenses: [] });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayExpenses = (data.budgetExpenses || []).filter((e: BudgetExpense) => e.date === dateStr);
      days.push({ dayNumber: d, dateStr, expenses: dayExpenses });
    }

    setCalendarDays(days);
  };

  const loadMonthData = () => {
    ApiService.getMonthDetails(mId)
      .then((data) => {
        setMonthDetails(data);
        setMonthSaving(data.saving || 0);
        calculateTotals(data);
        generateCalendarGrid(data);

        // Refrescar weeklyBreakdown si estamos en la pestaña de resumen
        if (activeTab === 'summary') {
          ApiService.getMonthWeeklyCategoryBreakdown(mId).then(setWeeklyBreakdown).catch(console.error);
        }
      })
      .catch((err) => error(err.response?.data?.message || 'Error al cargar detalles del mes'));
  };

  useEffect(() => {
    if (mId) {
      loadMonthData();
      ApiService.getCategories().then(setCategories).catch(console.error);
      ApiService.getPaymentMethods().then((pms) => setPaymentMethods(pms.map((p) => p.name))).catch(console.error);
    }
  }, [mId]);

  useEffect(() => {
    if (activeTab === 'summary' && mId) {
      ApiService.getMonthWeeklyCategoryBreakdown(mId).then(setWeeklyBreakdown).catch(console.error);
    }
    if (activeTab === 'challenge' && mId) {
      ApiService.getMonthChallenge(mId).then(setChallengeData).catch(console.error);
    }
  }, [activeTab, mId]);

  const handleTabChange = (tab: 'calendar' | 'incomes' | 'summary' | 'challenge') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const toggleCategoryBreakdown = (categoryId: number) => {
    setCategoryPaymentBreakdown((prev) =>
      prev.map((c) => (c.categoryId === categoryId ? { ...c, expanded: !c.expanded } : c))
    );
  };

  const toggleBudgetCategoryBreakdown = (categoryId: number) => {
    setBudgetCategoryPaymentBreakdown((prev) =>
      prev.map((c) => (c.categoryId === categoryId ? { ...c, expanded: !c.expanded } : c))
    );
  };

  const toggleChallengeDay = async (day: ChallengeDayProgress) => {
    if (!challengeData) return;
    const newCompleted = !day.completed;
    try {
      await ApiService.updateChallengeProgress(challengeData.challenge.month_challenge_id!, day.day, newCompleted);
      setChallengeData((prev) => {
        if (!prev) return null;
        const updatedProgress = prev.progress.map((d) => (d.day === day.day ? { ...d, completed: newCompleted } : d));
        const completedDays = updatedProgress.filter((d) => d.completed).length;
        const percentage = Math.round((completedDays / prev.stats.totalDays) * 100);
        return {
          ...prev,
          progress: updatedProgress,
          stats: { ...prev.stats, completedDays, percentage },
        };
      });
    } catch (err: any) {
      error('Error al actualizar reto');
    }
  };

  const openExpenseModal = (dateStr: string) => {
    setSelectedExpense(null);
    setEditingExpenseId(null);
    setEditingExpenseRecurrenceId(null);
    setEditingRealAmount(0);
    setNewExpense({
      month_id: mId,
      date: dateStr,
      category_id: categories[0]?.id || 1,
      concept: '',
      budget_amount: 0,
      payment_method: '',
    });
    setShowExpenseModal(true);
  };

  const openEditExpenseModal = (exp: BudgetExpense) => {
    setSelectedExpense(null);
    setEditingExpenseId(exp.id || null);
    setEditingExpenseRecurrenceId(exp.recurrence_id || null);
    setEditingRealAmount(parseFloat(exp.real_amount as any) || 0);
    setNewExpense({
      month_id: mId,
      date: (exp.date || '').slice(0, 10),
      category_id: exp.category_id || categories[0]?.id || 1,
      concept: exp.concept,
      budget_amount: parseFloat(exp.budget_amount as any) || 0,
      payment_method: exp.payment_method || '',
    });
    setShowExpenseModal(true);
  };

  // Fecha por defecto al agregar desde la vista lista: hoy si está dentro del mes, si no el día 1
  const defaultDateForMonth = () => {
    const y = monthDetails.month.year;
    const m = String(monthDetails.month.month_number).padStart(2, '0');
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return todayStr.startsWith(`${y}-${m}`) ? todayStr : `${y}-${m}-01`;
  };

  const saveBudgetExpense = async () => {
    if (!newExpense.concept || !newExpense.budget_amount) {
      warning('Por favor ingresa concepto y monto');
      return;
    }
    // Si estamos editando un gasto que forma parte de una serie recurrente
    if (editingExpenseId && editingExpenseRecurrenceId) {
      setRecurrenceModal({
        isOpen: true,
        action: 'edit',
        expenseId: editingExpenseId,
        concept: newExpense.concept,
        date: newExpense.date,
      });
      return;
    }
    await executeSaveBudgetExpense('single');
  };

  const executeSaveBudgetExpense = async (scope: RecurrenceScope = 'single') => {
    try {
      if (editingExpenseId) {
        await ApiService.updateBudgetExpense(
          editingExpenseId,
          {
            ...newExpense,
            real_amount: editingRealAmount,
          } as BudgetExpense,
          scope
        );
        if (scope === 'all') {
          success('Todas las repeticiones fueron actualizadas 🌸');
        } else if (scope === 'future') {
          success('Repeticiones futuras actualizadas 🌸');
        } else {
          success('Gasto presupuestado actualizado 🌸');
        }
      } else {
        await ApiService.createBudgetExpense(newExpense as BudgetExpense);
        success('Gasto presupuestado agregado 🌸');
      }
      setShowExpenseModal(false);
      setEditingExpenseId(null);
      setEditingExpenseRecurrenceId(null);
      setRecurrenceModal((prev) => ({ ...prev, isOpen: false }));
      loadMonthData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar gasto');
    }
  };

  const deleteBudgetExpense = async (exp: { id?: number; recurrence_id?: number | null; concept?: string; date?: string }) => {
    if (!exp.id) return;
    if (exp.recurrence_id) {
      setRecurrenceModal({
        isOpen: true,
        action: 'delete',
        expenseId: exp.id,
        concept: exp.concept,
        date: exp.date,
      });
    } else {
      const confirmed = await confirm('¿Deseas eliminar este gasto presupuestado?');
      if (!confirmed) return;
      await executeDeleteBudgetExpense(exp.id, 'single');
    }
  };

  const executeDeleteBudgetExpense = async (id: number, scope: RecurrenceScope) => {
    try {
      await ApiService.deleteBudgetExpense(id, scope);
      if (scope === 'all') {
        success('Toda la serie recurrente ha sido eliminada 🌸');
      } else if (scope === 'future') {
        success('Gasto y repeticiones futuras eliminadas');
      } else {
        success('Gasto eliminado');
      }
      setSelectedExpense(null);
      setRecurrenceModal((prev) => ({ ...prev, isOpen: false }));
      loadMonthData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al eliminar gasto');
    }
  };

  const handleRecurrenceScopeSelect = (scope: RecurrenceScope) => {
    if (recurrenceModal.action === 'edit') {
      executeSaveBudgetExpense(scope);
    } else if (recurrenceModal.action === 'delete' && recurrenceModal.expenseId) {
      executeDeleteBudgetExpense(recurrenceModal.expenseId, scope);
    }
  };

  const openIncomeModal = (inc?: Income) => {
    const today = new Date().toISOString().split('T')[0];
    if (inc && inc.id) {
      setEditingIncomeId(inc.id);
      const formattedDate = inc.date ? inc.date.split('T')[0] : today;
      setNewIncome({ month_id: mId, date: formattedDate, concept: inc.concept, amount: inc.amount });
    } else {
      setEditingIncomeId(null);
      setNewIncome({ month_id: mId, date: today, concept: '', amount: 0 });
    }
    setShowIncomeModal(true);
  };

  const saveIncome = async () => {
    if (!newIncome.concept || !newIncome.amount) {
      warning('Por favor ingresa concepto y valor del ingreso');
      return;
    }
    try {
      if (editingIncomeId) {
        await ApiService.updateIncome(editingIncomeId, newIncome as Income);
        success('Ingreso actualizado 💰');
      } else {
        await ApiService.createIncome(newIncome as Income);
        success('Ingreso registrado 💰');
      }
      setShowIncomeModal(false);
      setEditingIncomeId(null);
      loadMonthData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar ingreso');
    }
  };

  const deleteIncome = async (id?: number) => {
    if (!id) {
      error('ID de ingreso no válido');
      return;
    }
    const confirmed = await confirm('¿Deseas eliminar este ingreso?');
    if (!confirmed) return;

    try {
      await ApiService.deleteIncome(id);
      success('Ingreso eliminado');
      loadMonthData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al eliminar ingreso');
    }
  };

  const saveMonthSaving = async () => {
    try {
      await ApiService.setMonthSaving(mId, monthSaving);
      success('Meta de ahorro guardada 🪙');
      loadMonthData();
    } catch (err: any) {
      error(err.response?.data?.message || 'Error al guardar ahorro');
    }
  };

  if (!monthDetails) {
    return (
      <div className="month-container animate-fade-in-up" style={{ textAlign: 'center', paddingTop: '50px' }}>
        <p><i className="fa-solid fa-spinner fa-spin"></i> Cargando agenda del mes...</p>
      </div>
    );
  }

  return (
    <div className="month-container animate-fade-in-up">
      {/* HEADER DEL MES */}
      <div className="month-header card-pastel">
        <div className="header-left">
          <span className="chinese-title">月度议程 — Agenda del Mes</span>
          <h1>{monthDetails.month.month_name} {monthDetails.month.year}</h1>
        </div>
        <div className="header-actions">
          <Link to={`/years/${yId}`} className="btn-pastel btn-secondary-pastel">
            <i className="fa-solid fa-chart-line"></i> Dashboard Anual
          </Link>
        </div>
      </div>

      {/* PESTAÑAS TIPO AGENDA */}
      <div className="agenda-tabs">
        <button
          className={`agenda-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => handleTabChange('calendar')}
        >
          <i className="fa-solid fa-calendar-days"></i> Calendario
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'incomes' ? 'active' : ''}`}
          onClick={() => handleTabChange('incomes')}
        >
          <i className="fa-solid fa-wallet"></i> Ingresos & Ahorro
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => handleTabChange('summary')}
        >
          <i className="fa-solid fa-table-list"></i> Resumen del Mes
        </button>
        <button
          className={`agenda-tab-btn ${activeTab === 'challenge' ? 'active' : ''}`}
          onClick={() => handleTabChange('challenge')}
        >
          <i className="fa-solid fa-bullseye"></i> Reto Interactivo
        </button>
      </div>

      {/* PESTAÑA 1: CALENDARIO INTERACTIVO */}
      {activeTab === 'calendar' && (
        <div className="tab-content card-pastel">
          <div className="calendar-header-actions">
            <h3>Calendario de Gastos Presupuestados</h3>
            <p className="subtitle">
              {calendarView === 'grid'
                ? 'Haz clic en cualquier día para programar un gasto o en un gasto para ver/editar sus detalles.'
                : 'Lista de gastos presupuestados del mes. Usa el lápiz para editar.'}
            </p>
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${calendarView === 'grid' ? 'active' : ''}`}
                onClick={() => changeCalendarView('grid')}
              >
                <i className="fa-solid fa-calendar-days"></i> Calendario
              </button>
              <button
                className={`view-toggle-btn ${calendarView === 'list' ? 'active' : ''}`}
                onClick={() => changeCalendarView('list')}
              >
                <i className="fa-solid fa-list"></i> Lista
              </button>
            </div>
            <div className="weeks-shortcut">
              <span>Acceso a Semanas:</span>
              {monthDetails.weeks?.map((w: Week) => (
                <Link key={w.id} to={`/years/${yId}/months/${mId}/weeks/${w.id}`} className="week-pill">
                  Semana {w.week_number}
                </Link>
              ))}
            </div>
          </div>

          {/* VISTA LISTA */}
          {calendarView === 'list' && (
            <div>
              <div className="section-title-row" style={{ marginBottom: '12px' }}>
                <strong>
                  {(monthDetails.budgetExpenses || []).length} gastos · Presupuestado:{' '}
                  {formatCurrency(
                    (monthDetails.budgetExpenses || []).reduce(
                      (s: number, e: BudgetExpense) => s + (parseFloat(e.budget_amount as any) || 0),
                      0
                    )
                  )}
                </strong>
                <button onClick={() => openExpenseModal(defaultDateForMonth())} className="btn-pastel btn-primary-pastel">
                  <i className="fa-solid fa-plus"></i> Agregar Gasto
                </button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Categoría</th>
                      <th>Concepto</th>
                      <th>Medio de Pago</th>
                      <th>Presupuestado</th>
                      <th>Real</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...(monthDetails.budgetExpenses || [])]
                      .sort((a: BudgetExpense, b: BudgetExpense) => (a.date || '').localeCompare(b.date || ''))
                      .map((exp: BudgetExpense) => (
                        <tr key={exp.id}>
                          <td>{(exp.date || '').slice(0, 10)}</td>
                          <td>
                            <span className="badge-category" style={{ backgroundColor: exp.category_color }}>
                              {exp.category_icon} {exp.category_name}
                            </span>
                          </td>
                          <td>{exp.recurrence_id ? '🔁 ' : ''}{exp.concept}</td>
                          <td>{exp.payment_method || '—'}</td>
                          <td className="font-bold">{formatCurrency(exp.budget_amount)}</td>
                          <td>{formatCurrency(exp.real_amount || 0)}</td>
                          <td>
                            <button
                              onClick={() => openEditExpenseModal(exp)}
                              className="btn-pastel btn-secondary-pastel"
                              title="Editar"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>{' '}
                            <button
                              onClick={() => deleteBudgetExpense(exp)}
                              className="btn-pastel btn-delete-sm"
                              title="Eliminar"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    {(monthDetails.budgetExpenses || []).length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', opacity: 0.7 }}>
                          Aún no hay gastos presupuestados este mes
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* GRID DEL CALENDARIO */}
          {calendarView === 'grid' && (
          <div className="calendar-grid-wrapper">
            <div className="calendar-grid">
              <div className="day-name">Dom</div>
              <div className="day-name">Lun</div>
              <div className="day-name">Mar</div>
              <div className="day-name">Mié</div>
              <div className="day-name">Jue</div>
              <div className="day-name">Vie</div>
              <div className="day-name">Sáb</div>

              {calendarDays.map((dayCell, index) => (
                <div
                  key={`${dayCell.dateStr}_${index}`}
                  className={`calendar-day-cell ${!dayCell.dateStr ? 'empty-day' : ''}`}
                  onClick={() => dayCell.dateStr && openExpenseModal(dayCell.dateStr)}
                >
                  {dayCell.dayNumber && <div className="day-number">{dayCell.dayNumber}</div>}
                  <div className="day-expenses">
                    {dayCell.expenses.map((exp) => (
                      <div
                        key={exp.id}
                        className="expense-tag"
                        style={{ backgroundColor: exp.category_color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExpense(exp);
                        }}
                      >
                        <span className="exp-icon">{exp.category_icon}</span>
                        <span className="exp-concept">{exp.recurrence_id ? '🔁 ' : ''}{exp.concept}</span>
                        <span className="exp-amount">{formatCurrency(exp.budget_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: INGRESOS & AHORRO */}
      {activeTab === 'incomes' && (
        <div className="tab-content card-pastel">
          <div className="incomes-layout">
            <div className="incomes-main">
              <div className="section-title-row">
                <h3>Ingresos del Mes</h3>
                <button onClick={() => openIncomeModal()} className="btn-pastel btn-primary-pastel">
                  <i className="fa-solid fa-plus"></i> Agregar Ingreso
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Valor</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthDetails.incomes?.map((inc: Income) => (
                      <tr key={inc.id}>
                        <td>{inc.date ? inc.date.split('T')[0] : ''}</td>
                        <td><strong>{inc.concept}</strong></td>
                        <td className="text-green">{formatCurrency(inc.amount)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => openIncomeModal(inc)}
                              className="btn-pastel btn-secondary-pastel"
                              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                              title="Editar Ingreso"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              onClick={() => deleteIncome(inc.id)}
                              className="btn-icon-danger"
                              title="Eliminar Ingreso"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!monthDetails.incomes || monthDetails.incomes.length === 0) && (
                      <tr>
                        <td colSpan={4} className="text-center">No has registrado ingresos aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECCIÓN AHORRO DEL MES */}
            <div className="savings-card card-pastel">
              <div className="savings-icon">🪙</div>
              <h3>Ahorro del Mes</h3>
              <p>Define la cantidad que deseas destinar al ahorro este mes:</p>
              <div className="saving-input-group">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  value={monthSaving}
                  onChange={(e) => setMonthSaving(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
                <button onClick={saveMonthSaving} className="btn-pastel btn-primary-pastel">Guardar</button>
              </div>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Retirado de ahorros este mes: <strong>{formatCurrency(savingsWithdrawn)}</strong>
                {' · '}Ahorro neto: <strong>{formatCurrency(monthSaving - savingsWithdrawn)}</strong>
              </p>
              <p style={{ fontSize: '0.75rem', margin: 0, opacity: 0.7 }}>
                Para retirar, registra un gasto con medio de pago «Retiro de Ahorros».
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: RESUMEN MENSUAL */}
      {activeTab === 'summary' && (
        <div className="tab-content card-pastel">
          <h3>Resumen Semanal por Categoría</h3>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  {monthDetails.weeks?.map((w: Week) => (
                    <th key={w.id}>Semana {w.week_number}</th>
                  ))}
                  <th>TOTAL MENSUAL</th>
                </tr>
              </thead>
              <tbody>
                {weeklyBreakdown.map((catRow) => (
                  <tr key={catRow.categoryId}>
                    <td className="category-title-cell">
                      <span className="badge-category" style={{ backgroundColor: catRow.categoryColor }}>
                        {catRow.categoryIcon} {catRow.categoryName}
                      </span>
                    </td>
                    {catRow.weeks?.map((w: any, idx: number) => (
                      <td key={idx}>{formatCurrency(w.total)}</td>
                    ))}
                    <td className="total-col">{formatCurrency(catRow.monthTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TOTALES FINALES */}
          <div className="totals-summary-grid">
            <div className="total-box bg-ingresos">
              <span>Total Ingresos</span>
              <strong>{formatCurrency(totalIncomes)}</strong>
            </div>
            <div className="total-box bg-gastos">
              <span>Total Gastos</span>
              <strong>{formatCurrency(totalExpenses)}</strong>
            </div>
            <div className="total-box bg-ahorros">
              <span>Total Ahorro (neto)</span>
              <strong>{formatCurrency(monthSaving - savingsWithdrawn)}</strong>
            </div>
            <div className="total-box" style={{ background: '#A8D8EA', color: '#1E4B5E' }}>
              <span>Restante Libre</span>
              <strong>{formatCurrency(totalRemaining)}</strong>
            </div>
          </div>

          {/* SECCIÓN DESGLOSE POR MEDIO DE PAGO */}
          <div className="payment-methods-section" style={{ marginTop: '32px' }}>
            <h3 style={{ marginBottom: '16px', color: '#D4566A' }}>💳 Totalización de Gastos por Medio de Pago</h3>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1.05rem', color: '#4A3F55', marginBottom: '12px' }}>Totales Generales por Tipo de Pago</h4>
              {paymentMethodsOverall.length > 0 ? (
                <div className="totals-summary-grid">
                  {paymentMethodsOverall.map((pm, idx) => (
                    <div key={idx} className="total-box" style={{ background: '#FFF0F4', border: '1.5px solid #F4A6C1', color: '#4A3F55' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>💳 {pm.method}</span>
                      <strong style={{ color: '#D4566A', fontSize: '1.15rem' }}>{formatCurrency(pm.total)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#8C7B99', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay registrados medios de pago para este mes aún.</p>
              )}
            </div>

            {/* DETALLE DESPLEGABLE POR CATEGORÍA */}
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '1.05rem', color: '#4A3F55', marginBottom: '12px' }}>Desglose por Categoría (Clic para desplegar)</h4>
              <div className="category-payment-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categoryPaymentBreakdown.map((catRow) => (
                  <div key={catRow.categoryId} className="card-pastel" style={{ padding: '14px 18px', margin: 0, background: '#FFF9FA' }}>
                    <div
                      onClick={() => toggleCategoryBreakdown(catRow.categoryId)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="badge-category" style={{ backgroundColor: catRow.categoryColor }}>
                          {catRow.categoryIcon} {catRow.categoryName}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#8C7B99', fontWeight: 600 }}>({catRow.methods.length} medios de pago)</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <strong style={{ color: '#D4566A', fontSize: '1rem' }}>{formatCurrency(catRow.total)}</strong>
                        <span style={{ fontSize: '0.9rem', color: '#D4566A', fontWeight: 'bold' }}>{catRow.expanded ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {catRow.expanded && (
                      <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #F4A6C1' }}>
                        <table className="data-table" style={{ fontSize: '0.85rem' }}>
                          <thead>
                            <tr>
                              <th>Medio de Pago Usado</th>
                              <th>Total Gastado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catRow.methods.map((m, idx) => (
                              <tr key={idx}>
                                <td>💳 <strong>{m.method}</strong></td>
                                <td style={{ color: '#D4566A', fontWeight: 700 }}>{formatCurrency(m.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN COLAPSABLE: DESGLOSE PRESUPUESTADO */}
          <div style={{ marginTop: '40px', borderTop: '2px solid #F4A6C1', paddingTop: '20px' }}>
            <button
              onClick={() => setShowBudgetBreakdown(!showBudgetBreakdown)}
              className="btn-pastel btn-secondary-pastel"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto 20px', fontSize: '1rem', padding: '10px 24px' }}
            >
              <i className={`fa-solid fa-chevron-${showBudgetBreakdown ? 'up' : 'down'}`}></i>
              📊 {showBudgetBreakdown ? 'Ocultar' : 'Ver'} Desglose Presupuestado
            </button>

            {showBudgetBreakdown && (
              <div className="animate-fade-in-up">
                <h3 style={{ marginBottom: '16px', color: '#5A82E6' }}>📋 Totalización de Montos Presupuestados por Medio de Pago</h3>

                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '1.05rem', color: '#4A3F55', marginBottom: '12px' }}>Totales Generales por Tipo de Pago (Presupuestado)</h4>
                  {budgetPaymentMethodsOverall.length > 0 ? (
                    <div className="totals-summary-grid">
                      <div className="total-box" style={{ background: '#5A82E6', color: '#FFFFFF' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>🧾 Total General Presupuestado</span>
                        <strong style={{ fontSize: '1.25rem' }}>
                          {formatCurrency(budgetPaymentMethodsOverall.reduce((sum, pm) => sum + pm.total, 0))}
                        </strong>
                      </div>
                      {budgetPaymentMethodsOverall.map((pm, idx) => (
                        <div key={idx} className="total-box" style={{ background: '#F0F4FF', border: '1.5px solid #5A82E6', color: '#4A3F55' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>💳 {pm.method}</span>
                          <strong style={{ color: '#5A82E6', fontSize: '1.15rem' }}>{formatCurrency(pm.total)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#8C7B99', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay montos presupuestados con medio de pago para este mes.</p>
                  )}
                </div>

                {/* DETALLE DESPLEGABLE POR CATEGORÍA (PRESUPUESTADO) */}
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '1.05rem', color: '#4A3F55', marginBottom: '12px' }}>Desglose por Categoría — Presupuestado (Clic para desplegar)</h4>
                  <div className="category-payment-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {budgetCategoryPaymentBreakdown.map((catRow) => (
                      <div key={catRow.categoryId} className="card-pastel" style={{ padding: '14px 18px', margin: 0, background: '#F8F9FF' }}>
                        <div
                          onClick={() => toggleBudgetCategoryBreakdown(catRow.categoryId)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span className="badge-category" style={{ backgroundColor: catRow.categoryColor }}>
                              {catRow.categoryIcon} {catRow.categoryName}
                            </span>
                            <span style={{ fontSize: '0.85rem', color: '#8C7B99', fontWeight: 600 }}>({catRow.methods.length} medios de pago)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <strong style={{ color: '#5A82E6', fontSize: '1rem' }}>{formatCurrency(catRow.total)}</strong>
                            <span style={{ fontSize: '0.9rem', color: '#5A82E6', fontWeight: 'bold' }}>{catRow.expanded ? '▲' : '▼'}</span>
                          </div>
                        </div>

                        {catRow.expanded && (
                          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px dashed #5A82E6' }}>
                            <table className="data-table" style={{ fontSize: '0.85rem' }}>
                              <thead>
                                <tr>
                                  <th>Medio de Pago</th>
                                  <th>Total Presupuestado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {catRow.methods.map((m, idx) => (
                                  <tr key={idx}>
                                    <td>💳 <strong>{m.method}</strong></td>
                                    <td style={{ color: '#5A82E6', fontWeight: 700 }}>{formatCurrency(m.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 4: RETO INTERACTIVO */}
      {activeTab === 'challenge' && challengeData && (
        <div className="tab-content card-pastel">
          <div className="challenge-header">
            <span className="challenge-icon-big">{challengeData.challenge.icon}</span>
            <div>
              <h2 className="chinese-title">{challengeData.challenge.title}</h2>
              <p className="challenge-desc">{challengeData.challenge.description}</p>
            </div>
          </div>

          <div className="progress-bar-wrapper">
            <div className="progress-text">
              <span>Progreso: {challengeData.stats.completedDays} de {challengeData.stats.totalDays} días</span>
              <strong>{challengeData.stats.percentage}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${challengeData.stats.percentage}%` }}></div>
            </div>
          </div>

          <div className="challenge-days-grid">
            {challengeData.progress.map((day) => (
              <div
                key={day.day}
                className={`challenge-day-card ${day.completed ? 'completed' : ''}`}
                onClick={() => toggleChallengeDay(day)}
              >
                <span className="day-num">Día {day.day}</span>
                <span className="check-icon">{day.completed ? '🌸 Listo' : '⚪'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL CREAR GASTO EN CALENDARIO */}
      {showExpenseModal && (
        <ModalPortal isOpen={showExpenseModal}>
          <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
            <div className="modal-card card-pastel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingExpenseId ? '✏️ Editar Gasto Presupuestado' : '🌸 Agregar Gasto Presupuestado'}</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Fecha:</label>
                  <input
                    type="date"
                    value={newExpense.date || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Categoría:</label>
                  <select
                    value={newExpense.category_id || categories[0]?.id}
                    onChange={(e) => setNewExpense({ ...newExpense, category_id: parseInt(e.target.value) })}
                    className="form-input"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Concepto / Detalle:</label>
                  <input
                    type="text"
                    value={newExpense.concept || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, concept: e.target.value })}
                    placeholder="Ej: Servicio de luz"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Medio de Pago:</label>
                  <PaymentMethodSelect
                    value={newExpense.payment_method || ''}
                    methods={paymentMethods}
                    onChange={(pm) => setNewExpense({ ...newExpense, payment_method: pm })}
                    className="form-input"
                  />
                </div>
                {!editingExpenseId && (
                  <>
                    <div className="form-group">
                      <label>Repetir:</label>
                      <select
                        value={newExpense.recurrence?.frequency || ''}
                        onChange={(e) =>
                          setNewExpense({
                            ...newExpense,
                            recurrence: e.target.value
                              ? { frequency: e.target.value as RecurrenceFrequency, end_date: newExpense.recurrence?.end_date || null }
                              : undefined,
                          })
                        }
                        className="form-input"
                      >
                        <option value="">No se repite</option>
                        <option value="daily">Diariamente</option>
                        <option value="weekly">Semanalmente</option>
                        <option value="biweekly">Cada 2 semanas</option>
                        <option value="monthly">Mensualmente</option>
                        <option value="yearly">Anualmente</option>
                      </select>
                    </div>
                    {newExpense.recurrence && (
                      <div className="form-group">
                        <label>Repetir hasta (opcional):</label>
                        <input
                          type="date"
                          value={newExpense.recurrence.end_date || ''}
                          min={newExpense.date || undefined}
                          onChange={(e) =>
                            setNewExpense({
                              ...newExpense,
                              recurrence: { ...newExpense.recurrence!, end_date: e.target.value || null },
                            })
                          }
                          className="form-input"
                        />
                        <small style={{ opacity: 0.7 }}>
                          Sin fecha final: se agrega en todos los meses creados y en los años que crees después. El valor real de cada ocurrencia es independiente.
                        </small>
                      </div>
                    )}
                  </>
                )}
                <div className="form-group">
                  <label>Monto Presupuestado ($):</label>
                  <input
                    type="number"
                    value={newExpense.budget_amount || ''}
                    onChange={(e) => setNewExpense({ ...newExpense, budget_amount: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowExpenseModal(false)} className="btn-pastel btn-secondary-pastel">
                  Cancelar
                </button>
                <button onClick={saveBudgetExpense} className="btn-pastel btn-primary-pastel">
                  {editingExpenseId ? 'Guardar Cambios' : 'Guardar Gasto'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* POPUP DETALLE DE GASTO */}
      {selectedExpense && (
        <ModalPortal isOpen={!!selectedExpense}>
          <div className="modal-overlay" onClick={() => setSelectedExpense(null)}>
            <div className="modal-card card-pastel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Detalle del Gasto</h3>
              </div>
              <div className="modal-body">
                <div className="badge-category" style={{ backgroundColor: selectedExpense.category_color }}>
                  {selectedExpense.category_icon} {selectedExpense.category_name}
                </div>
                <h2 style={{ marginTop: '12px' }}>{selectedExpense.concept}</h2>
                <p>Fecha: <strong>{selectedExpense.date}</strong></p>
                {selectedExpense.recurrence_id && (
                  <p>Repetición: <strong>🔁 Recurrente</strong></p>
                )}
                {selectedExpense.payment_method && (
                  <p>Medio de Pago: <strong>{selectedExpense.payment_method}</strong></p>
                )}
                <p>Monto Presupuestado: <strong>{formatCurrency(selectedExpense.budget_amount)}</strong></p>
                {selectedExpense.real_amount !== undefined && (
                  <p>Monto Real: <strong>{formatCurrency(selectedExpense.real_amount)}</strong></p>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => deleteBudgetExpense(selectedExpense)} className="btn-pastel btn-delete-sm">
                  Eliminar
                </button>
                <button onClick={() => openEditExpenseModal(selectedExpense)} className="btn-pastel btn-secondary-pastel">
                  <i className="fa-solid fa-pen"></i> Editar
                </button>
                <button onClick={() => setSelectedExpense(null)} className="btn-pastel btn-primary-pastel">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL CREAR / EDITAR INGRESO */}
      {showIncomeModal && (
        <ModalPortal isOpen={showIncomeModal}>
          <div className="modal-overlay" onClick={() => setShowIncomeModal(false)}>
            <div className="modal-card card-pastel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>💰 {editingIncomeId ? 'Editar Ingreso' : 'Agregar Nuevo Ingreso'}</h3>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Fecha:</label>
                  <input
                    type="date"
                    value={newIncome.date || ''}
                    onChange={(e) => setNewIncome({ ...newIncome, date: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Concepto:</label>
                  <input
                    type="text"
                    value={newIncome.concept || ''}
                    onChange={(e) => setNewIncome({ ...newIncome, concept: e.target.value })}
                    placeholder="Ej: Salario quincenal"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Valor ($):</label>
                  <input
                    type="number"
                    value={newIncome.amount || ''}
                    onChange={(e) => setNewIncome({ ...newIncome, amount: parseFloat(e.target.value) || 0 })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowIncomeModal(false)} className="btn-pastel btn-secondary-pastel">
                  Cancelar
                </button>
                <button onClick={saveIncome} className="btn-pastel btn-primary-pastel">
                  {editingIncomeId ? 'Actualizar Ingreso' : 'Guardar Ingreso'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MODAL DE ALCANCE PARA GASTOS RECURRENTES */}
      <RecurrenceScopeModal
        isOpen={recurrenceModal.isOpen}
        action={recurrenceModal.action}
        concept={recurrenceModal.concept}
        date={recurrenceModal.date}
        onSelectScope={handleRecurrenceScopeSelect}
        onCancel={() => setRecurrenceModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <style>{`
        .month-container { max-width: 1200px; margin: 20px auto; padding: 0 16px; }
        .month-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .tab-content { padding: clamp(14px, 3vw, 24px); }
        .calendar-header-actions { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .weeks-shortcut { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .week-pill {
          background: #FFF0F4; border: 1px solid #F4A6C1; color: #D4566A; padding: 6px 12px; border-radius: 20px;
          text-decoration: none; font-weight: 700; font-size: 0.8rem; transition: all 0.2s ease;
        }
        .week-pill:hover { background: #D4566A; color: white; }
        .calendar-grid-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(80px, 1fr)); gap: 6px; min-width: 580px; }
        .day-name { text-align: center; font-weight: 700; color: #4A3F55; padding: 6px; background: #FFF0F4; border-radius: 8px; font-size: 0.85rem; }
        .calendar-day-cell {
          min-height: 95px; max-height: 125px; background: #FFFFFF; border: 1px solid rgba(244, 166, 193, 0.4); border-radius: 10px;
          padding: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: background 0.2s ease; overflow: hidden;
        }
        .calendar-day-cell:hover:not(.empty-day) { background: #FFF9FA; border-color: #D4566A; }
        .empty-day { background: #FAFAFA; border-color: transparent; cursor: default; }
        .day-number { font-weight: 700; font-size: 0.85rem; color: #4A3F55; }
        .day-expenses {
          display: flex; flex-direction: column; gap: 4px; max-height: 85px; overflow-y: auto; padding-right: 2px;
        }
        .day-expenses::-webkit-scrollbar { width: 3px; }
        .day-expenses::-webkit-scrollbar-thumb { background: #F4A6C1; border-radius: 10px; }
        .expense-tag {
          padding: 3px 5px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; color: #333;
          display: flex; align-items: center; gap: 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .incomes-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; }
        .section-title-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #FFF0F4; font-size: 0.9rem; vertical-align: middle; }
        .data-table th { text-align: left; background: #FFF0F4; color: #4A3F55; white-space: nowrap; }
        .data-table td { white-space: nowrap; }
        .data-table td:nth-child(2) { white-space: normal; } /* Concepto puede romper si es muy largo */
        .savings-card { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .savings-icon { font-size: 2.5rem; }
        .view-toggle { display: inline-flex; gap: 6px; margin: 8px 0; }
        .view-toggle-btn {
          padding: 6px 14px; border-radius: 10px; border: 1.5px solid #F4A6C1;
          background: #FFF0F4; color: #665275; font-weight: 600; cursor: pointer;
          font-family: inherit; transition: all 0.2s ease;
        }
        .view-toggle-btn.active, .view-toggle-btn:hover { background: #D4566A; color: #fff; border-color: #D4566A; }
        .saving-input-group { display: flex; align-items: center; gap: 6px; width: 100%; }
        .currency-symbol { font-weight: 700; font-size: 1.1rem; }
        .totals-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 20px; }
        .total-box { padding: 14px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 0.9rem; white-space: nowrap; }
        .bg-ingresos { background: #EAF6F0; color: #1E4E36; }
        .bg-gastos { background: #FDEEF4; color: #6A1B3B; }
        .bg-ahorros { background: #FFF9EB; color: #5B4810; }
        .challenge-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .challenge-icon-big { font-size: 3rem; }
        .progress-bar-wrapper { margin-bottom: 24px; }
        .progress-text { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem; }
        .progress-track { height: 14px; background: #FFF0F4; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #F4A6C1, #D4566A); transition: width 0.4s ease; }
        .challenge-days-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); gap: 10px; }
        .challenge-day-card {
          background: #FFFFFF; border: 2px solid #F4A6C1; border-radius: 10px; padding: 8px; text-align: center;
          cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all 0.2s ease; font-size: 0.8rem;
        }
        .challenge-day-card.completed { background: #FFE5EC; border-color: #D4566A; transform: scale(1.03); }
        .form-group { margin-bottom: 12px; display: flex; flex-direction: column; gap: 4px; }
        .form-input { padding: 8px 12px; border-radius: 10px; border: 1.5px solid #F4A6C1; outline: none; font-size: 0.9rem; width: 100%; }
        .btn-icon-danger { background: #FFE5EC; border: 1px solid #F4A6C1; color: #D4566A; cursor: pointer; width: 34px; height: 34px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: background 0.2s ease; }
        .btn-icon-danger:hover { background: #D4566A; color: white; }
        @media (max-width: 900px) {
          .incomes-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .month-container { margin: 10px auto; padding: 0 10px; }
          .month-header { flex-direction: column; text-align: center; }
          .totals-summary-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .total-box { padding: 10px; font-size: 0.8rem; }
          .challenge-header { flex-direction: column; text-align: center; }
          .challenge-days-grid { grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 6px; }
          .saving-input-group { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
};
