import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Header from "@/components/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Plus, Trash2, Calendar, ChevronDown, ChevronRight, X, TrendingUp } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Paywall from "@/components/paywall";

const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

const categories = [
  "Adhoc",
  "Directors Wages",
  "Dividends",
  "Equipment & Maintenance",
  "Insurance",
  "Marketing & Advertising",
  "Other",
  "Stock",
  "Professional Services",
  "Rent & Utilities",
  "Spending on me (oops)",
  "Training & Education",
  "Travel & Transportation",
  "Wages"
];

const ITEMS_PER_PAGE = 10;

export default function ExpenseTracker() {
  const { formatCurrency, formatSymbol } = useCurrency();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string | null>(null);

  // Expenses List filter & pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [dateSortOrder, setDateSortOrder] = useState<"desc" | "asc">("desc");
  const [alphaSort, setAlphaSort] = useState<"" | "asc" | "desc">("");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const { toast } = useToast();

  // Session check
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/v2/auth/user', {
          method: 'GET',
          credentials: 'include',
        });
        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please log in to continue",
            variant: "destructive",
          });
          setTimeout(() => { window.location.href = '/login'; }, 2000);
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
      }
    };
    checkSession();
    const intervalId = setInterval(checkSession, 30000);
    return () => clearInterval(intervalId);
  }, [toast]);

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      form.reset({
        category: "",
        description: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
      });
      toast({ title: "Success", description: "Expense added successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add expense. Please try again.", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setExpenseToDelete(null);
      toast({ title: "Success", description: "Expense deleted successfully!" });
    },
    onError: () => {
      setExpenseToDelete(null);
      toast({ title: "Error", description: "Failed to delete expense. Please try again.", variant: "destructive" });
    },
  });

  const onSubmit = (data: ExpenseForm) => createExpenseMutation.mutate(data);

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) newExpanded.delete(monthKey);
    else newExpanded.add(monthKey);
    setExpandedMonths(newExpanded);
  };

  const handleCategoryClick = (category: string, monthKey: string) => {
    setFilterCategory(category);
    setFilterMonth(monthKey);
    // Reset list filters when using monthly summary drill-down
    setAlphaSort("");
    setDateSortOrder("desc");
    setCustomDateFrom("");
    setCustomDateTo("");
    setShowCustomDate(false);
    setCurrentPage(1);
  };

  const resetFilter = () => {
    setFilterCategory(null);
    setFilterMonth(null);
    setCurrentPage(1);
  };

  const resetPage = () => setCurrentPage(1);

  const handleDateSort = (order: "asc" | "desc") => {
    setAlphaSort("");
    setDateSortOrder(order);
    // Clear monthly summary drill-down filter when manually sorting
    setFilterCategory(null);
    setFilterMonth(null);
    resetPage();
  };

  const handleAlphaSort = (order: "asc" | "desc") => {
    setAlphaSort(order as "asc" | "desc");
    setFilterCategory(null);
    setFilterMonth(null);
    resetPage();
  };

  const clearCustomDates = () => {
    setCustomDateFrom("");
    setCustomDateTo("");
    setShowCustomDate(false);
    resetPage();
  };

  const activeCustomDate = customDateFrom || customDateTo;

  // Group expenses by month (for Monthly Summary panel)
  const expensesByMonth = Array.isArray(expenses)
    ? expenses.reduce((acc: Record<string, {
        monthName: string;
        total: number;
        expenses: any[];
        categories: Record<string, number>;
      }>, expense: any) => {
        const date = new Date(expense.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if (!acc[monthKey]) acc[monthKey] = { monthName, total: 0, expenses: [], categories: {} };
        const amount = parseFloat(expense.amount.toString());
        acc[monthKey].total += amount;
        acc[monthKey].expenses.push(expense);
        acc[monthKey].categories[expense.category] = (acc[monthKey].categories[expense.category] || 0) + amount;
        return acc;
      }, {})
    : {};

  const sortedMonths = Object.entries(expensesByMonth).sort(([a], [b]) => b.localeCompare(a));

  const currentYear = new Date().getFullYear();
  const totalExpenses = Array.isArray(expenses)
    ? expenses.reduce((sum: number, expense: any) => {
        const expenseYear = new Date(expense.date).getFullYear();
        return expenseYear === currentYear ? sum + parseFloat(expense.amount.toString()) : sum;
      }, 0)
    : 0;

  // ── Build filtered + sorted + paginated Expenses List ────────────────────
  const processedExpenses = (() => {
    let list: any[] = Array.isArray(expenses) ? [...expenses] : [];

    // 1. Monthly summary drill-down filter (category + month click)
    if (filterCategory && filterMonth) {
      list = list.filter((expense) => {
        const date = new Date(expense.date);
        const expenseMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return expense.category === filterCategory && expenseMonthKey === filterMonth;
      });
    }

    // 2. Custom date range filter
    if (customDateFrom) {
      const from = new Date(customDateFrom);
      list = list.filter((e) => new Date(e.date) >= from);
    }
    if (customDateTo) {
      const to = new Date(customDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter((e) => new Date(e.date) <= to);
    }

    // 3. Sort
    if (alphaSort === "asc") {
      list.sort((a, b) => a.description.localeCompare(b.description));
    } else if (alphaSort === "desc") {
      list.sort((a, b) => b.description.localeCompare(a.description));
    } else {
      list.sort((a, b) =>
        dateSortOrder === "desc"
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = list.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    return { paginated, total, totalPages, safePage };
  })();

  if (subscriptionLoading) {
    return (
      <>
        <Header title="Expense Tracker" description="Track and categorize your business expenses" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Expense Tracker"
        description="Track and categorise your business expenses to understand your costs"
      />

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Add Expense Form ─────────────────────────────────────── */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800">Add Expense</h3>
                <p className="text-slate-600 text-sm mt-1">Record a new business expense</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Office rent for January" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">{formatSymbol()}</span>
                            <Input {...field} type="number" step="0.01" placeholder="0.00" className="pl-8" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-primary text-white hover-bg-[#FFB6C1]"
                    disabled={createExpenseMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* ── Monthly Summary ──────────────────────────────────────── */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Monthly Summary</h3>
                  <p className="text-slate-600 text-sm mt-1">Expenses organised by month</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Receipt className="text-success h-5 w-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-sm text-slate-600 mb-1">Total for {currentYear}</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalExpenses)}</p>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {sortedMonths.length > 0 ? (
                    sortedMonths.map(([monthKey, monthData]) => (
                      <div key={monthKey} className="bg-slate-50 rounded-lg">
                        <div
                          className="p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                          onClick={() => toggleMonth(monthKey)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              {expandedMonths.has(monthKey)
                                ? <ChevronDown className="h-4 w-4 text-slate-600" />
                                : <ChevronRight className="h-4 w-4 text-slate-600" />}
                              <span className="font-medium text-slate-800">{monthData.monthName}</span>
                            </div>
                            <span className="font-bold text-slate-800">{formatCurrency(monthData.total)}</span>
                          </div>
                          <div className="text-xs text-slate-600 ml-6">
                            {monthData.expenses.length} expense{monthData.expenses.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {expandedMonths.has(monthKey) && (
                          <div className="px-3 pb-3 space-y-2">
                            {Object.entries(monthData.categories)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([category, amount]) => (
                                <div
                                  key={category}
                                  className="flex justify-between items-center py-2 px-3 bg-white rounded border-l-4 border-primary/20 cursor-pointer hover:bg-slate-50 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleCategoryClick(category, monthKey); }}
                                >
                                  <span className="text-sm text-slate-700">{category}</span>
                                  <span className="text-sm font-semibold text-slate-800">{formatCurrency(amount as number)}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500">No expenses recorded yet</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Expenses List ────────────────────────────────────────── */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Expenses List</h3>
                  <p className="text-slate-600 text-sm mt-1">
                    {filterCategory && filterMonth
                      ? `Filtered by ${filterCategory}`
                      : "All expenses"}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-purple-600 h-5 w-5" />
                </div>
              </div>

              {/* ── Filter Controls ───────────────────────────────── */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex flex-wrap gap-2 items-center">

                  {/* Date sort */}
                  <Select
                    value={alphaSort === "" ? `date-${dateSortOrder}` : ""}
                    onValueChange={(v) => {
                      if (v === "date-desc") handleDateSort("desc");
                      if (v === "date-asc") handleDateSort("asc");
                    }}
                  >
                    <SelectTrigger className="w-[155px] h-8 text-xs">
                      <Calendar className="h-3 w-3 mr-1.5 shrink-0" />
                      <SelectValue placeholder="Sort by Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Alphabetical sort */}
                  <Select
                    value={alphaSort ? `alpha-${alphaSort}` : ""}
                    onValueChange={(v) => {
                      if (v === "alpha-asc") handleAlphaSort("asc");
                      if (v === "alpha-desc") handleAlphaSort("desc");
                    }}
                  >
                    <SelectTrigger className="w-[155px] h-8 text-xs">
                      <TrendingUp className="h-3 w-3 mr-1.5 shrink-0" />
                      <SelectValue placeholder="Alphabetical" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alpha-asc">Description: A → Z</SelectItem>
                      <SelectItem value="alpha-desc">Description: Z → A</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Custom date toggle */}
                  <Button
                    variant={showCustomDate || activeCustomDate ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs px-2.5"
                    onClick={() => setShowCustomDate((v) => !v)}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Custom Date
                    {activeCustomDate && (
                      <span className="ml-1 bg-white/20 rounded-full px-1 py-0.5 text-xs">✓</span>
                    )}
                  </Button>

                  {/* Clear custom date */}
                  {activeCustomDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={clearCustomDates}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Custom date inputs */}
                {showCustomDate && (
                  <div className="flex flex-wrap gap-2 items-end p-3 bg-slate-50 rounded-lg border">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">From</label>
                      <Input
                        type="date"
                        value={customDateFrom}
                        onChange={(e) => { setCustomDateFrom(e.target.value); resetPage(); }}
                        className="h-7 w-[145px] text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">To</label>
                      <Input
                        type="date"
                        value={customDateTo}
                        onChange={(e) => { setCustomDateTo(e.target.value); resetPage(); }}
                        className="h-7 w-[145px] text-xs"
                      />
                    </div>
                    {activeCustomDate && (
                      <span className="text-xs text-slate-400 pb-1">
                        {processedExpenses.total} result{processedExpenses.total !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Monthly filter reset */}
                {filterCategory && filterMonth && (
                  <Button onClick={resetFilter} variant="outline" size="sm" className="w-full h-8 text-xs">
                    <X className="h-3 w-3 mr-1.5" />
                    Reset Filter: {filterCategory}
                  </Button>
                )}
              </div>
              {/* ── /Filter Controls ──────────────────────────────── */}

              {/* List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading expenses...</div>
                ) : processedExpenses.total === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    {filterCategory && filterMonth
                      ? "No expenses found for this filter."
                      : activeCustomDate
                      ? "No expenses match the selected date range."
                      : "No expenses recorded yet. Add your first expense!"}
                    {(activeCustomDate || (filterCategory && filterMonth)) && (
                      <div className="mt-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs"
                          onClick={() => { clearCustomDates(); resetFilter(); }}
                        >
                          Clear all filters
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  processedExpenses.paginated.map((expense: any) => (
                    <div key={expense.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{expense.description}</p>
                          <p className="text-sm text-slate-600">{expense.category}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(expense.date).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">
                            {formatCurrency(expense.amount)}
                          </span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deleteExpenseMutation.isPending}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this expense from your records.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>No</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteExpenseMutation.mutate(expense.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Yes
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Pagination ────────────────────────────────────── */}
              {processedExpenses.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t flex-wrap gap-2">
                  <p className="text-xs text-slate-500">
                    {(processedExpenses.safePage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(processedExpenses.safePage * ITEMS_PER_PAGE, processedExpenses.total)}{" "}
                    of {processedExpenses.total}
                  </p>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={processedExpenses.safePage === 1}
                      className="h-7 px-2 text-xs"
                    >
                      ‹
                    </Button>

                    {Array.from({ length: processedExpenses.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === processedExpenses.totalPages ||
                          Math.abs(p - processedExpenses.safePage) <= 1
                      )
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={processedExpenses.safePage === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(p as number)}
                            className="h-7 w-7 p-0 text-xs"
                          >
                            {p}
                          </Button>
                        )
                      )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(processedExpenses.totalPages, p + 1))}
                      disabled={processedExpenses.safePage === processedExpenses.totalPages}
                      className="h-7 px-2 text-xs"
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}
              {/* ── /Pagination ───────────────────────────────────── */}

            </CardContent>
          </Card>

        </div>
      </main>
    </>
  );
}
