export type Role = 'student' | 'parent';
export type Kind = 'income' | 'expense' | 'savings';
export const categories = [
  {
    id: 'food',
    name: 'Food & meals',
    icon: 'restaurant-outline',
    color: '#16876A',
    tint: '#E5F4ED',
  },
  {
    id: 'transport',
    name: 'Transportation',
    icon: 'bus-outline',
    color: '#408AB8',
    tint: '#E9F3FA',
  },
  {
    id: 'school',
    name: 'School supplies',
    icon: 'school-outline',
    color: '#7761C4',
    tint: '#F0EBFC',
  },
  {
    id: 'load',
    name: 'Mobile load',
    icon: 'phone-portrait-outline',
    color: '#D09535',
    tint: '#FFF5E1',
  },
  {
    id: 'bills',
    name: 'Bills & printing',
    icon: 'print-outline',
    color: '#6280AA',
    tint: '#EAF0F8',
  },
  {
    id: 'personal',
    name: 'Personal care',
    icon: 'leaf-outline',
    color: '#CB7B8D',
    tint: '#FCEEF2',
  },
  {
    id: 'fun',
    name: 'Entertainment',
    icon: 'game-controller-outline',
    color: '#AC7CCC',
    tint: '#F6EEFC',
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'grid-outline',
    color: '#79828E',
    tint: '#EFF1F4',
  },
] as const;
export const channels = ['Cash', 'GCash', 'Maya', 'Bank', 'Other'] as const;
export interface Profile {
  id: string;
  name: string;
  role: Role;
  school: string;
  weekly_budget_cents: number;
  daily_essential_cents: number;
  cycle_start_day: number;
}
export interface Transaction {
  id: string;
  user_id: string;
  kind: Kind;
  amount_cents: number;
  category: string;
  channel: string;
  description: string;
  occurred_on: string;
  created_at: string;
  goal_id: string | null;
}
export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_cents: number;
  target_date: string;
  icon: string;
  saved_cents?: number;
}
export interface Permissions {
  share_balance: boolean;
  share_categories: boolean;
  share_goals: boolean;
  share_health: boolean;
}
export interface ParentLink extends Permissions {
  id: string;
  student_id: string;
  parent_id: string;
  created_at: string;
  parent_name?: string;
}
export interface AppData {
  profile: Profile;
  transactions: Transaction[];
  goals: Goal[];
  links: ParentLink[];
}
export interface GuardianSnapshot {
  link_id: string;
  student_name: string;
  school: string;
  permissions: Permissions;
  balance: {
    available_cents: number;
    daily_cents: number;
    weekly_budget_cents: number;
    days_left: number;
  } | null;
  categories: { category: string; cents: number }[] | null;
  goals: Goal[] | null;
  health: 'comfortable' | 'watchful' | 'tight' | null;
}
export const defaultPermissions: Permissions = {
  share_balance: true,
  share_categories: true,
  share_goals: true,
  share_health: true,
};
export function peso(cents: number, decimals = false) {
  return (
    '₱' +
    (cents / 100).toLocaleString('en-PH', {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}
export function toCents(value: string): number {
  if (!/^\d+(\.\d{0,2})?$/.test(value.trim()))
    throw new Error('Enter an amount with up to two decimal places.');
  const [whole, part = ''] = value.trim().split('.');
  const cents = Number(whole) * 100 + Number(part.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100_000_000)
    throw new Error('Enter an amount between ₱0.01 and ₱1,000,000.');
  return cents;
}
export function manilaDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function cycleDates(startDay = 1, today = manilaDate()) {
  const now = new Date(`${today}T00:00:00Z`);
  const elapsed = (now.getUTCDay() - startDay + 7) % 7;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - elapsed);
  return { start: start.toISOString().slice(0, 10), daysLeft: 7 - elapsed };
}
export function goalSaved(goal: Goal, transactions: Transaction[]) {
  return (
    goal.saved_cents ??
    transactions
      .filter((t) => t.kind === 'savings' && t.goal_id === goal.id)
      .reduce((s, t) => s + t.amount_cents, 0)
  );
}
export function summarize(
  data: Pick<AppData, 'profile' | 'transactions' | 'goals'>,
  today = manilaDate(),
) {
  const { start, daysLeft } = cycleDates(data.profile.cycle_start_day, today);
  const all = data.transactions.filter((t) => t.occurred_on <= today);
  const income = all.filter((t) => t.kind === 'income').reduce((s, t) => s + t.amount_cents, 0);
  const spent = all.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amount_cents, 0);
  const reserved = all.filter((t) => t.kind === 'savings').reduce((s, t) => s + t.amount_cents, 0);
  const available = income - spent - reserved;
  const week = all.filter((t) => t.occurred_on >= start);
  const weekSpent = week
    .filter((t) => t.kind === 'expense')
    .reduce((s, t) => s + t.amount_cents, 0);
  const weekReserved = week
    .filter((t) => t.kind === 'savings')
    .reduce((s, t) => s + t.amount_cents, 0);
  const budgetRemaining = data.profile.weekly_budget_cents - weekSpent - weekReserved;
  const safePool = Math.max(0, Math.min(available, budgetRemaining));
  const safeDaily = Math.floor(safePool / daysLeft);
  const todaySpent = all
    .filter((t) => t.kind === 'expense' && t.occurred_on === today)
    .reduce((s, t) => s + t.amount_cents, 0);
  const health =
    safeDaily >= data.profile.daily_essential_cents
      ? 'comfortable'
      : safeDaily > 0
        ? 'watchful'
        : 'tight';
  return {
    income,
    spent,
    reserved,
    available,
    weekSpent,
    weekReserved,
    budgetRemaining,
    safePool,
    safeDaily,
    todaySpent,
    daysLeft,
    start,
    health,
  };
}
export function affordability(data: AppData, amount: number) {
  const summary = summarize(data);
  const remaining = summary.available - amount;
  const dailyAfter = Math.floor(
    Math.max(0, Math.min(remaining, summary.budgetRemaining - amount)) / summary.daysLeft,
  );
  const status =
    remaining < 0 ? 'over' : dailyAfter < data.profile.daily_essential_cents ? 'wait' : 'safe';
  return { ...summary, remaining, dailyAfter, status };
}
export function categoryTotals(transactions: Transaction[]) {
  return categories
    .map((c) => ({
      ...c,
      cents: transactions
        .filter((t) => t.kind === 'expense' && t.category === c.id)
        .reduce((s, t) => s + t.amount_cents, 0),
    }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents);
}
export function makeDemo(): AppData {
  const today = manilaDate();
  const id = 'demo-student';
  const goal = 'demo-laptop';
  const transactions: Transaction[] = [
    {
      id: 'demo-1',
      kind: 'income',
      amount_cents: 200000,
      category: 'other',
      channel: 'GCash',
      description: 'Weekly baon from Nanay',
      goal_id: null,
    },
    {
      id: 'demo-2',
      kind: 'expense',
      amount_cents: 12000,
      category: 'food',
      channel: 'Cash',
      description: 'Lunch at the campus canteen',
      goal_id: null,
    },
    {
      id: 'demo-3',
      kind: 'expense',
      amount_cents: 6000,
      category: 'transport',
      channel: 'Cash',
      description: 'Jeepney to campus',
      goal_id: null,
    },
    {
      id: 'demo-4',
      kind: 'expense',
      amount_cents: 10000,
      category: 'food',
      channel: 'GCash',
      description: 'Merienda with the block',
      goal_id: null,
    },
    {
      id: 'demo-5',
      kind: 'expense',
      amount_cents: 8000,
      category: 'school',
      channel: 'Maya',
      description: 'Reviewers & photocopies',
      goal_id: null,
    },
    {
      id: 'demo-6',
      kind: 'expense',
      amount_cents: 6000,
      category: 'transport',
      channel: 'Cash',
      description: 'Ride home',
      goal_id: null,
    },
    {
      id: 'demo-7',
      kind: 'expense',
      amount_cents: 3000,
      category: 'personal',
      channel: 'Cash',
      description: 'Personal essentials',
      goal_id: null,
    },
    {
      id: 'demo-8',
      kind: 'savings',
      amount_cents: 30000,
      category: 'other',
      channel: 'Cash',
      description: 'Saved for my laptop',
      goal_id: goal,
    },
  ].map((t, i) => ({
    ...t,
    kind: t.kind as Kind,
    user_id: id,
    occurred_on: today,
    created_at: `${today}T${String(8 + i).padStart(2, '0')}:00:00+08:00`,
  }));
  const deadline = new Date();
  deadline.setMonth(deadline.getMonth() + 6);
  return {
    profile: {
      id,
      name: 'Juan Dela Cruz',
      role: 'student',
      school: 'University of the Philippines',
      weekly_budget_cents: 200000,
      daily_essential_cents: 15000,
      cycle_start_day: 1,
    },
    transactions,
    goals: [
      {
        id: goal,
        user_id: id,
        name: 'My first laptop',
        target_cents: 1500000,
        target_date: manilaDate(deadline),
        icon: 'laptop-outline',
      },
      {
        id: 'demo-emergency',
        user_id: id,
        name: 'Rainy-day baon',
        target_cents: 100000,
        target_date: manilaDate(deadline),
        icon: 'umbrella-outline',
      },
    ],
    links: [],
  };
}
