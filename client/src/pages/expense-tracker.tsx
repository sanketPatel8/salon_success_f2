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
import { Receipt, Plus, Trash2, Calendar, ChevronDown, ChevronRight } from "lucide-react";
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
  "Spending on me (opps)",
  "Training & Education",
  "Travel & Transportation",
  "Wages"
];

export default function ExpenseTracker() {
  const { formatCurrency, formatSymbol } = useCurrency();
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const { toast } = useToast();

  // Check for session cookie and handle API 401 responses
    useEffect(() => {
      console.log('🔍 Dashboard mounted - checking authentication...');
      
      const checkSession = async () => {
        try {
          // Make an API call to verify session is valid
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
            
            // Wait 2 seconds before redirecting so toast is visible
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
  
      // Check immediately on mount
      checkSession();
      
      // Set up periodic check every 30 seconds
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
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/expenses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      form.reset({
        category: "",
        description: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
      });
      toast({
        title: "Success",
        description: "Expense added successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      setExpenseToDelete(null);
      toast({
        title: "Success",
        description: "Expense deleted successfully!",
      });
    },
    onError: () => {
      setExpenseToDelete(null);
      toast({
        title: "Error",
        description: "Failed to delete expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleConfirmDelete = () => {
    if (expenseToDelete) {
      deleteExpenseMutation.mutate(expenseToDelete);
    }
  };

  const onSubmit = (data: ExpenseForm) => {
    createExpenseMutation.mutate(data);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  // Group expenses by month
  const expensesByMonth = Array.isArray(expenses) ? expenses.reduce((acc: Record<string, {
    monthName: string;
    total: number;
    expenses: any[];
    categories: Record<string, number>;
  }>, expense: any) => {
    const date = new Date(expense.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        monthName,
        total: 0,
        expenses: [],
        categories: {}
      };
    }
    
    const amount = parseFloat(expense.amount.toString());
    acc[monthKey].total += amount;
    acc[monthKey].expenses.push(expense);
    acc[monthKey].categories[expense.category] = (acc[monthKey].categories[expense.category] || 0) + amount;
    
    return acc;
  }, {}) : {};

  // Sort months by date (most recent first)
  const sortedMonths = Object.entries(expensesByMonth).sort(([a], [b]) => b.localeCompare(a));

  const currentYear = new Date().getFullYear();
  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum: number, expense: any) => {
    const expenseYear = new Date(expense.date).getFullYear();
    return expenseYear === currentYear ? sum + parseFloat(expense.amount.toString()) : sum;
  }, 0) : 0;

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <>
        <Header 
          title="Expense Tracker" 
          description="Track and categorize your business expenses" 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </>
    );
  }

  // Check subscription status
  // if (!(subscriptionStatus as any)?.active) {
  //   return (
  //     <>
  //       <Header 
  //         title="Expense Tracker" 
  //         description="Track and categorize your business expenses" 
  //       />
  //       <Paywall 
  //         title="Expense Tracker"
  //         description="Monitor and control your business costs"
  //         feature="expense tracking and categorization"
  //       />
  //     </>
  //   );
  // }

  return (
    <>
      <Header 
        title="Expense Tracker" 
        description="Track and categorise your business expenses to understand your costs" 
      />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Expense Form */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Add Expense</h3>
                  <p className="text-slate-600 text-sm mt-1">Record a new business expense</p>
                </div>
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
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
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

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Office rent for January"
                          />
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
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-8"
                            />
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

          {/* Monthly Expense Summary */}
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
                              {expandedMonths.has(monthKey) ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
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
                            {Object.entries(monthData.categories).map(([category, amount]) => (
                              <div key={category} className="flex justify-between items-center py-2 px-3 bg-white rounded border-l-4 border-primary/20">
                                <span className="text-sm text-slate-700">{category}</span>
                                <span className="text-sm font-semibold text-slate-800">{formatCurrency(amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      No expenses recorded yet
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Expenses */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Expenses List</h3>
                  <p className="text-slate-600 text-sm mt-1">List of Expenses</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="text-purple-600 h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading expenses...</div>
                ) : expenses?.length ? (
                  expenses
                    .slice()
                    .sort((a, b) => a.description.localeCompare(b.description))
                    .slice(0, 10)
                    .map((expense) => (
                    <div key={expense.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{expense.description}</p>
                          <p className="text-sm text-slate-600">{expense.category}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(expense.date).toLocaleDateString()}
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
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No expenses recorded yet. Add your first expense!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
