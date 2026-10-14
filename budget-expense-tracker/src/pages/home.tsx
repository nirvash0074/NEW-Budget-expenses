import { useMemo, useState, type FormEvent } from "react";
import { addMonths, format, parseISO, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Pencil, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/states";
import { useConfirm } from "@/hooks/use-confirm";
import { useAppStore, type Category, type Expense } from "@/lib/store";
import { cn } from "@/lib/utils";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const pesoExact = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

interface CategoryRow extends Category {
  spent: number;
  remaining: number;
}

/* ---------- Budget meter (visual-first surface) ---------- */

function BudgetMeter({ rows, monthLabel }: { rows: CategoryRow[]; monthLabel: string }) {
  const rowH = 46;
  const labelW = 150;
  const valueW = 170;
  const width = 720;
  const trackW = width - labelW - valueW;
  const scaleMax = Math.max(1, ...rows.map((r) => Math.max(r.budget, r.spent)));
  const height = rows.length * rowH + 8;
  const over = rows.filter((r) => r.spent > r.budget);

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-labelledby="meter-title meter-desc"
      >
        <title id="meter-title">{`Spending against budget by category, ${monthLabel}`}</title>
        <desc id="meter-desc">
          {rows
            .map((r) => `${r.name}: ${peso.format(r.spent)} spent of ${peso.format(r.budget)} budget`)
            .join(". ")}
        </desc>
        {rows.map((r, i) => {
          const y = i * rowH + 8;
          const budgetW = (r.budget / scaleMax) * trackW;
          const spentW = (Math.min(r.spent, r.budget) / scaleMax) * trackW;
          const overW = r.spent > r.budget ? ((r.spent - r.budget) / scaleMax) * trackW : 0;
          const isOver = r.spent > r.budget;
          return (
            <g key={r.id}>
              <text x={0} y={y + 20} className="fill-foreground text-[14px] font-medium">
                {r.name.length > 20 ? r.name.slice(0, 19) + "…" : r.name}
              </text>
              <rect x={labelW} y={y + 6} width={Math.max(budgetW, 2)} height={20} rx={10} className="fill-muted stroke-border" />
              <rect x={labelW} y={y + 6} width={spentW} height={20} rx={10} className="fill-primary" />
              {overW > 0 && (
                <rect
                  x={labelW + budgetW - 4}
                  y={y + 6}
                  width={overW + 4}
                  height={20}
                  rx={10}
                  className="fill-destructive"
                />
              )}
              <line
                x1={labelW + budgetW}
                x2={labelW + budgetW}
                y1={y + 1}
                y2={y + 31}
                className="stroke-foreground"
                strokeWidth={2}
              />
              <text
                x={width}
                y={y + 15}
                textAnchor="end"
                className="fill-foreground text-[13px] font-semibold tabular-nums"
              >
                {`${peso.format(r.spent)} / ${peso.format(r.budget)}`}
              </text>
              <text
                x={width}
                y={y + 32}
                textAnchor="end"
                className={cn("text-[12px] tabular-nums", isOver ? "fill-destructive font-semibold" : "fill-muted-foreground")}
              >
                {isOver ? `${peso.format(r.spent - r.budget)} over` : `${peso.format(r.remaining)} left`}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-sm text-muted-foreground">
        Bar = spent; vertical line = monthly budget.
        {over.length > 0 && (
          <span className="font-medium text-destructive">
            {" "}Over budget: {over.map((o) => o.name).join(", ")}.
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/* ---------- Expense form ---------- */

function ExpenseForm({
  categories,
  initial,
  defaultDate,
  submitLabel,
  onSubmit,
}: {
  categories: Category[];
  initial?: Expense;
  defaultDate: string;
  submitLabel: string;
  onSubmit: (e: Omit<Expense, "id">) => void;
}) {
  const [key, setKey] = useState(0);
  const idp = initial ? `edit-${initial.id}` : "new";

  function handle(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const amount = Number(fd.get("amount"));
    const description = String(fd.get("description") ?? "").trim();
    if (!description || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a description and an amount greater than zero.");
      return;
    }
    onSubmit({
      date: String(fd.get("date")),
      description,
      categoryId: String(fd.get("categoryId")),
      amount: Math.round(amount * 100) / 100,
    });
    if (!initial) setKey((k) => k + 1);
  }

  return (
    <form key={key} onSubmit={handle} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idp}-desc`}>Description</Label>
        <Input id={`${idp}-desc`} name="description" required maxLength={120} defaultValue={initial?.description} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idp}-amount`}>Amount (₱)</Label>
        <Input
          id={`${idp}-amount`}
          name="amount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          defaultValue={initial?.amount}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${idp}-date`}>Date</Label>
        <Input id={`${idp}-date`} name="date" type="date" required defaultValue={initial?.date ?? defaultDate} />
      </div>
      <div className="grid gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idp}-cat`}>Category</Label>
        <NativeSelect id={`${idp}-cat`} name="categoryId" defaultValue={initial?.categoryId ?? categories[0]?.id} className="w-full">
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" className="sm:col-span-2">
        {!initial && <Plus aria-hidden="true" />}
        {submitLabel}
      </Button>
    </form>
  );
}

/* ---------- Budget input ---------- */

function BudgetInput({ category }: { category: Category }) {
  const setBudget = useAppStore((s) => s.setBudget);
  const [value, setValue] = useState(String(category.budget));
  function commit() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      setValue(String(category.budget));
      toast.error("Budget must be zero or more.");
      return;
    }
    if (n !== category.budget) {
      setBudget(category.id, Math.round(n));
      toast.success(`${category.name} budget set to ${peso.format(Math.round(n))}`);
    }
  }
  return (
    <Input
      type="number"
      min="0"
      step="100"
      inputMode="numeric"
      aria-label={`Monthly budget for ${category.name}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="h-8 w-28 text-right tabular-nums"
    />
  );
}

/* ---------- Page ---------- */

export function HomePage() {
  const categories = useAppStore((s) => s.categories);
  const expenses = useAppStore((s) => s.expenses);
  const addExpense = useAppStore((s) => s.addExpense);
  const updateExpense = useAppStore((s) => s.updateExpense);
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const confirm = useConfirm();
  const [month, setMonth] = useState(() => new Date(2026, 9, 1));
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Expense | null>(null);

  const monthKey = format(month, "yyyy-MM");
  const monthLabel = format(month, "MMMM yyyy");
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Uncategorized";

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.date.startsWith(monthKey)).sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, monthKey],
  );

  const rows: CategoryRow[] = useMemo(
    () =>
      categories.map((c) => {
        const spent = monthExpenses.filter((e) => e.categoryId === c.id).reduce((t, e) => t + e.amount, 0);
        return { ...c, spent, remaining: c.budget - spent };
      }),
    [categories, monthExpenses],
  );

  const totalBudget = rows.reduce((t, r) => t + r.budget, 0);
  const totalSpent = rows.reduce((t, r) => t + r.spent, 0);
  const totalLeft = totalBudget - totalSpent;
  const visible = filter === "all" ? monthExpenses : monthExpenses.filter((e) => e.categoryId === filter);
  const defaultDate = format(month, "yyyy-MM") === "2026-10" ? "2026-10-14" : format(month, "yyyy-MM-01");

  async function remove(e: Expense) {
    const ok = await confirm({
      title: "Delete this expense?",
      description: `${e.description} · ${pesoExact.format(e.amount)}`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) {
      deleteExpense(e.id);
      toast.success("Expense deleted");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Budget Expense Tracker</h1>
          <p className="mt-2 text-lg tabular-nums">
            <span className="font-semibold">{peso.format(totalSpent)}</span> spent of {peso.format(totalBudget)} ·{" "}
            <span className={cn("font-semibold", totalLeft < 0 ? "text-destructive" : "text-primary")}>
              {totalLeft < 0 ? `${peso.format(-totalLeft)} over` : `${peso.format(totalLeft)} left`}
            </span>
          </p>
        </div>
        <nav aria-label="Month" className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center font-semibold" aria-live="polite">
            {monthLabel}
          </span>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-labelledby="by-category" className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          <h2 id="by-category" className="font-heading text-xl font-bold">Budget by category</h2>
          <div className="mt-5">
            <BudgetMeter rows={rows} monthLabel={monthLabel} />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">{`Budget, spent and remaining by category for ${monthLabel}`}</caption>
              <thead>
                <tr className="border-b border-border text-left">
                  <th scope="col" className="py-2 pr-3 font-semibold">Category</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Monthly budget</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Spent</th>
                  <th scope="col" className="py-2 text-right font-semibold">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{r.name}</th>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end">
                        <BudgetInput key={`${r.id}-${r.budget}`} category={r} />
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{peso.format(r.spent)}</td>
                    <td className={cn("py-2 text-right font-semibold tabular-nums", r.remaining < 0 && "text-destructive")}>
                      {r.remaining < 0 ? `−${peso.format(-r.remaining)}` : peso.format(r.remaining)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="add-expense" className="rounded-3xl bg-gradient-to-br from-primary to-accent p-[2px]">
            <div className="rounded-[calc(1.5rem-2px)] bg-card p-5 sm:p-6">
              <h2 id="add-expense" className="font-heading text-xl font-bold">Add expense</h2>
              <div className="mt-4">
                <ExpenseForm
                  categories={categories}
                  defaultDate={defaultDate}
                  submitLabel="Add expense"
                  onSubmit={(e) => {
                    addExpense(e);
                    toast.success(`Added ${pesoExact.format(e.amount)} to ${catName(e.categoryId)}`);
                    if (!e.date.startsWith(monthKey)) setMonth(parseISO(e.date.slice(0, 7) + "-01"));
                  }}
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="expenses" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="expenses" className="font-heading text-xl font-bold">Expenses</h2>
              <div className="flex items-center gap-2">
                <Label htmlFor="filter" className="text-sm">Category</Label>
                <NativeSelect id="filter" size="sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <NativeSelectOption value="all">All</NativeSelectOption>
                  {categories.map((c) => (
                    <NativeSelectOption key={c.id} value={c.id}>
                      {c.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState icon={ReceiptText} title={`No expenses in ${monthLabel}`} className="py-10" />
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {visible.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3">
                    <div className="w-12 shrink-0 text-center leading-tight">
                      <div className="text-lg font-bold tabular-nums">{format(parseISO(e.date), "d")}</div>
                      <div className="text-xs uppercase text-muted-foreground">{format(parseISO(e.date), "MMM")}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.description}</p>
                      <p className="text-sm text-muted-foreground">{catName(e.categoryId)}</p>
                    </div>
                    <span className="font-semibold tabular-nums">{pesoExact.format(e.amount)}</span>
                    <div className="flex shrink-0">
                      <Button variant="ghost" size="icon" aria-label={`Edit ${e.description}`} onClick={() => setEditing(e)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${e.description}`} onClick={() => remove(e)}>
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit expense</DialogTitle>
          </DialogHeader>
          {editing && (
            <ExpenseForm
              categories={categories}
              initial={editing}
              defaultDate={editing.date}
              submitLabel="Save changes"
              onSubmit={(e) => {
                updateExpense({ ...e, id: editing.id });
                setEditing(null);
                toast.success("Expense updated");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
