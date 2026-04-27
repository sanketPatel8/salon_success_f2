import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStockPurchaseSchema, type StockPurchase } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, TrendingUp, Package, Calculator, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Paywall from "@/components/paywall";
import TutorialVideoCard from "@/components/tutorial-video-card";

type StockPurchaseForm = z.infer<typeof insertStockPurchaseSchema>;

const stockCategories = [
  "Aesthetics stock",
  "Beauty Equipment",
  "Hair Products",
  "Nail Products",
  "Other",
  "Retail Products",
  "Salon Supplies",
  "Skincare Products"
];

const ITEMS_PER_PAGE = 10;

export default function StockBudgetCalculator() {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("3");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Sort / Filter state
  const [dateSortOrder, setDateSortOrder] = useState<"desc" | "asc">("desc"); // newest first by default
  const [alphaSort, setAlphaSort] = useState<"" | "asc" | "desc">("");       // alphabetical override
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Check for session cookie and handle API 401 responses
  useEffect(() => {
    console.log('🔍 Dashboard mounted - checking authentication...');

    const checkSession = async () => {
      try {
        const response = await fetch('/api/v2/auth/user', {
          method: 'GET',
          credentials: 'include',
        });

        console.log('🔍 Auth check response status:', response.status);
        if (response.status === 401) {
          console.log('❌ Session invalid or expired - redirecting to login');

          toast({
            title: "Session Expired",
            description: "Please log in to continue",
            variant: "destructive",
          });

          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);

        } else if (response.ok) {
          const data = await response.json();
          console.log('✅ Session valid for user:', data.email);
        }
      } catch (error) {
        console.error('❌ Error checking session:', error);
      }
    };

    checkSession();
    const intervalId = setInterval(checkSession, 30000);
    return () => clearInterval(intervalId);
  }, [toast]);

  const form = useForm<StockPurchaseForm>({
    resolver: zodResolver(insertStockPurchaseSchema),
    defaultValues: {
      supplier: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      totalAmount: "",
      description: "",
      category: "",
    },
  });

  const { data: stockPurchases = [], isLoading } = useQuery<StockPurchase[]>({
    queryKey: ["/api/stock-purchases"],
    refetchOnWindowFocus: false,
  });

  const createStockPurchaseMutation = useMutation({
    mutationFn: (data: StockPurchaseForm) => {
      console.log("Mutation called with data:", data);
      return apiRequest("POST", "/api/stock-purchases", data);
    },
    onSuccess: () => {
      console.log("Mutation successful");
      queryClient.invalidateQueries({ queryKey: ["/api/stock-purchases"] });
      form.reset();
      toast({
        title: "Stock Purchase Added",
        description: "Your stock purchase has been recorded successfully.",
      });
    },
    onError: (error) => {
      console.log("Mutation error:", error);
      toast({
        title: "Error",
        description: "Failed to add stock purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteStockPurchaseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/stock-purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-purchases"] });
      toast({
        title: "Purchase Deleted",
        description: "Stock purchase has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete stock purchase. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StockPurchaseForm) => {
    let hasError = false;

    if (!data.supplier) {
      form.setError("supplier", { type: "manual", message: "Supplier name is required" });
      hasError = true;
    }
    if (!data.purchaseDate) {
      form.setError("purchaseDate", { type: "manual", message: "Purchase date is required" });
      hasError = true;
    }
    if (!data.totalAmount) {
      form.setError("totalAmount", { type: "manual", message: "Total amount is required" });
      hasError = true;
    }
    if (!data.category) {
      form.setError("category", { type: "manual", message: "Please select a category" });
      hasError = true;
    }

    if (hasError) return;
    createStockPurchaseMutation.mutate(data);
  };

  const handleDelete = (id: number) => {
    deleteStockPurchaseMutation.mutate(id);
  };

  // Calculate budget insights
  const calculateBudgetInsights = () => {
    const months = parseInt(selectedPeriod);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const recentPurchases = (stockPurchases as StockPurchase[]).filter((purchase: StockPurchase) =>
      new Date(purchase.purchaseDate) >= startDate
    );

    const totalSpent = recentPurchases.reduce((sum: number, purchase: StockPurchase) =>
      sum + parseFloat(purchase.totalAmount.toString()), 0
    );

    const monthlyAverage = totalSpent / months;

    const categoryBreakdown = recentPurchases.reduce((acc: Record<string, number>, purchase: StockPurchase) => {
      acc[purchase.category] = (acc[purchase.category] || 0) + parseFloat(purchase.totalAmount.toString());
      return acc;
    }, {});

    const topCategory = Object.entries(categoryBreakdown)
      .sort(([, a], [, b]) => (b as number) - (a as number))[0];

    return {
      totalSpent,
      monthlyAverage,
      categoryBreakdown,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      purchaseCount: recentPurchases.length
    };
  };

  const insights = calculateBudgetInsights();

  // ── Build the filtered + sorted + paginated list ──────────────────────────
  const processedPurchases = (() => {
    let list = [...(stockPurchases as StockPurchase[])];

    // 1. Custom date range filter
    if (customDateFrom) {
      const from = new Date(customDateFrom);
      list = list.filter(p => new Date(p.purchaseDate) >= from);
    }
    if (customDateTo) {
      const to = new Date(customDateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(p => new Date(p.purchaseDate) <= to);
    }

    // 2. Sort — alphabetical takes priority when set, otherwise date
    if (alphaSort === "asc") {
      list.sort((a, b) => a.supplier.localeCompare(b.supplier));
    } else if (alphaSort === "desc") {
      list.sort((a, b) => b.supplier.localeCompare(a.supplier));
    } else {
      // Date sort
      list.sort((a, b) =>
        dateSortOrder === "desc"
          ? new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
          : new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
      );
    }

    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = list.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    return { paginated, total, totalPages, safePage };
  })();

  // Reset to page 1 whenever filters change
  const resetPage = () => setCurrentPage(1);

  const handleDateSort = (order: "asc" | "desc") => {
    setAlphaSort("");
    setDateSortOrder(order);
    resetPage();
  };

  const handleAlphaSort = (order: "asc" | "desc") => {
    setAlphaSort(order);
    resetPage();
  };

  const clearCustomDates = () => {
    setCustomDateFrom("");
    setCustomDateTo("");
    setShowCustomDate(false);
    resetPage();
  };

  const activeCustomDate = customDateFrom || customDateTo;

  return (
    <div className="space-y-8 mb-4">
      <Header
        title="Stock Budget Calculator"
        description="Track your product purchases over 3-6 months to establish accurate monthly stock budgets for better financial planning."
      />

      <TutorialVideoCard
        className="mx-4"
        title="Want help building your stock budget?"
        description="Watch a quick walkthrough on recording product purchases and using your averages to plan a realistic stock budget."
        videoTitle="Stock Budget Calculator Walkthrough"
        embedUrl="https://www.youtube.com/embed/6asFsiRPe4Y?si=AU187b2ukR6oGGE4"
      />

      {/* Budget Insights */}
      <div className="grid gap-4 md:grid-cols-4 mx-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">Last {selectedPeriod} months</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.monthlyAverage)}</div>
            <p className="text-xs text-muted-foreground">Recommended budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.topCategory ? insights.topCategory.name : "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {insights.topCategory ? formatCurrency(insights.topCategory.amount as number) : "No purchases yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.purchaseCount}</div>
            <p className="text-xs text-muted-foreground">Last {selectedPeriod} months</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selection */}
      <Card className="mx-4">
        <CardHeader>
          <CardTitle>Budget Period</CardTitle>
          <CardDescription>
            Select the time period to analyse for your monthly budget calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Add Stock Purchase Form */}
      <Card className="mx-4">
        <CardHeader>
          <CardTitle>Add Stock Purchase</CardTitle>
          <CardDescription>
            Record a new product purchase to track your spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter supplier name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="purchaseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Purchase Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="block w-full"
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none'
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="totalAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stockCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add details about the purchase..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={createStockPurchaseMutation.isPending}
                className="w-full hover-bg-[#FFB6C1] text-white"
              >
                {createStockPurchaseMutation.isPending ? "Adding..." : "Add Purchase"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card className="mx-4">
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>Your recent stock purchases and spending patterns</CardDescription>
        </CardHeader>

        <CardContent>
          {/* ── Filter Controls ─────────────────────────────────────── */}
          <div className="flex flex-col gap-3 mb-5">
            <div className="flex flex-wrap gap-2 items-center">

              {/* Date sort */}
              <Select
                value={alphaSort === "" ? `date-${dateSortOrder}` : ""}
                onValueChange={(v) => {
                  if (v === "date-desc") handleDateSort("desc");
                  if (v === "date-asc") handleDateSort("asc");
                }}
              >
                <SelectTrigger className="w-[170px] h-9 text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-1.5 shrink-0" />
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
                <SelectTrigger className="w-[175px] h-9 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Sort Alphabetically" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alpha-asc">Supplier: A → Z</SelectItem>
                  <SelectItem value="alpha-desc">Supplier: Z → A</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom date range toggle */}
              <Button
                variant={showCustomDate || activeCustomDate ? "default" : "outline"}
                size="sm"
                className="h-9 text-sm px-3"
                onClick={() => setShowCustomDate((v) => !v)}
              >
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Custom Date
                {activeCustomDate && (
                  <span className="ml-1.5 bg-white/20 rounded-full px-1.5 py-0.5 text-xs">✓</span>
                )}
              </Button>

              {/* Clear custom date */}
              {activeCustomDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-sm px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={clearCustomDates}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear Dates
                </Button>
              )}
            </div>

            {/* Custom date range inputs */}
            {showCustomDate && (
              <div className="flex flex-wrap gap-3 items-end p-3 bg-muted/40 rounded-lg border">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">From</label>
                  <Input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => { setCustomDateFrom(e.target.value); resetPage(); }}
                    className="h-8 w-[160px] text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground">To</label>
                  <Input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => { setCustomDateTo(e.target.value); resetPage(); }}
                    className="h-8 w-[160px] text-sm"
                  />
                </div>
                {activeCustomDate && (
                  <div className="text-xs text-muted-foreground pb-1">
                    Showing {processedPurchases.total} result{processedPurchases.total !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* ── /Filter Controls ────────────────────────────────────── */}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : stockPurchases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No stock purchases recorded yet.</p>
              <p className="text-sm">Add your first purchase above to start tracking your spending.</p>
            </div>
          ) : processedPurchases.total === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No purchases match the selected date range.</p>
              <Button variant="link" onClick={clearCustomDates} className="text-sm mt-1">
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {processedPurchases.paginated.map((purchase: StockPurchase) => (
                  <div key={purchase.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{purchase.supplier}</h4>
                        <Badge variant="secondary">{purchase.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(purchase.purchaseDate).toLocaleDateString("en-GB")}
                      </p>
                      {purchase.description && (
                        <p className="text-sm text-muted-foreground mt-1">{purchase.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">
                        {formatCurrency(parseFloat(purchase.totalAmount))}
                      </span>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteStockPurchaseMutation.isPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete this stock purchase from your records.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(purchase.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Yes
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Pagination ─────────────────────────────────────── */}
              {processedPurchases.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    {(processedPurchases.safePage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(processedPurchases.safePage * ITEMS_PER_PAGE, processedPurchases.total)}{" "}
                    of {processedPurchases.total} purchases
                  </p>

                  <div className="flex items-center gap-1">
                    {/* Prev */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={processedPurchases.safePage === 1}
                      className="h-8 px-2.5"
                    >
                      ‹
                    </Button>

                    {/* Page numbers with ellipsis */}
                    {Array.from({ length: processedPurchases.totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === processedPurchases.totalPages ||
                          Math.abs(p - processedPurchases.safePage) <= 1
                      )
                      .reduce<(number | "...")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === "..." ? (
                          <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground text-sm">
                            …
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={processedPurchases.safePage === p ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(p as number)}
                            className="h-8 w-8 p-0 text-xs"
                          >
                            {p}
                          </Button>
                        )
                      )}

                    {/* Next */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(processedPurchases.totalPages, p + 1))
                      }
                      disabled={processedPurchases.safePage === processedPurchases.totalPages}
                      className="h-8 px-2.5"
                    >
                      ›
                    </Button>
                  </div>
                </div>
              )}
              {/* ── /Pagination ────────────────────────────────────── */}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
