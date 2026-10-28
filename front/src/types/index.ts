export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  role: 'admin' | 'regular' | 'viewer';
  roleId: number;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Role {
  id: number;
  name: string;
}

export interface SharedOwner {
  id: number;
  owner_id: number;
  viewer_id: number;
  owner_name: string;
  owner_email: string;
  owner_username: string;
  owner_avatar: string | null;
  created_at: string;
}

export interface SharedViewer {
  id: number;
  owner_id: number;
  viewer_id: number;
  viewer_name: string;
  viewer_email: string;
  viewer_username: string;
  viewer_avatar: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  user_id?: number | null;
  isGlobal?: boolean;
}

export interface Month {
  id: number;
  year_id: number;
  month_number: number;
  month_name: string;
  year?: number;
}

export interface Year {
  id: number;
  year: number;
  start_month: number;
  end_month: number;
  created_at?: string;
  months?: Month[];
}

export interface Income {
  id?: number;
  month_id: number;
  date: string;
  concept: string;
  amount: number;
}

export interface BudgetExpense {
  id?: number;
  month_id: number;
  week_id?: number;
  category_id: number;
  date: string;
  concept: string;
  budget_amount: number;
  real_amount?: number;
  payment_method?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  recurrence_id?: number | null;
  recurrence_frequency?: RecurrenceFrequency | null;
  recurrence?: { frequency: RecurrenceFrequency; end_date?: string | null };
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type RecurrenceScope = 'single' | 'future' | 'all';

export interface PendingBudgetExpense {
  id: number;
  month_id: number;
  week_id: number | null;
  week_number?: number | null;
  category_id: number;
  date: string;
  concept: string;
  budget_amount: number;
  real_amount?: number;
  payment_method?: string;
  recurrence_id?: number | null;
  recurrence_frequency?: RecurrenceFrequency | null;
  year_id: number;
  month_number: number;
  month_name: string;
  year: number;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  status_type?: 'overdue' | 'current_week';
}

export interface UpdateNewsItem {
  id: string;
  version: string;
  title: string;
  date: string;
  tag: string;
  tagColor?: string;
  icon: string;
  headline: string;
  description: string;
  highlights?: string[];
}

export interface ExtraExpense {
  id?: number;
  month_id: number;
  week_id?: number;
  category_id: number;
  date: string;
  concept: string;
  amount: number;
  payment_method?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface Week {
  id: number;
  month_id: number;
  week_number: number;
  start_date: string;
  end_date: string;
}

export interface CategoryWeekTotal {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  totalBudget: number;
  totalRealBudget: number;
  totalExtra: number;
  totalSpent: number;
}

export interface PaymentMethodWeekTotal {
  paymentMethod: string;
  totalBudget: number;
  totalRealBudget: number;
  totalExtra: number;
  totalSpent: number;
}

export interface Challenge {
  id: number;
  title: string;
  description: string;
  icon: string;
  month_challenge_id?: number;
}

export interface ChallengeDayProgress {
  id: number;
  month_challenge_id: number;
  day: number;
  completed: boolean;
}

export interface MonthChallengeData {
  challenge: Challenge;
  progress: ChallengeDayProgress[];
  stats: {
    completedDays: number;
    totalDays: number;
    percentage: number;
  };
}

export interface MonthSummaryItem {
  monthId: number;
  monthNumber: number;
  monthName: string;
  income: number;
  expenses: number;
  savings: number;
  fixed: number;
  remaining: number;
}

export interface AnnualSummary {
  totals: {
    income: number;
    expenses: number;
    savings: number;
    fixed: number;
    remaining: number;
  };
  months: MonthSummaryItem[];
}

export interface CategoryChartData {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  monthlyData: number[];
}

export interface TodayShortcuts {
  todayStr: string;
  currentYearNum: number;
  currentMonthNum: number;
  year?: { id: number; year: number; start_month: number; end_month: number } | null;
  month?: { id: number; month_number: number; month_name: string; year_id: number } | null;
  week?: { id: number; week_number: number; start_date: string; end_date: string } | null;
  challenge?: { month_challenge_id: number; id: number; title: string; description: string; icon: string } | null;
}
