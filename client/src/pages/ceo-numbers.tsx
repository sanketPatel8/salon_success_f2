import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfWeek, addDays, isSameWeek, parseISO, addWeeks, subWeeks, startOfMonth, endOfMonth, getMonth, getYear, isSameMonth, subYears } from "date-fns";
import { CalendarDays, Plus, Target, TrendingUp, DollarSign, PiggyBank, Building2, ChevronLeft, ChevronRight, Calendar, ArrowUpDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrency } from "@/contexts/CurrencyContext";
import Header from "@/components/header";
import Paywall from "@/components/paywall";
import type { Business, WeeklyIncome, IncomeGoal, MoneyPot } from "@shared/schema";
import { insertBusinessSchema } from "@shared/schema";

const weeklyIncomeSchema = z.object({
  businessId: z.number(),
  weekStartDate: z.string(),
  weeklyTotal: z.string().default("0"),
});

const incomeGoalSchema = z.object({
  businessId: z.number(),
  goalType: z.enum(["weekly", "monthly", "yearly"]),
  targetAmount: z.string().min(1, "Target amount is required"),
  year: z.number(),
  month: z.number().optional(),
});

type BusinessForm = { name: string; location?: string };
type WeeklyIncomeForm = z.infer<typeof weeklyIncomeSchema>;
type IncomeGoalForm = z.infer<typeof incomeGoalSchema>;

