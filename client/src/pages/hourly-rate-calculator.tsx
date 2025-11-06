import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Header from "@/components/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateHourlyRate } from "@/lib/utils";
import { Save, Calculator, Clock, History } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Paywall from "@/components/paywall";

const simpleCalculatorSchema = z.object({
  monthlyExpenses: z.string().min(1, "Monthly expenses is required"),
  weeklyHours: z.string().min(1, "Weekly hours is required"),
});

const advancedCalculatorSchema = z.object({
  monthlyExpenses: z.string().min(1, "Monthly expenses is required"),
  desiredProfit: z.string().min(1, "Desired profit is required"),
  weeklyHours: z.string().min(1, "Weekly hours is required"),
  taxRate: z.string().min(1, "Tax rate is required"),
  staffCount: z.string().optional(),
});

type SimpleCalculatorForm = z.infer<typeof simpleCalculatorSchema>;
type AdvancedCalculatorForm = z.infer<typeof advancedCalculatorSchema>;

export default function HourlyRateCalculator() {
  const { formatCurrency, formatSymbol } = useCurrency();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  // Fetch calculation history
  const { data: calculationHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/hourly-rate-calculations"],
    enabled: !subscriptionLoading && subscriptionStatus?.active !== false,
  });

  const [calculatedResults, setCalculatedResults] = useState<{
    hourlyRate: number;
    staffTargetPerPerson: number | null;
  }>({ hourlyRate: 0, staffTargetPerPerson: null });

  const [simpleResults, setSimpleResults] = useState<number>(0);
  
  const { toast } = useToast();

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

  const parseNumberInput = (value: string): number => {
    const cleanValue = value.replace(/,/g, '').replace(/[^0-9.-]/g, '');
    return parseFloat(cleanValue) || 0;
  };

  const formatNumberWithCommas = (value: string): string => {
    let cleaned = value.replace(/[^0-9.,]/g, '');
    
    cleaned = cleaned.replace(/,/g, '');
    
    const parts = cleaned.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    if (integerPart.length > 3) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    return decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;
  };

  const validatePercentageInput = (value: string): string => {
    let cleaned = value.replace(/[^0-9.]/g, '');
    
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    if (cleaned.includes('.')) {
      const [integerPart, decimalPart] = cleaned.split('.');
      const limitedInteger = integerPart.slice(0, 3);
      const limitedDecimal = decimalPart.slice(0, 1);
      cleaned = limitedInteger + '.' + limitedDecimal;
    } else {
      cleaned = cleaned.slice(0, 4);
    }
    
    return cleaned;
  };

  // Simple Calculator Form
  const simpleForm = useForm<SimpleCalculatorForm>({
    resolver: zodResolver(simpleCalculatorSchema),
    defaultValues: {
      monthlyExpenses: "",
      weeklyHours: "",
    },
  });

  // Advanced Calculator Form
  const advancedForm = useForm<AdvancedCalculatorForm>({
    resolver: zodResolver(advancedCalculatorSchema),
    defaultValues: {
      monthlyExpenses: "",
      desiredProfit: "30",
      weeklyHours: "",
      taxRate: "25",
      staffCount: "",
    },
  });

  const saveCalculationMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/hourly-rate-calculations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hourly-rate-calculations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Success",
        description: "Hourly rate calculation saved successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save calculation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateSimpleRate = (monthlyExpenses: string, weeklyHours: string) => {
    const expenses = parseNumberInput(monthlyExpenses);
    const hours = parseNumberInput(weeklyHours) || 40;
    
    if (expenses && hours) {
      const monthlyHours = hours * 4.33;
      const rate = expenses / monthlyHours;
      setSimpleResults(rate);
    } else {
      setSimpleResults(0);
    }
  };

  const calculateAdvancedRate = (monthlyExpenses: string, desiredProfit: string, weeklyHours: string, taxRate: string, staffCount: string) => {
    const expenses = parseNumberInput(monthlyExpenses);
    const profit = parseNumberInput(desiredProfit);
    const hours = parseNumberInput(weeklyHours) || 40;
    const tax = parseNumberInput(taxRate);
    const staff = parseNumberInput(staffCount || "0");

    if (expenses && hours) {
      const results = calculateHourlyRate(expenses, profit, hours, tax, staff);
      setCalculatedResults(results);
    } else {
      setCalculatedResults({ hourlyRate: 0, staffTargetPerPerson: null });
    }
  };

  const onSimpleSubmit = (data: SimpleCalculatorForm) => {
    const calculationData = {
      monthlyExpenses: parseNumberInput(data.monthlyExpenses).toString(),
      desiredProfit: "0",
      weeklyHours: Math.round(parseNumberInput(data.weeklyHours)),
      taxRate: "0",
      staffCount: 0,
      calculatedRate: simpleResults.toString(),
      staffTargetPerPerson: null,
    };

    saveCalculationMutation.mutate(calculationData);
  };

  const onAdvancedSubmit = (data: AdvancedCalculatorForm) => {
    const calculationData = {
      monthlyExpenses: parseNumberInput(data.monthlyExpenses).toString(),
      desiredProfit: parseNumberInput(data.desiredProfit).toString(),
      weeklyHours: Math.round(parseNumberInput(data.weeklyHours)),
      taxRate: parseNumberInput(data.taxRate).toString(),
      staffCount: Math.round(parseNumberInput(data.staffCount || "0")),
      calculatedRate: calculatedResults.hourlyRate.toString(),
      staffTargetPerPerson: calculatedResults.staffTargetPerPerson?.toString() || null,
    };

    saveCalculationMutation.mutate(calculationData);
  };

  return (
    <>
      <Header 
        title="Hourly Rate Calculator" 
        description="Calculate your optimal hourly rate based on expenses and profit goals" 
      />
      
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Side - Simple Calculator */}
            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Save your Hourly Rate</h3>
                    <p className="text-slate-600 text-sm mt-1">Calculate based on expenses and working hours</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center hidden md:flex">
                    <Calculator className="text-primary h-5 w-5" />
                  </div>
                </div>

                <Form {...simpleForm}>
                  <form onSubmit={simpleForm.handleSubmit(onSimpleSubmit)} className="space-y-4">
                    <FormField
                      control={simpleForm.control}
                      name="monthlyExpenses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Expenses</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">{formatSymbol()}</span>
                              <Input
                                {...field}
                                type="text"
                                placeholder="0"
                                className="pl-8"
                                onChange={(e) => {
                                  const formattedValue = formatNumberWithCommas(e.target.value);
                                  field.onChange(formattedValue);
                                  const weeklyHours = simpleForm.getValues("weeklyHours");
                                  calculateSimpleRate(formattedValue, weeklyHours);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={simpleForm.control}
                      name="weeklyHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Working Hours/Week</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="0"
                              onChange={(e) => {
                                const formattedValue = formatNumberWithCommas(e.target.value);
                                field.onChange(formattedValue);
                                const monthlyExpenses = simpleForm.getValues("monthlyExpenses");
                                calculateSimpleRate(monthlyExpenses, formattedValue);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-slate-50 rounded-lg p-4 mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">Calculated Hourly Rate:</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(simpleResults)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm">Based on your monthly expenses and working hours</p>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-primary text-white hover-bg-[#FFB6C1]"
                      disabled={saveCalculationMutation.isPending || simpleResults === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveCalculationMutation.isPending ? "Saving..." : "Save Rate"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Right Side - Full Calculator */}
            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Advanced Calculator</h3>
                    <p className="text-slate-600 text-sm mt-1">All factors for optimal rate calculation</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg items-center justify-center hidden md:flex">
                    <Calculator className="text-primary h-5 w-5" />
                  </div>
                </div>

                <Form {...advancedForm}>
                  <form onSubmit={advancedForm.handleSubmit(onAdvancedSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={advancedForm.control}
                        name="monthlyExpenses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Expenses</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">{formatSymbol()}</span>
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="0"
                                  className="pl-8"
                                  onChange={(e) => {
                                    const formattedValue = formatNumberWithCommas(e.target.value);
                                    field.onChange(formattedValue);
                                    const desiredProfit = advancedForm.getValues("desiredProfit");
                                    const weeklyHours = advancedForm.getValues("weeklyHours");
                                    const taxRate = advancedForm.getValues("taxRate");
                                    const staffCount = advancedForm.getValues("staffCount");
                                    calculateAdvancedRate(formattedValue, desiredProfit, weeklyHours, taxRate, staffCount);
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={advancedForm.control}
                        name="desiredProfit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Desired Profit %</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="0"
                                  className="pr-8"
                                  onChange={(e) => {
                                    const validatedValue = validatePercentageInput(e.target.value);
                                    field.onChange(validatedValue);
                                    const monthlyExpenses = advancedForm.getValues("monthlyExpenses");
                                    const weeklyHours = advancedForm.getValues("weeklyHours");
                                    const taxRate = advancedForm.getValues("taxRate");
                                    const staffCount = advancedForm.getValues("staffCount");
                                    calculateAdvancedRate(monthlyExpenses, validatedValue, weeklyHours, taxRate, staffCount);
                                  }}
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={advancedForm.control}
                        name="weeklyHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Working Hours/Week</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="text"
                                placeholder="0"
                                onChange={(e) => {
                                  const formattedValue = formatNumberWithCommas(e.target.value);
                                  field.onChange(formattedValue);
                                  const monthlyExpenses = advancedForm.getValues("monthlyExpenses");
                                  const desiredProfit = advancedForm.getValues("desiredProfit");
                                  const taxRate = advancedForm.getValues("taxRate");
                                  const staffCount = advancedForm.getValues("staffCount");
                                  calculateAdvancedRate(monthlyExpenses, desiredProfit, formattedValue, taxRate, staffCount);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={advancedForm.control}
                        name="taxRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate %</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="0"
                                  className="pr-8"
                                  onChange={(e) => {
                                    const validatedValue = validatePercentageInput(e.target.value);
                                    field.onChange(validatedValue);
                                    const monthlyExpenses = advancedForm.getValues("monthlyExpenses");
                                    const desiredProfit = advancedForm.getValues("desiredProfit");
                                    const weeklyHours = advancedForm.getValues("weeklyHours");
                                    const staffCount = advancedForm.getValues("staffCount");
                                    calculateAdvancedRate(monthlyExpenses, desiredProfit, weeklyHours, validatedValue, staffCount);
                                  }}
                                />
                                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500">%</span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 mt-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700 font-medium">Recommended Hourly Rate:</span>
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(calculatedResults.hourlyRate)}
                        </span>
                      </div>
                      {calculatedResults.staffTargetPerPerson && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <span className="text-slate-700 font-medium">Monthly Target per Staff:</span>
                          <span className="text-xl font-bold text-success">
                            {formatCurrency(calculatedResults.staffTargetPerPerson)}
                          </span>
                        </div>
                      )}
                      <p className="text-slate-600 text-sm">This rate covers your expenses and achieves your profit goals</p>
                    </div>

                    
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Calculation History */}
          {calculationHistory && calculationHistory.length > 0 && (
            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Recent Calculations</h3>
                    <p className="text-slate-600 text-sm mt-1">Your last {calculationHistory.length} hourly rate calculations</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <History className="text-green-600 h-5 w-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  {calculationHistory.map((calculation: any, index: number) => (
                    <div key={calculation.id} className="bg-slate-50 rounded-lg p-4 border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-500">
                            {new Date(calculation.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(parseFloat(calculation.calculatedRate))}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-slate-500">Expenses:</span>
                          <div className="font-medium">{formatCurrency(parseFloat(calculation.monthlyExpenses))}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Profit:</span>
                          <div className="font-medium">{parseFloat(calculation.desiredProfit)}%</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Hours:</span>
                          <div className="font-medium">{calculation.weeklyHours}/week</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Tax:</span>
                          <div className="font-medium">{parseFloat(calculation.taxRate)}%</div>
                        </div>
                      </div>
                      
                      {calculation.staffTargetPerPerson && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <span className="text-sm text-slate-500">Staff Target: </span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(parseFloat(calculation.staffTargetPerPerson))}/month
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}