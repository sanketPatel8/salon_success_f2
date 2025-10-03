import { useState } from "react";
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

const calculatorSchema = z.object({
  monthlyExpenses: z.string().min(1, "Monthly expenses is required"),
  desiredProfit: z.string().min(1, "Desired profit is required"),
  weeklyHours: z.string().min(1, "Weekly hours is required"),
  taxRate: z.string().min(1, "Tax rate is required"),
  staffCount: z.string().optional(),
});

type CalculatorForm = z.infer<typeof calculatorSchema>;

export default function HourlyRateCalculator() {
  const { formatCurrency } = useCurrency();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  // Fetch calculation history
  const { data: calculationHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/hourly-rate-calculations"],
    enabled: subscriptionStatus?.active === true,
  });

  const [calculatedResults, setCalculatedResults] = useState<{
    hourlyRate: number;
    staffTargetPerPerson: number | null;
  }>({ hourlyRate: 0, staffTargetPerPerson: null });
  
  const { toast } = useToast();

  // Function to parse number with commas and format for display
  const parseNumberInput = (value: string): number => {
    // Remove commas and any non-numeric characters except decimal point
    const cleanValue = value.replace(/,/g, '').replace(/[^0-9.-]/g, '');
    return parseFloat(cleanValue) || 0;
  };

  // Function to format number with commas for display
  const formatNumberWithCommas = (value: string): string => {
    // Remove any non-numeric characters except decimal point and commas
    let cleaned = value.replace(/[^0-9.,]/g, '');
    
    // Remove existing commas to reformat
    cleaned = cleaned.replace(/,/g, '');
    
    // Split into integer and decimal parts
    const parts = cleaned.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add commas to integer part
    if (integerPart.length > 3) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Reconstruct the number
    return decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;
  };

  // Function to validate and format percentage inputs (max 4 digits, 1 decimal)
  const validatePercentageInput = (value: string): string => {
    // Remove any non-numeric characters except decimal point
    let cleaned = value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 4 total digits and 1 decimal place
    if (cleaned.includes('.')) {
      const [integerPart, decimalPart] = cleaned.split('.');
      const limitedInteger = integerPart.slice(0, 3); // Max 3 digits before decimal
      const limitedDecimal = decimalPart.slice(0, 1); // Max 1 digit after decimal
      cleaned = limitedInteger + '.' + limitedDecimal;
    } else {
      cleaned = cleaned.slice(0, 4); // Max 4 digits if no decimal
    }
    
    return cleaned;
  };

  const form = useForm<CalculatorForm>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      monthlyExpenses: "",
      desiredProfit: "30",
      weeklyHours: "40",
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

  const calculateRate = () => {
    const values = form.getValues();
    const monthlyExpenses = parseNumberInput(values.monthlyExpenses);
    const desiredProfit = parseNumberInput(values.desiredProfit);
    const weeklyHours = parseNumberInput(values.weeklyHours) || 40;
    const taxRate = parseNumberInput(values.taxRate);
    const staffCount = parseNumberInput(values.staffCount || "0");

    const results = calculateHourlyRate(monthlyExpenses, desiredProfit, weeklyHours, taxRate, staffCount);
    setCalculatedResults(results);
  };

  const onSubmit = (data: CalculatorForm) => {
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

  // Show loading while checking subscription
  // if (subscriptionLoading) {
  //   return (
  //     <>
  //       <Header 
  //         title="Hourly Rate Calculator" 
  //         description="Calculate your optimal hourly rate based on expenses and profit goals" 
  //       />
  //       <div className="flex-1 flex items-center justify-center">
  //         <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
  //       </div>
  //     </>
  //   );
  // }

  // Check subscription status
  // if (!subscriptionStatus || !(subscriptionStatus as any).active) {
  //   return (
  //     <>
  //       <Header 
  //         title="Hourly Rate Calculator" 
  //         description="Calculate your optimal hourly rate based on expenses and profit goals" 
  //       />
  //       <Paywall 
  //         title="Hourly Rate Calculator"
  //         description="Calculate your optimal pricing strategy"
  //         feature="hourly rate calculations"
  //       />
  //     </>
  //   );
  // }

  return (
    <>
      <Header 
        title="Hourly Rate Calculator" 
        description="Calculate your optimal hourly rate based on expenses and profit goals" 
      />
      
      <main className="flex-1 p-4 overflow-y-auto ">
        <div className="max-w-2xl mx-auto">
          {/* Calculator Form */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 ">Calculate Your Rate</h3>
                  <p className="text-slate-600 text-sm mt-1 ">Enter your business details to calculate the optimal hourly rate. To gain the correct rate, under monthly expenses make sure you add all expenses of the business including wages and stock</p>
                </div>
                <div className="hidden md:flex w-8 h-8 bg-blue-100 rounded-lg items-center justify-center">
                  <Calculator className="text-primary h-5 w-5 " />
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monthlyExpenses"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Expenses</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">£</span>
                              <Input
                                {...field}
                                type="text"
                                placeholder="0"
                                className="pl-8"
                                onChange={(e) => {
                                  const formattedValue = formatNumberWithCommas(e.target.value);
                                  field.onChange(formattedValue);
                                  calculateRate();
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
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
                                  calculateRate();
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
                      control={form.control}
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
                                calculateRate();
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
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
                                  calculateRate();
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

                  <FormField
                    control={form.control}
                    name="staffCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Staff (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            placeholder="0"
                            onChange={(e) => {
                              const formattedValue = formatNumberWithCommas(e.target.value);
                              field.onChange(formattedValue);
                              calculateRate();
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-slate-500">Include yourself if you work in the business</p>
                      </FormItem>
                    )}
                  />

                  <div className="bg-slate-50 rounded-lg p-4 mt-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium">Recommended Hourly Rate:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(calculatedResults.hourlyRate)}
                      </span>
                    </div>
                    {calculatedResults.staffTargetPerPerson && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-slate-700 font-medium">Monthly Target per Staff Member:</span>
                        <span className="text-xl font-bold text-success">
                          {formatCurrency(calculatedResults.staffTargetPerPerson)}
                        </span>
                      </div>
                    )}
                    <p className="text-slate-600 text-sm">This rate covers your expenses and achieves your profit goals</p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-white hover:bg-blue-700"
                    disabled={saveCalculationMutation.isPending || calculatedResults.hourlyRate === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveCalculationMutation.isPending ? "Saving..." : "Save This Rate"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Calculation History */}
          {calculationHistory && calculationHistory.length > 0 && (
            <Card className="border border-slate-200 mt-6">
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
