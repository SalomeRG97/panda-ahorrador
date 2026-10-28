import { api } from './api';
import {
  Category,
  Year,
  Month,
  Income,
  BudgetExpense,
  ExtraExpense,
  Week,
  CategoryWeekTotal,
  PaymentMethodWeekTotal,
  MonthChallengeData,
  AnnualSummary,
  CategoryChartData,
  TodayShortcuts,
  PendingBudgetExpense,
  RecurrenceScope,
} from '../types';

export const ApiService = {
  // CATEGORÍAS
  async getCategories(): Promise<Category[]> {
    const res = await api.get<{ success: boolean; data: Category[] }>('/categories');
    return res.data.data;
  },

  async createCategory(data: { name: string; color: string; icon: string }): Promise<Category> {
    const res = await api.post<{ success: boolean; data: Category }>('/categories', data);
    return res.data.data;
  },

  async updateCategory(id: number, data: { name?: string; color?: string; icon?: string }): Promise<Category> {
    const res = await api.put<{ success: boolean; data: Category }>(`/categories/${id}`, data);
    return res.data.data;
  },

  async deleteCategory(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/categories/${id}`);
    return res.data.success;
  },

  // MEDIOS DE PAGO
  async getPaymentMethods(): Promise<{ id: number; name: string }[]> {
    const res = await api.get<{ success: boolean; data: { id: number; name: string }[] }>('/payment-methods');
    return res.data.data;
  },

  async createPaymentMethod(name: string): Promise<{ id: number; name: string }> {
    const res = await api.post<{ success: boolean; data: { id: number; name: string } }>('/payment-methods', { name });
    return res.data.data;
  },

  async updatePaymentMethod(id: number, name: string): Promise<{ id: number; name: string }> {
    const res = await api.put<{ success: boolean; data: { id: number; name: string } }>(`/payment-methods/${id}`, { name });
    return res.data.data;
  },

  async deletePaymentMethod(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/payment-methods/${id}`);
    return res.data.success;
  },

  // AÑOS
  async getYears(): Promise<Year[]> {
    const res = await api.get<{ success: boolean; data: Year[] }>('/years');
    return res.data.data;
  },

  async getYearById(id: number): Promise<Year> {
    const res = await api.get<{ success: boolean; data: Year }>(`/years/${id}`);
    return res.data.data;
  },

  async createYear(year: number, startMonth: number): Promise<Year> {
    const res = await api.post<{ success: boolean; data: Year }>('/years', { year, startMonth });
    return res.data.data;
  },

  async deleteYear(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/years/${id}`);
    return res.data.success;
  },

  // MESES
  async getMonthDetails(monthId: number): Promise<any> {
    const res = await api.get<{ success: boolean; data: any }>(`/months/${monthId}`);
    return res.data.data;
  },

  // INGRESOS & AHORRO
  async getIncomesByMonth(monthId: number): Promise<Income[]> {
    const res = await api.get<{ success: boolean; data: Income[] }>(`/incomes/month/${monthId}`);
    return res.data.data;
  },

  async createIncome(income: Income): Promise<Income> {
    const res = await api.post<{ success: boolean; data: Income }>('/incomes', income);
    return res.data.data;
  },

  async updateIncome(id: number, income: Partial<Income>): Promise<boolean> {
    const res = await api.put<{ success: boolean }>(`/incomes/${id}`, income);
    return res.data.success;
  },

  async deleteIncome(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/incomes/${id}`);
    return res.data.success;
  },

  async setMonthSaving(monthId: number, amount: number): Promise<boolean> {
    const res = await api.post<{ success: boolean }>('/incomes/saving', { monthId, amount });
    return res.data.success;
  },

  // GASTOS PRESUPUESTADOS
  async createBudgetExpense(expense: BudgetExpense): Promise<BudgetExpense> {
    const res = await api.post<{ success: boolean; data: BudgetExpense }>('/expenses/budget', expense);
    return res.data.data;
  },

  async updateBudgetExpense(id: number, expense: Partial<BudgetExpense>, scope: RecurrenceScope = 'single'): Promise<boolean> {
    const res = await api.put<{ success: boolean }>(`/expenses/budget/${id}`, { ...expense, scope });
    return res.data.success;
  },

  async deleteBudgetExpense(id: number, scope: RecurrenceScope = 'single'): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/expenses/budget/${id}`, { params: { scope } });
    return res.data.success;
  },

  // Elimina este gasto recurrente y todos los siguientes (compatibilidad)
  async deleteBudgetExpenseSeries(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/expenses/budget/${id}/series`);
    return res.data.success;
  },

  // GASTOS PRESUPUESTADOS PENDIENTES
  async getPendingBudgetExpenses(): Promise<PendingBudgetExpense[]> {
    const res = await api.get<{ success: boolean; data: PendingBudgetExpense[] }>('/expenses/pending');
    return res.data.data;
  },

  // GASTOS EXTRA
  async createExtraExpense(expense: ExtraExpense): Promise<ExtraExpense> {
    const res = await api.post<{ success: boolean; data: ExtraExpense }>('/expenses/extra', expense);
    return res.data.data;
  },

  async updateExtraExpense(id: number, expense: Partial<ExtraExpense>): Promise<boolean> {
    const res = await api.put<{ success: boolean }>(`/expenses/extra/${id}`, expense);
    return res.data.success;
  },

  async deleteExtraExpense(id: number): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(`/expenses/extra/${id}`);
    return res.data.success;
  },

  // SEMANAS
  async getWeeksByMonth(monthId: number): Promise<Week[]> {
    const res = await api.get<{ success: boolean; data: Week[] }>(`/weeks/month/${monthId}`);
    return res.data.data;
  },

  async getWeekDetail(weekId: number): Promise<{
    week: Week;
    budgetExpenses: BudgetExpense[];
    extraExpenses: ExtraExpense[];
    categoryTotals: CategoryWeekTotal[];
    paymentMethodTotals: PaymentMethodWeekTotal[];
  }> {
    const res = await api.get<{ success: boolean; data: any }>(`/weeks/${weekId}`);
    return res.data.data;
  },

  // RETOS
  async getMonthChallenge(monthId: number): Promise<MonthChallengeData> {
    const res = await api.get<{ success: boolean; data: MonthChallengeData }>(`/challenges/month/${monthId}`);
    return res.data.data;
  },

  async updateChallengeProgress(monthChallengeId: number, day: number, completed: boolean): Promise<boolean> {
    const res = await api.put<{ success: boolean }>('/challenges/progress', { monthChallengeId, day, completed });
    return res.data.success;
  },

  // RESÚMENES & GRÁFICOS
  async getAnnualSummary(yearId: number): Promise<AnnualSummary> {
    const res = await api.get<{ success: boolean; data: AnnualSummary }>(`/summary/year/${yearId}`);
    return res.data.data;
  },

  async getAnnualCategoryCharts(yearId: number): Promise<CategoryChartData[]> {
    const res = await api.get<{ success: boolean; data: CategoryChartData[] }>(`/summary/year/${yearId}/categories`);
    return res.data.data;
  },

  async getMonthWeeklyCategoryBreakdown(monthId: number): Promise<any[]> {
    const res = await api.get<{ success: boolean; data: any[] }>(`/summary/month/${monthId}/categories-weekly`);
    return res.data.data;
  },

  // ACCESOS DIRECTOS (TODAY SHORTCUTS)
  async getTodayShortcuts(): Promise<TodayShortcuts> {
    const res = await api.get<{ success: boolean; data: TodayShortcuts }>('/shortcuts/today');
    return res.data.data;
  },
};