export default function CEONumbers() {
  const { formatCurrency } = useCurrency();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const [selectedBusiness, setSelectedBusiness] = useState<number | "all">("all");
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [viewMode, setViewMode] = useState<"current" | "comparison">("current");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [comparisonYear, setComparisonYear] = useState(new Date().getFullYear() - 1);

  // Data fetching
  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
  });

  const { data: weeklyIncomes = [] } = useQuery<WeeklyIncome[]>({
    queryKey: ["/api/weekly-incomes"],
  });

  const { data: incomeGoals = [] } = useQuery<IncomeGoal[]>({
    queryKey: ["/api/income-goals"],
  });

  const { data: moneyPots = [] } = useQuery<MoneyPot[]>({
    queryKey: ["/api/money-pots"],
  });

  // Mutations
  const createBusinessMutation = useMutation({
    mutationFn: (data: BusinessForm) => apiRequest("POST", "/api/businesses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      setShowBusinessDialog(false);
      businessForm.reset();
    },
  });

  const createIncomeGoalMutation = useMutation({
    mutationFn: (data: IncomeGoalForm) => apiRequest("POST", "/api/income-goals", data),
    onSuccess: () => {
      // Invalidate all income goal queries (both filtered and unfiltered)
      queryClient.invalidateQueries({ queryKey: ["/api/income-goals"] });
      setShowGoalDialog(false);
      goalForm.reset({
        businessId: businesses.length > 0 ? businesses[0].id : undefined,
        goalType: "weekly",
        targetAmount: "",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      });
    },
  });

  const createOrUpdateWeeklyIncomeMutation = useMutation({
    mutationFn: (data: WeeklyIncomeForm) => apiRequest("POST", "/api/weekly-incomes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-incomes"] });
    },
  });

  // Forms
  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Business name is required"),
      location: z.string().optional(),
    })),
    defaultValues: { name: "", location: "" },
  });

  const goalForm = useForm<IncomeGoalForm>({
    resolver: zodResolver(incomeGoalSchema),
    defaultValues: {
      businessId: businesses.length > 0 ? businesses[0].id : undefined,
      goalType: "weekly",
      targetAmount: "",
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
    },
  });

  // Helper functions for calculations
  const getMonthlyTotals = (incomes: WeeklyIncome[], year: number) => {
    const monthlyTotals: { [key: number]: number } = {};
    
    incomes
      .filter(income => {
        const incomeDate = new Date(income.weekStartDate);
        return getYear(incomeDate) === year;
      })
      .forEach(income => {
        const month = getMonth(new Date(income.weekStartDate));
        monthlyTotals[month] = (monthlyTotals[month] || 0) + parseFloat(income.weeklyTotal);
      });
    
    return monthlyTotals;
  };

  const getIncomesByMonthYear = (incomes: WeeklyIncome[], month: number, year: number) => {
    return incomes.filter(income => {
      const incomeDate = new Date(income.weekStartDate);
      return getMonth(incomeDate) === month && getYear(incomeDate) === year;
    });
  };

  // Calculations
  const filteredIncomes = weeklyIncomes.filter(income => 
    selectedBusiness === "all" || income.businessId === selectedBusiness
  );

  const currentWeekIncome = filteredIncomes.find(income => 
    isSameWeek(new Date(income.weekStartDate), currentWeek, { weekStartsOn: 1 })
  );

  const weekTotal = currentWeekIncome ? parseFloat(currentWeekIncome.weeklyTotal) : 0;
  
  // Calculate money pot allocations
  const potAllocations = moneyPots.map(pot => ({
    ...pot,
    amount: (weekTotal * parseFloat((pot.percentage || 0).toString())) / 100
  }));
  
  // Calculate remaining amount after all pot allocations
  const totalAllocatedPercentage = moneyPots.reduce((sum, pot) => sum + parseFloat((pot.percentage || 0).toString()), 0);
  const remainingAmount = weekTotal * ((100 - totalAllocatedPercentage) / 100);

  const currentMonth = new Date();
  const monthTotal = filteredIncomes
    .filter(income => {
      const incomeDate = new Date(income.weekStartDate);
      return incomeDate.getMonth() === currentMonth.getMonth() && 
             incomeDate.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);

  const yearTotal = filteredIncomes
    .filter(income => {
      const incomeDate = new Date(income.weekStartDate);
      return incomeDate.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);

  // Monthly totals for current and comparison years
  const currentYearMonthlyTotals = getMonthlyTotals(filteredIncomes, selectedYear);
  const comparisonYearMonthlyTotals = getMonthlyTotals(filteredIncomes, comparisonYear);

  // Available years for comparison
  const yearSet = new Set<number>();
  weeklyIncomes.forEach(income => {
    yearSet.add(getYear(new Date(income.weekStartDate)));
  });
  const availableYears = Array.from(yearSet).sort((a, b) => b - a);

  // Handlers
  const handleWeeklyIncomeSubmit = (businessId: number, value: string) => {
    if (!value.trim()) return;
    
    createOrUpdateWeeklyIncomeMutation.mutate({
      businessId,
      weekStartDate: format(currentWeek, "yyyy-MM-dd"),
      weeklyTotal: value,
    });
  };

  const handleBusinessSubmit = (data: BusinessForm) => {
    createBusinessMutation.mutate(data);
  };

  const handleGoalSubmit = (data: IncomeGoalForm) => {
    createIncomeGoalMutation.mutate(data);
  };

  // Auto-save current business when switching
  useEffect(() => {
    if (businesses.length === 1 && selectedBusiness === "all") {
      setSelectedBusiness(businesses[0].id);
    }
  }, [businesses, selectedBusiness]);

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <>
        <Header 
          title="CEO Numbers & Money Pots" 
          description="Track weekly income and financial goals across your businesses" 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </>
    );
  }

  // Check subscription status
  if (!(subscriptionStatus as any)?.active) {
    return (
      <>
        <Header 
          title="CEO Numbers & Money Pots" 
          description="Track weekly income and financial goals across your businesses" 
        />
        <Paywall 
          title="CEO Numbers & Money Pots"
          description="Monitor your business performance"
          feature="CEO tracking and financial analytics"
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <Header 
        title="CEO Numbers" 
        description="Track your weekly income, monitor money pots, and manage multiple business locations"
      />

      {/* Business Selection & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="business-select">Business:</Label>
            <Select value={selectedBusiness.toString()} onValueChange={(value) => setSelectedBusiness(value === "all" ? "all" : parseInt(value))}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id.toString()}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Dialog open={showBusinessDialog} onOpenChange={setShowBusinessDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Business
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Business</DialogTitle>
                <DialogDescription>
                  Create a new business location to track separately
                </DialogDescription>
              </DialogHeader>
              <Form {...businessForm}>
                <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-4">
                  <FormField
                    control={businessForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Main Salon" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={businessForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="City Center" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createBusinessMutation.isPending}>
                    {createBusinessMutation.isPending ? "Creating..." : "Create Business"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-3">
            Week of {format(currentWeek, "MMM d, yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
        </div>
      </div>

      {/* Money Pots Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(weekTotal)}</div>
          </CardContent>
        </Card>

        {/* Display custom money pots */}
        {potAllocations.map((pot) => (
          <Card key={pot.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: pot.color || "hsl(var(--primary))" }}
                />
                {pot.name} ({pot.percentage}%)
              </CardTitle>
              <PiggyBank className="h-4 w-4" style={{ color: pot.color || "hsl(var(--primary))" }} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: pot.color || "hsl(var(--primary))" }}>
                {formatCurrency(pot.amount)}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Show remaining amount if there's unallocated percentage */}
        {totalAllocatedPercentage < 100 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Available ({(100 - totalAllocatedPercentage).toFixed(1)}%)
              </CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(remainingAmount)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show link to manage money pots if none exist */}
        {moneyPots.length === 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle className="text-center">No Money Pots Configured</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Create custom money pots to allocate your income (VAT, Profit, Emergency Fund, etc.)
              </p>
              <Button asChild>
                <a href="/money-pots">
                  <Plus className="h-4 w-4 mr-2" />
                  Set Up Money Pots
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Weekly Income Entry - Prominent Section */}
      <Card className="border-2 border-primary bg-gradient-to-r from-pink-50 to-rose-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6 text-primary" />
            Enter This Week's Takings
          </CardTitle>
          <CardDescription className="text-base">
            Week of {format(currentWeek, "MMMM d")} - {format(addDays(currentWeek, 6), "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {businesses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Create a business first to start tracking your weekly income</p>
              <Dialog open={showBusinessDialog} onOpenChange={setShowBusinessDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Business
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : selectedBusiness === "all" ? (
            <div className="space-y-4">
              {businesses.map((business) => {
                const businessIncome = weeklyIncomes.find(income => 
                  income.businessId === business.id && 
                  isSameWeek(new Date(income.weekStartDate), currentWeek, { weekStartsOn: 1 })
                );
                const currentValue = businessIncome?.weeklyTotal || "";
                
                return (
                  <div key={business.id} className="bg-white rounded-lg p-4 border">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      const amount = formData.get(`businessAmount-${business.id}`) as string;
                      if (amount) {
                        handleWeeklyIncomeSubmit(business.id, amount);
                      }
                    }}>
                      <div className="flex items-center gap-4 mb-3">
                        <Label className="w-32 font-semibold text-lg">{business.name}:</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-slate-600">£</span>
                          <Input
                            name={`businessAmount-${business.id}`}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            defaultValue={currentValue}
                            className="text-xl font-bold text-2xl h-12 w-48 text-center border-2"
                            required
                          />
                        </div>
                        <Button type="submit" size="lg" className="h-12 px-6 font-semibold">
                          Enter
                        </Button>
                      </div>
                    </form>
                    {currentValue && (
                      <div className="grid gap-2 text-sm bg-slate-50 rounded p-3" style={{ gridTemplateColumns: `repeat(${Math.max(moneyPots.length, 1)}, 1fr)` }}>
                        {moneyPots.length > 0 ? (
                          <>
                            {moneyPots.map(pot => (
                              <div key={pot.id}>
                                <span style={{ color: pot.color || "hsl(var(--primary))" }} className="font-medium flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pot.color || "hsl(var(--primary))" }} />
                                  {pot.name} ({pot.percentage}%):
                                </span>
                                <span className="font-bold">
                                  {formatCurrency((parseFloat(currentValue) * parseFloat((pot.percentage || 0).toString())) / 100)}
                                </span>
                              </div>
                            ))}
                            {totalAllocatedPercentage < 100 && (
                              <div>
                                <span className="text-primary font-medium">Available ({(100 - totalAllocatedPercentage).toFixed(1)}%): </span>
                                <span className="font-bold">
                                  {formatCurrency(parseFloat(currentValue) * ((100 - totalAllocatedPercentage) / 100))}
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <a href="/money-pots" className="text-primary hover:underline">
                              Set up money pots to see allocation breakdown
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 border text-center">
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const amount = formData.get('weeklyAmount') as string;
                if (amount) {
                  handleWeeklyIncomeSubmit(selectedBusiness as number, amount);
                }
              }}>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Label className="font-semibold text-xl">This Week's Total Takings:</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-slate-600">£</span>
                    <Input
                      name="weeklyAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      defaultValue={currentWeekIncome?.weeklyTotal || ""}
                      className="text-3xl font-bold h-16 w-64 text-center border-2 border-primary"
                      required
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-16 px-8 text-lg font-semibold">
                    Enter
                  </Button>
                </div>
              </form>
              {currentWeekIncome?.weeklyTotal && (
                <div className="grid gap-6 mt-6 bg-slate-50 rounded-lg p-4" style={{ gridTemplateColumns: `repeat(${Math.max(moneyPots.length + (totalAllocatedPercentage < 100 ? 1 : 0), 1)}, 1fr)` }}>
                  {moneyPots.length > 0 ? (
                    <>
                      {moneyPots.map(pot => (
                        <div key={pot.id} className="text-center">
                          <div className="font-semibold mb-1 flex items-center justify-center gap-2" style={{ color: pot.color || "hsl(var(--primary))" }}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pot.color || "hsl(var(--primary))" }} />
                            {pot.name} ({pot.percentage}%)
                          </div>
                          <div className="text-2xl font-bold" style={{ color: pot.color || "hsl(var(--primary))" }}>
                            {formatCurrency((parseFloat(currentWeekIncome.weeklyTotal) * parseFloat(pot.percentage.toString())) / 100)}
                          </div>
                        </div>
                      ))}
                      {totalAllocatedPercentage < 100 && (
                        <div className="text-center">
                          <div className="text-primary font-semibold mb-1">Available ({(100 - totalAllocatedPercentage).toFixed(1)}%)</div>
                          <div className="text-2xl font-bold text-primary">
                            {formatCurrency(parseFloat(currentWeekIncome.weeklyTotal) * ((100 - totalAllocatedPercentage) / 100))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center col-span-full text-muted-foreground">
                      <a href="/money-pots" className="text-primary hover:underline font-semibold">
                        Set up money pots to see allocation breakdown
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical View & Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income Summary</CardTitle>
            <CardDescription>Track your growth over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>This Week:</span>
              <span className="font-bold">{formatCurrency(weekTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>This Month:</span>
              <span className="font-bold">{formatCurrency(monthTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>This Year:</span>
              <span className="font-bold">{formatCurrency(yearTotal)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Weeks</CardTitle>
            <CardDescription>Quick view of past performance</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyIncomes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No historical data yet</p>
            ) : (
              <div className="space-y-3">
                {weeklyIncomes
                  .filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness)
                  .slice(0, 4)
                  .map((income) => {
                    const business = businesses.find(b => b.id === income.businessId);
                    const weekStart = new Date(income.weekStartDate);
                    const weekEnd = addDays(weekStart, 6);
                    
                    return (
                      <div key={income.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <div>
                          <div className="text-sm font-medium">
                            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d")}
                          </div>
                          {selectedBusiness === "all" && business && (
                            <div className="text-xs text-muted-foreground">{business.name}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(parseFloat(income.weeklyTotal))}</div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Spreadsheet with Monthly Totals and Year Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Weekly Income Spreadsheet with Monthly Totals
          </CardTitle>
          <CardDescription>Complete history with monthly summaries and year-over-year comparison</CardDescription>
          
          {/* Year Selection Controls */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Button 
                variant={viewMode === "current" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("current")}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Current Year
              </Button>
              <Button 
                variant={viewMode === "comparison" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("comparison")}
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                Compare Years
              </Button>
            </div>
            
            {viewMode === "comparison" && availableYears.length > 1 && (
              <div className="flex items-center gap-2">
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">vs</span>
                <Select value={comparisonYear.toString()} onValueChange={(value) => setComparisonYear(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.filter(year => year !== selectedYear).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {weeklyIncomes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No weekly income data yet</p>
              <p>Start by entering your weekly takings above to see your spreadsheet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-300">
                    <th className="text-left py-3 px-4 font-semibold border-r border-slate-300">Week Starting</th>
                    <th className="text-left py-3 px-4 font-semibold border-r border-slate-300">Week Ending</th>
                    {selectedBusiness === "all" && <th className="text-left py-3 px-4 font-semibold border-r border-slate-300">Business</th>}
                    <th className="text-right py-3 px-4 font-semibold border-r border-slate-300 bg-blue-50">Total Takings</th>
                    <th className="text-right py-3 px-4 font-semibold border-r border-slate-300 bg-orange-50">VAT/Tax (20%)</th>
                    <th className="text-right py-3 px-4 font-semibold border-r border-slate-300 bg-green-50">Profit Pot (5%)</th>
                    <th className="text-right py-3 px-4 font-semibold bg-blue-50">Available (75%)</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyIncomes
                    .filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness)
                    .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
                    .slice(0, 20)
                    .map((income, index) => {
                      const business = businesses.find(b => b.id === income.businessId);
                      const weekStart = new Date(income.weekStartDate);
                      const weekEnd = addDays(weekStart, 6);
                      const total = parseFloat(income.weeklyTotal);
                      const vatAmount = total * 0.20;
                      const profitAmount = total * 0.05;
                      const availableAmount = total * 0.75;
                      const isCurrentWeek = isSameWeek(weekStart, currentWeek, { weekStartsOn: 1 });
                      
                      return (
                        <tr key={income.id} className={`border-b hover:bg-slate-50 ${isCurrentWeek ? 'bg-blue-50 border-blue-200' : index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                          <td className="py-3 px-4 border-r border-slate-200 font-medium">
                            {format(weekStart, "MMM d, yyyy")}
                            {isCurrentWeek && <Badge className="ml-2 text-xs">Current</Badge>}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200">
                            {format(weekEnd, "MMM d, yyyy")}
                          </td>
                          {selectedBusiness === "all" && (
                            <td className="py-3 px-4 border-r border-slate-200">{business?.name || "Unknown"}</td>
                          )}
                          <td className="text-right py-3 px-4 font-bold border-r border-slate-200 bg-blue-25">
                            {formatCurrency(total)}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold border-r border-slate-200 text-orange-600 bg-orange-25">
                            {formatCurrency(vatAmount)}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold border-r border-slate-200 text-green-600 bg-green-25">
                            {formatCurrency(profitAmount)}
                          </td>
                          <td className="text-right py-3 px-4 font-semibold text-blue-600 bg-blue-25">
                            {formatCurrency(availableAmount)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              
              {/* Monthly Summary Section */}
              {weeklyIncomes.filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness).length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">Monthly Totals & Year Comparison</h3>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-amber-50 border-b-2 border-amber-300">
                          <th className="text-left py-3 px-4 font-semibold border-r border-amber-300">Month</th>
                          <th className="text-right py-3 px-4 font-semibold border-r border-amber-300 bg-blue-50">{selectedYear} Total</th>
                          <th className="text-right py-3 px-4 font-semibold border-r border-amber-300 bg-blue-50">{selectedYear} Available</th>
                          <th className="text-right py-3 px-4 font-semibold border-r border-amber-300 bg-gray-50">{comparisonYear} Total</th>
                          <th className="text-right py-3 px-4 font-semibold bg-green-50">Growth</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({length: 12}, (_, i) => {
                          const monthIndex = i;
                          const currentYearTotal = currentYearMonthlyTotals[monthIndex] || 0;
                          const comparisonYearTotal = comparisonYearMonthlyTotals[monthIndex] || 0;
                          const difference = currentYearTotal - comparisonYearTotal;
                          const growthPercent = comparisonYearTotal > 0 ? ((difference / comparisonYearTotal) * 100) : (currentYearTotal > 0 ? 100 : 0);
                          const availableAmount = currentYearTotal * 0.75;
                          
                          // Only show months with data
                          if (currentYearTotal === 0 && comparisonYearTotal === 0) return null;
                          
                          return (
                            <tr key={monthIndex} className={`border-b hover:bg-slate-50 ${monthIndex % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                              <td className="py-3 px-4 border-r border-slate-200 font-medium">
                                {format(new Date(2025, monthIndex, 1), "MMMM yyyy").replace("2025", selectedYear.toString())}
                              </td>
                              <td className="text-right py-3 px-4 font-bold border-r border-slate-200 bg-blue-25">
                                {formatCurrency(currentYearTotal)}
                              </td>
                              <td className="text-right py-3 px-4 font-bold border-r border-slate-200 text-blue-600 bg-blue-25">
                                {formatCurrency(availableAmount)}
                              </td>
                              <td className="text-right py-3 px-4 font-bold border-r border-slate-200 bg-gray-25">
                                {formatCurrency(comparisonYearTotal)}
                              </td>
                              <td className={`text-right py-3 px-4 font-bold ${growthPercent >= 0 ? 'text-green-600 bg-green-25' : 'text-red-600 bg-red-25'}`}>
                                {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        }).filter(Boolean)}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income Goals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Income Goals</CardTitle>
            <CardDescription>Set and track your targets</CardDescription>
          </div>
          <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Income Goal</DialogTitle>
                <DialogDescription>
                  Set targets for your business growth
                </DialogDescription>
              </DialogHeader>
              <Form {...goalForm}>
                <form onSubmit={goalForm.handleSubmit(handleGoalSubmit)} className="space-y-4">
                  <FormField
                    control={goalForm.control}
                    name="businessId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                          defaultValue={field.value ? field.value.toString() : undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a business" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {businesses.map((business) => (
                              <SelectItem key={business.id} value={business.id.toString()}>
                                {business.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={goalForm.control}
                    name="goalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={goalForm.control}
                    name="targetAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5000.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={createIncomeGoalMutation.isPending}>
                    {createIncomeGoalMutation.isPending ? "Creating..." : "Create Goal"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(() => {
            // Filter goals based on selected business
            const filteredGoals = incomeGoals.filter(goal => {
              if (selectedBusiness === "all") {
                return true; // Show all goals when "all" is selected
              } else {
                return goal.businessId === selectedBusiness; // Show goals for selected business
              }
            });

            if (filteredGoals.length === 0) {
              return (
                <p className="text-muted-foreground text-sm">
                  {selectedBusiness === "all" 
                    ? "No brand-wide goals set yet" 
                    : `No goals set for ${businesses.find(b => b.id === selectedBusiness)?.name || 'this business'} yet`
                  }
                </p>
              );
            }

            return (
              <div className="space-y-3">
                {filteredGoals.slice(0, 3).map((goal) => {
                  // Calculate current amount based on business selection and goal type
                  let currentAmount = 0;
                  
                  if (selectedBusiness === "all") {
                    // For brand-wide goals, use totals across all businesses
                    currentAmount = goal.goalType === "weekly" ? weekTotal :
                                   goal.goalType === "monthly" ? monthTotal : yearTotal;
                  } else {
                    // For business-specific goals, calculate from that business only
                    const businessIncomes = weeklyIncomes.filter(income => income.businessId === selectedBusiness);
                    const currentDate = new Date();
                    
                    if (goal.goalType === "weekly") {
                      const currentWeekIncome = businessIncomes.find(income => 
                        isSameWeek(new Date(income.weekStartDate), currentWeek, { weekStartsOn: 1 })
                      );
                      currentAmount = currentWeekIncome ? parseFloat(currentWeekIncome.weeklyTotal) : 0;
                    } else if (goal.goalType === "monthly") {
                      currentAmount = businessIncomes
                        .filter(income => {
                          const incomeDate = new Date(income.weekStartDate);
                          return incomeDate.getMonth() === currentDate.getMonth() && 
                                 incomeDate.getFullYear() === currentDate.getFullYear();
                        })
                        .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);
                    } else {
                      currentAmount = businessIncomes
                        .filter(income => {
                          const incomeDate = new Date(income.weekStartDate);
                          return incomeDate.getFullYear() === currentDate.getFullYear();
                        })
                        .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);
                    }
                  }

                  const progress = (currentAmount / parseFloat(goal.targetAmount)) * 100;
                  const business = businesses.find(b => b.id === goal.businessId);
                  
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {goal.goalType} goal
                          {business && (
                            <Badge variant="secondary" className="text-xs">
                              {business.name}
                            </Badge>
                          )}
                        </span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all" 
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(currentAmount)}</span>
                        <span>{formatCurrency(parseFloat(goal.targetAmount))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}