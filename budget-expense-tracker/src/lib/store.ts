import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Category {
  id: string;
  name: string;
  /** Monthly budget, in pesos. */
  budget: number;
}

export interface Expense {
  id: string;
  date: string; // yyyy-MM-dd
  description: string;
  categoryId: string;
  amount: number;
}

const seedCategories: Category[] = [
  { id: "advertising", name: "Advertising", budget: 48000 },
  { id: "events", name: "Events", budget: 35000 },
  { id: "software", name: "Software & Tools", budget: 12500 },
  { id: "content", name: "Content Production", budget: 22000 },
  { id: "travel", name: "Travel", budget: 18000 },
  { id: "supplies", name: "Office Supplies", budget: 4500 },
];

const seedExpenses: Expense[] = [
  { id: "e1", date: "2026-10-01", description: "LinkedIn sponsored posts – Q4 launch", categoryId: "advertising", amount: 21350 },
  { id: "e2", date: "2026-10-02", description: "Canva Teams renewal", categoryId: "software", amount: 6890 },
  { id: "e3", date: "2026-10-03", description: "Printer toner and A4 reams", categoryId: "supplies", amount: 2745 },
  { id: "e4", date: "2026-10-05", description: "Booth deposit – BGC tech expo", categoryId: "events", amount: 27500 },
  { id: "e5", date: "2026-10-06", description: "Grab rides to client workshop", categoryId: "travel", amount: 1860 },
  { id: "e6", date: "2026-10-07", description: "Case study video editing", categoryId: "content", amount: 14200 },
  { id: "e7", date: "2026-10-09", description: "Google Ads – webinar registrations", categoryId: "advertising", amount: 18975 },
  { id: "e8", date: "2026-10-10", description: "Event giveaways and lanyards", categoryId: "events", amount: 9640 },
  { id: "e9", date: "2026-10-12", description: "Stock photo credits", categoryId: "content", amount: 3480 },
  { id: "e10", date: "2026-10-13", description: "Flight to Cebu – partner summit", categoryId: "travel", amount: 7415 },
  { id: "e11", date: "2026-09-18", description: "Semrush monthly plan", categoryId: "software", amount: 7120 },
  { id: "e12", date: "2026-09-24", description: "Facebook lead-gen campaign", categoryId: "advertising", amount: 32860 },
];

interface AppState {
  categories: Category[];
  expenses: Expense[];
  addExpense: (e: Omit<Expense, "id">) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  setBudget: (categoryId: string, budget: number) => void;
  addCategory: (name: string, budget: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      categories: seedCategories,
      expenses: seedExpenses,
      addExpense: (e) =>
        set((s) => ({ expenses: [...s.expenses, { ...e, id: crypto.randomUUID() }] })),
      updateExpense: (e) =>
        set((s) => ({ expenses: s.expenses.map((x) => (x.id === e.id ? e : x)) })),
      deleteExpense: (id) =>
        set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
      setBudget: (categoryId, budget) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === categoryId ? { ...c, budget } : c)),
        })),
      addCategory: (name, budget) =>
        set((s) => ({
          categories: [...s.categories, { id: crypto.randomUUID(), name, budget }],
        })),
    }),
    { name: "budget-expense-tracker-v1" },
  ),
);
