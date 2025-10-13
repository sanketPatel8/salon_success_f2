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
import { Trash2, Calendar, TrendingUp, Package, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import Paywall from "@/components/paywall";

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

export default function StockBudgetCalculator() {
  const { formatCurrency } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPeriod, setSelectedPeriod] = useState("3");

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

  

 

  const form = useForm<StockPurchaseForm>({
    resolver: zodResolver(insertStockPurchaseSchema),
    defaultValues: {
      supplier: "",
      purchaseDate: "",
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
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    return {
      totalSpent,
      monthlyAverage,
      categoryBreakdown,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
      purchaseCount: recentPurchases.length
    };
  };

  const insights = calculateBudgetInsights();

  

  

  return (
    <div className="space-y-8 mb-4">
      <Header
        title="Stock Budget Calculator"
        description="Track your product purchases over 3-6 months to establish accurate monthly stock budgets for better financial planning."
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
            <p className="text-xs text-muted-foreground">
              Last {selectedPeriod} months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Average</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.monthlyAverage)}</div>
            <p className="text-xs text-muted-foreground">
              Recommended budget
            </p>
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
              {insights.topCategory ? formatCurrency(insights.topCategory.amount) : "No purchases yet"}
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
            <p className="text-xs text-muted-foreground">
              Last {selectedPeriod} months
            </p>
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
                        <Input type="date" {...field} />
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
                      <FormLabel>Total Amount </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                        />
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
                className="w-full hover-bg-[#FFB6C1]"
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
          <CardDescription>
            Your recent stock purchases and spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          ) : (
            <div className="space-y-4 ">
              {stockPurchases.slice(0, 10).map((purchase: StockPurchase) => (
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
                      <p className="text-sm text-muted-foreground mt-1">
                        {purchase.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {formatCurrency(parseFloat(purchase.totalAmount))}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(purchase.id)}
                      disabled={deleteStockPurchaseMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}