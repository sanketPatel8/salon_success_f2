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
  
  // Local state for input values to prevent blinking
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-incomes"] });
      // Keep the input value after successful submission
      const key = `${variables.businessId}-${variables.weekStartDate}`;
      setInputValues(prev => ({ ...prev, [key]: variables.weeklyTotal }));
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
    
    const weekStartDate = format(currentWeek, "yyyy-MM-dd");
    const key = `${businessId}-${weekStartDate}`;
    
    // Optimistically update the input value
    setInputValues(prev => ({ ...prev, [key]: value }));
    
    createOrUpdateWeeklyIncomeMutation.mutate({
      businessId,
      weekStartDate,
      weeklyTotal: value,
    });
  };

  const handleInputChange = (businessId: number, value: string) => {
    const weekStartDate = format(currentWeek, "yyyy-MM-dd");
    const key = `${businessId}-${weekStartDate}`;
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  const handleBusinessSubmit = (data: BusinessForm) => {
    createBusinessMutation.mutate(data);
  };

  const handleGoalSubmit = (data: IncomeGoalForm) => {
    createIncomeGoalMutation.mutate(data);
  };

  // Initialize input values from existing data
  useEffect(() => {
    const newInputValues: { [key: string]: string } = {};
    weeklyIncomes.forEach(income => {
      const key = `${income.businessId}-${income.weekStartDate}`;
      if (!inputValues[key]) {
        newInputValues[key] = income.weeklyTotal;
      }
    });
    if (Object.keys(newInputValues).length > 0) {
      setInputValues(prev => ({ ...prev, ...newInputValues }));
    }
  }, [weeklyIncomes]);

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

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 mb-4">
      <Header 
        title="CEO Numbers" 
        description="Track your weekly income, monitor money pots, and manage multiple business locations"
      />

      {/* Business Selection & Controls */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <Label htmlFor="business-select" className="whitespace-nowrap text-sm">Business:</Label>
            <Select value={selectedBusiness.toString()} onValueChange={(value) => setSelectedBusiness(value === "all" ? "all" : parseInt(value))}>
              <SelectTrigger className="flex-1 sm:w-48">
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
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Business
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
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
                  <Button type="submit" disabled={createBusinessMutation.isPending} className="w-full">
                    {createBusinessMutation.isPending ? "Creating..." : "Create Business"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs sm:text-sm font-medium px-2 sm:px-3 text-center">
            {format(currentWeek, "d MMM, yyyy")}
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Week Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{formatCurrency(weekTotal)}</div>
          </CardContent>
        </Card>

        {/* Display custom money pots */}
        {potAllocations.map((pot) => (
          <Card key={pot.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
                <div 
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: pot.color || "hsl(var(--primary))" }}
                />
                <span className="truncate">{pot.name} ({pot.percentage}%)</span>
              </CardTitle>
              <PiggyBank className="h-4 w-4 flex-shrink-0" style={{ color: pot.color || "hsl(var(--primary))" }} />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold" style={{ color: pot.color || "hsl(var(--primary))" }}>
                {formatCurrency(pot.amount)}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Show remaining amount if there's unallocated percentage */}
        {totalAllocatedPercentage < 100 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Available ({(100 - totalAllocatedPercentage).toFixed(1)}%)
              </CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-primary">
                {formatCurrency(remainingAmount)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show link to manage money pots if none exist */}
        {moneyPots.length === 0 && (
          <Card className="col-span-2 lg:col-span-full">
            <CardHeader>
              <CardTitle className="text-center text-sm sm:text-base">No Money Pots Configured</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Create custom money pots to allocate your income (VAT, Profit, Emergency Fund, etc.)
              </p>
              <Button asChild size="sm">
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
          <CardTitle className="flex items-center gap-2 text-base sm:text-xl">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Enter This Week's Takings
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {format(currentWeek, "d MMM")} - {format(addDays(currentWeek, 6), "d MMM, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {businesses.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <p className="text-sm sm:text-base text-muted-foreground mb-4">Create a business first to start tracking your weekly income</p>
              <Dialog open={showBusinessDialog} onOpenChange={setShowBusinessDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Business
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : selectedBusiness === "all" ? (
            <div className="space-y-3 sm:space-y-4">
              {businesses.map((business) => {
                const weekStartDate = format(currentWeek, "yyyy-MM-dd");
                const key = `${business.id}-${weekStartDate}`;
                const currentValue = inputValues[key] || "";
                
                return (
                  <div key={business.id} className="bg-white rounded-lg p-3 sm:p-4 border">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const value = inputValues[key];
                      if (value) {
                        handleWeeklyIncomeSubmit(business.id, value);
                      }
                    }}>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-3">
                        <Label className="font-semibold text-base sm:text-lg">{business.name}:</Label>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-lg sm:text-xl font-bold text-slate-600">£</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={currentValue}
                            onChange={(e) => handleInputChange(business.id, e.target.value)}
                            className="text-lg sm:text-xl font-bold h-10 sm:h-12 flex-1 sm:w-48 text-center border-2"
                          />
                        </div>
                        <Button type="submit" size="sm" className="w-full sm:w-auto h-10 sm:h-12 sm:px-6 font-semibold">
                          Enter
                        </Button>
                      </div>
                    </form>
                    {currentValue && (
                      <div className="grid gap-2 text-xs sm:text-sm bg-slate-50 rounded p-2 sm:p-3" style={{ gridTemplateColumns: `repeat(${Math.min(moneyPots.length + (totalAllocatedPercentage < 100 ? 1 : 0), 2)}, 1fr)` }}>
                        {moneyPots.length > 0 ? (
                          <>
                            {moneyPots.map(pot => (
                              <div key={pot.id}>
                                <span style={{ color: pot.color || "hsl(var(--primary))" }} className="font-medium flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color || "hsl(var(--primary))" }} />
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
                          <div className="text-center text-muted-foreground col-span-full">
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
            <div className="bg-white rounded-lg p-4 sm:p-6 border">
              <form onSubmit={(e) => {
                e.preventDefault();
                const weekStartDate = format(currentWeek, "yyyy-MM-dd");
                const key = `${selectedBusiness}-${weekStartDate}`;
                const value = inputValues[key];
                if (value) {
                  handleWeeklyIncomeSubmit(selectedBusiness as number, value);
                }
              }}>
                <div className="flex flex-col gap-3 sm:gap-4 mb-4">
                  <Label className="font-semibold text-base sm:text-xl text-center">This Week's Total Takings:</Label>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-600">£</span>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={inputValues[`${selectedBusiness}-${format(currentWeek, "yyyy-MM-dd")}`] || ""}
                      onChange={(e) => handleInputChange(selectedBusiness as number, e.target.value)}
                      className="text-2xl sm:text-3xl font-bold h-12 sm:h-16 w-full max-w-xs text-center border-2 border-primary"
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full h-12 sm:h-16 text-base sm:text-lg font-semibold">
                    Enter
                  </Button>
                </div>
              </form>
              {inputValues[`${selectedBusiness}-${format(currentWeek, "yyyy-MM-dd")}`] && (
                <div className="grid gap-3 sm:gap-6 mt-4 sm:mt-6 bg-slate-50 rounded-lg p-3 sm:p-4" style={{ gridTemplateColumns: `repeat(${Math.min(moneyPots.length + (totalAllocatedPercentage < 100 ? 1 : 0), 2)}, 1fr)` }}>
                  {moneyPots.length > 0 ? (
                    <>
                      {moneyPots.map(pot => {
                        const currentValue = inputValues[`${selectedBusiness}-${format(currentWeek, "yyyy-MM-dd")}`] || "0";
                        return (
                          <div key={pot.id} className="text-center">
                            <div className="font-semibold text-xs sm:text-sm mb-1 flex items-center justify-center gap-1 sm:gap-2" style={{ color: pot.color || "hsl(var(--primary))" }}>
                              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pot.color || "hsl(var(--primary))" }} />
                              <span>{pot.name} ({pot.percentage}%)</span>
                            </div>
                            <div className="text-lg sm:text-2xl font-bold" style={{ color: pot.color || "hsl(var(--primary))" }}>
                              {formatCurrency((parseFloat(currentValue) * parseFloat(pot.percentage.toString())) / 100)}
                            </div>
                          </div>
                        );
                      })}
                      {totalAllocatedPercentage < 100 && (
                        <div className="text-center">
                          <div className="text-primary font-semibold text-xs sm:text-sm mb-1">Available ({(100 - totalAllocatedPercentage).toFixed(1)}%)</div>
                          <div className="text-lg sm:text-2xl font-bold text-primary">
                            {formatCurrency(parseFloat(inputValues[`${selectedBusiness}-${format(currentWeek, "yyyy-MM-dd")}`] || "0") * ((100 - totalAllocatedPercentage) / 100))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center col-span-full text-xs sm:text-sm text-muted-foreground">
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
            <CardTitle className="text-base sm:text-lg">Income Summary</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Track your growth over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 text-sm sm:text-base">
            <div className="flex justify-between">
              <span>Selected Week:</span>
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
            <CardTitle className="text-base sm:text-lg">Recent Weeks</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Quick view of past performance</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyIncomes.length === 0 ? (
              <p className="text-muted-foreground text-xs sm:text-sm">No historical data yet</p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {weeklyIncomes
                  .filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness)
                  .slice(0, 4)
                  .map((income) => {
                    const business = businesses.find(b => b.id === income.businessId);
                    const weekStart = new Date(income.weekStartDate);
                    const weekEnd = addDays(weekStart, 6);
                    
                    return (
                      <div key={income.id} className="flex justify-between items-center py-2 border-b last:border-b-0 text-xs sm:text-sm">
                        <div>
                          <div className="font-medium">
                            {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM")}
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
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
            Weekly Income Spreadsheet
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Complete history with monthly summaries and year-over-year comparison</CardDescription>
          
          {/* Year Selection Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mt-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant={viewMode === "current" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("current")}
                className="flex-1 sm:flex-none"
              >
                <Calendar className="h-4 w-4 mr-1" />
                <span className="text-xs sm:text-sm">Current Year</span>
              </Button>
              <Button 
                variant={viewMode === "comparison" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("comparison")}
                className="flex-1 sm:flex-none"
              >
                <ArrowUpDown className="h-4 w-4 mr-1" />
                <span className="text-xs sm:text-sm">Compare Years</span>
              </Button>
            </div>
            
            {viewMode === "comparison" && availableYears.length > 1 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-20 sm:w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs sm:text-sm text-muted-foreground">vs</span>
                <Select value={comparisonYear.toString()} onValueChange={(value) => setComparisonYear(parseInt(value))}>
                  <SelectTrigger className="w-20 sm:w-24">
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
            <div className="text-center py-8 sm:py-12 text-muted-foreground">
              <CalendarDays className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-lg mb-2">No weekly income data yet</p>
              <p className="text-xs sm:text-base">Start by entering your weekly takings above to see your spreadsheet</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Mobile Card View */}
              <div className="block sm:hidden space-y-3">
                {weeklyIncomes
                  .filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness)
                  .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
                  .slice(0, 20)
                  .map((income) => {
                    const business = businesses.find(b => b.id === income.businessId);
                    const weekStart = new Date(income.weekStartDate);
                    const weekEnd = addDays(weekStart, 6);
                    const total = parseFloat(income.weeklyTotal);
                    const vatAmount = total * 0.20;
                    const profitAmount = total * 0.05;
                    const availableAmount = total * 0.75;
                    const isCurrentWeek = isSameWeek(weekStart, currentWeek, { weekStartsOn: 1 });
                    
                    return (
                      <Card key={income.id} className={isCurrentWeek ? 'bg-blue-50 border-blue-200' : ''}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-sm">
                                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                              </div>
                              {selectedBusiness === "all" && business && (
                                <div className="text-xs text-muted-foreground">{business.name}</div>
                              )}
                            </div>
                            {isCurrentWeek && <Badge className="text-xs">Current</Badge>}
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <div className="text-muted-foreground">Total Takings</div>
                              <div className="font-bold text-blue-600">{formatCurrency(total)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">VAT/Tax (20%)</div>
                              <div className="font-semibold text-orange-600">{formatCurrency(vatAmount)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Profit Pot (5%)</div>
                              <div className="font-semibold text-green-600">{formatCurrency(profitAmount)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Available (75%)</div>
                              <div className="font-semibold text-blue-600">{formatCurrency(availableAmount)}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
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
                              {format(weekStart, "d MMM, yyyy")}
                              {isCurrentWeek && <Badge className="ml-2 text-xs">Current</Badge>}
                            </td>
                            <td className="py-3 px-4 border-r border-slate-200">
                              {format(weekEnd, "d MMM, yyyy")}
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
              </div>
              
              {/* Monthly Summary Section */}
              {weeklyIncomes.filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness).length > 0 && (
                <div className="mt-6 sm:mt-8 space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                    <h3 className="font-semibold text-base sm:text-lg">Monthly Totals & Year Comparison</h3>
                  </div>
                  
                  {/* Mobile Card View for Monthly Totals */}
                  <div className="block sm:hidden space-y-3">
                    {Array.from({length: 12}, (_, i) => {
                      const monthIndex = i;
                      const currentYearTotal = currentYearMonthlyTotals[monthIndex] || 0;
                      const comparisonYearTotal = comparisonYearMonthlyTotals[monthIndex] || 0;
                      const difference = currentYearTotal - comparisonYearTotal;
                      const growthPercent = comparisonYearTotal > 0 ? ((difference / comparisonYearTotal) * 100) : (currentYearTotal > 0 ? 100 : 0);
                      const availableAmount = currentYearTotal * 0.75;
                      
                      // Determine which year to show based on which has data
                      let displayYear = selectedYear;
                      if (currentYearTotal > 0) {
                        displayYear = selectedYear;
                      } else if (comparisonYearTotal > 0) {
                        displayYear = comparisonYear;
                      }
                      
                      if (currentYearTotal === 0 && comparisonYearTotal === 0) return null;
                      
                      return (
                        <Card key={monthIndex}>
                          <CardContent className="p-3 space-y-2">
                            <div className="font-semibold text-sm">
                              {format(new Date(displayYear, monthIndex, 1), "MMMM yyyy")}
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <div className="text-muted-foreground">Total</div>
                                <div className="font-bold text-blue-600">{formatCurrency(currentYearTotal)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Available</div>
                                <div className="font-bold text-blue-600">{formatCurrency(availableAmount)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">{comparisonYear} Total</div>
                                <div className="font-bold">{formatCurrency(comparisonYearTotal)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Growth</div>
                                <div className={`font-bold ${growthPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }).filter(Boolean)}
                  </div>

                  {/* Desktop Table View for Monthly Totals */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-amber-50 border-b-2 border-amber-300">
                          <th className="text-left py-3 px-4 font-semibold border-r border-amber-300">Month</th>
                          <th className="text-right py-3 px-4 font-semibold border-r border-amber-300 bg-blue-50">Total</th>
                          <th className="text-right py-3 px-4 font-semibold border-r border-amber-300 bg-blue-50">Available</th>
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
                          
                          // Determine which year to show based on which has data
                          let displayYear = selectedYear;
                          if (currentYearTotal > 0) {
                            displayYear = selectedYear;
                          } else if (comparisonYearTotal > 0) {
                            displayYear = comparisonYear;
                          }
                          
                          if (currentYearTotal === 0 && comparisonYearTotal === 0) return null;
                          
                          return (
                            <tr key={monthIndex} className={`border-b hover:bg-slate-50 ${monthIndex % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                              <td className="py-3 px-4 border-r border-slate-200 font-medium">
                                {format(new Date(displayYear, monthIndex, 1), "MMMM yyyy")}
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
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle className="text-base sm:text-lg">Income Goals</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Set and track your targets</CardDescription>
          </div>
          <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
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
                  <Button type="submit" disabled={createIncomeGoalMutation.isPending} className="w-full">
                    {createIncomeGoalMutation.isPending ? "Creating..." : "Create Goal"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredGoals = incomeGoals.filter(goal => {
              if (selectedBusiness === "all") {
                return true;
              } else {
                return goal.businessId === selectedBusiness;
              }
            });

            if (filteredGoals.length === 0) {
              return (
                <p className="text-muted-foreground text-xs sm:text-sm">
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
                  let currentAmount = 0;
                  
                  if (selectedBusiness === "all") {
                    currentAmount = goal.goalType === "weekly" ? weekTotal :
                                   goal.goalType === "monthly" ? monthTotal : yearTotal;
                  } else {
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
                      <div className="flex justify-between text-xs sm:text-sm">
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