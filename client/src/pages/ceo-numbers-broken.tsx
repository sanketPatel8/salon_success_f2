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
import { format, startOfWeek, addDays, isSameWeek, parseISO, addWeeks, subWeeks } from "date-fns";
import { CalendarDays, Plus, Target, TrendingUp, DollarSign, PiggyBank, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/header";
import type { Business, WeeklyIncome, IncomeGoal } from "@shared/schema";

const businessSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  location: z.string().optional(),
});

const weeklyIncomeSchema = z.object({
  businessId: z.number(),
  weekStartDate: z.string(),
  weeklyTotal: z.string().default("0"),
});

const incomeGoalSchema = z.object({
  businessId: z.number().optional(),
  goalType: z.enum(["weekly", "monthly", "yearly"]),
  targetAmount: z.string().min(1, "Target amount is required"),
  year: z.number(),
  month: z.number().optional(),
});

type BusinessForm = z.infer<typeof businessSchema>;
type WeeklyIncomeForm = z.infer<typeof weeklyIncomeSchema>;
type IncomeGoalForm = z.infer<typeof incomeGoalSchema>;

export default function CEONumbers() {
  const [selectedBusiness, setSelectedBusiness] = useState<number | "all">("all");
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showBusinessDialog, setShowBusinessDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  // Queries
  const { data: businesses = [] } = useQuery<Business[]>({
    queryKey: ["/api/businesses"],
  });

  const { data: weeklyIncomes = [] } = useQuery<WeeklyIncome[]>({
    queryKey: ["/api/weekly-incomes", selectedBusiness !== "all" ? selectedBusiness : undefined],
  });

  const { data: incomeGoals = [] } = useQuery<IncomeGoal[]>({
    queryKey: ["/api/income-goals", selectedBusiness !== "all" ? selectedBusiness : undefined],
  });

  // Forms
  const businessForm = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: "",
      location: "",
    },
  });

  const incomeGoalForm = useForm<IncomeGoalForm>({
    resolver: zodResolver(incomeGoalSchema),
    defaultValues: {
      goalType: "weekly",
      targetAmount: "",
      year: new Date().getFullYear(),
    },
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
      incomeGoalForm.reset();
    },
  });

  const saveWeeklyIncomeMutation = useMutation({
    mutationFn: (data: WeeklyIncomeForm) => apiRequest("POST", "/api/weekly-incomes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-incomes"] });
    },
  });

  // Get current week's income for selected business
  const getCurrentWeekIncome = (businessId: number): WeeklyIncome | undefined => {
    return weeklyIncomes.find(income => 
      income.businessId === businessId && 
      isSameWeek(new Date(income.weekStartDate), currentWeek, { weekStartsOn: 1 })
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const filteredIncomes = selectedBusiness === "all" 
      ? weeklyIncomes 
      : weeklyIncomes.filter(income => income.businessId === selectedBusiness);

    const weekTotal = filteredIncomes
      .filter(income => isSameWeek(new Date(income.weekStartDate), currentWeek, { weekStartsOn: 1 }))
      .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);

    const monthTotal = filteredIncomes
      .filter(income => {
        const incomeDate = new Date(income.weekStartDate);
        return incomeDate.getMonth() === currentWeek.getMonth() && 
               incomeDate.getFullYear() === currentWeek.getFullYear();
      })
      .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);

    const yearTotal = filteredIncomes
      .filter(income => new Date(income.weekStartDate).getFullYear() === currentWeek.getFullYear())
      .reduce((sum, income) => sum + parseFloat(income.weeklyTotal), 0);

    return { weekTotal, monthTotal, yearTotal };
  };

  // Save weekly income
  const saveWeeklyIncome = (businessId: number, amount: string) => {
    const weekStartDate = format(currentWeek, "yyyy-MM-dd");

    const incomeData = {
      businessId,
      weekStartDate,
      weeklyTotal: amount,
    };

    saveWeeklyIncomeMutation.mutate(incomeData);
  };

  const { weekTotal, monthTotal, yearTotal } = calculateTotals();
  const vatAmount = weekTotal * 0.20;
  const profitAmount = weekTotal * 0.05;
  const availableAmount = weekTotal - vatAmount - profitAmount;



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
                <form onSubmit={businessForm.handleSubmit((data) => createBusinessMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={businessForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Salon" {...field} />
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
                          <Input placeholder="e.g., City Center" {...field} />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VAT/Tax Pot (20%)</CardTitle>
            <PiggyBank className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(vatAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Pot (5%)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(profitAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available (75%)</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(availableAmount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Income Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Income Entry</CardTitle>
          <CardDescription>
            Enter your daily takings for each business. Money pots are calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {businesses.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No businesses found. Add your first business to get started.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {(selectedBusiness === "all" ? businesses : businesses.filter(b => b.id === selectedBusiness)).map((business) => {
                const weekIncome = getCurrentWeekIncome(business.id);
                const currentAmount = weekIncome?.weeklyTotal || "0";
                
                return (
                  <div key={business.id} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{business.name}</h3>
                      {business.location && (
                        <Badge variant="secondary">{business.location}</Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor={`weekly-${business.id}`}>
                        Weekly Total for {format(currentWeek, "MMM d")} - {format(addDays(currentWeek, 6), "MMM d, yyyy")}
                      </Label>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm text-muted-foreground">£</span>
                        <Input
                          id={`weekly-${business.id}`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={currentAmount}
                          onChange={(e) => {
                            const value = e.target.value;
                            saveWeeklyIncome(business.id, value);
                          }}
                          className="flex-1 text-lg font-medium"
                        />
                      </div>
                      
                      {weekIncome && parseFloat(weekIncome.weeklyTotal) > 0 && (
                        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-orange-600 font-semibold">VAT/Tax (20%)</div>
                              <div className="text-lg">{formatCurrency(parseFloat(weekIncome.vatAmount))}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-green-600 font-semibold">Profit (5%)</div>
                              <div className="text-lg">{formatCurrency(parseFloat(weekIncome.profitAmount))}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600 font-semibold">Available (75%)</div>
                              <div className="text-lg">{formatCurrency(parseFloat(weekIncome.weeklyTotal) * 0.75)}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {selectedBusiness !== "all" && businesses.indexOf(business) < businesses.length - 1 && (
                      <Separator />
                    )}
                  </div>
                );
              })}
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
                          <div className="text-xs text-muted-foreground">
                            Tax: {formatCurrency(parseFloat(income.vatAmount))} | 
                            Profit: {formatCurrency(parseFloat(income.profitAmount))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Historical Table */}
      {weeklyIncomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historical Performance</CardTitle>
            <CardDescription>Complete view of all weekly takings and money pots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Week</th>
                    {selectedBusiness === "all" && <th className="text-left py-2">Business</th>}
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">VAT/Tax (20%)</th>
                    <th className="text-right py-2">Profit (5%)</th>
                    <th className="text-right py-2">Available (75%)</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyIncomes
                    .filter(income => selectedBusiness === "all" || income.businessId === selectedBusiness)
                    .slice(0, 10)
                    .map((income) => {
                      const business = businesses.find(b => b.id === income.businessId);
                      const weekStart = new Date(income.weekStartDate);
                      const weekEnd = addDays(weekStart, 6);
                      const total = parseFloat(income.weeklyTotal);
                      const available = total * 0.75;
                      
                      return (
                        <tr key={income.id} className="border-b hover:bg-slate-50">
                          <td className="py-2">
                            {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                          </td>
                          {selectedBusiness === "all" && (
                            <td className="py-2">{business?.name || "Unknown"}</td>
                          )}
                          <td className="text-right py-2 font-medium">
                            {formatCurrency(total)}
                          </td>
                          <td className="text-right py-2 text-orange-600">
                            {formatCurrency(parseFloat(income.vatAmount))}
                          </td>
                          <td className="text-right py-2 text-green-600">
                            {formatCurrency(parseFloat(income.profitAmount))}
                          </td>
                          <td className="text-right py-2 text-blue-600">
                            {formatCurrency(available)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <Target className="h-4 w-4 mr-2" />
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
                <Form {...incomeGoalForm}>
                  <form onSubmit={incomeGoalForm.handleSubmit((data) => createIncomeGoalMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={incomeGoalForm.control}
                      name="businessId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business (Optional)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="All businesses" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">All Businesses</SelectItem>
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
                      control={incomeGoalForm.control}
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
                      control={incomeGoalForm.control}
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
            {incomeGoals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No goals set yet</p>
            ) : (
              <div className="space-y-3">
                {incomeGoals.slice(0, 3).map((goal) => {
                  const currentAmount = goal.goalType === "weekly" ? weekTotal :
                                      goal.goalType === "monthly" ? monthTotal : yearTotal;
                  const progress = (currentAmount / parseFloat(goal.targetAmount)) * 100;
                  
                  return (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{goal.goalType} goal</span>
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
            )}
          </CardContent>
        </Card>
      </div>
    
  );
}