import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import Header from "@/components/header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateTreatmentProfit, formatPercentage } from "@/lib/utils";
import { Percent, Plus, Trash2, Bath } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Paywall from "@/components/paywall";

const treatmentSchema = z.object({
  name: z.string().min(1, "Treatment name is required"),
  price: z.string().min(1, "Price is required"),
  duration: z.string().min(1, "Duration is required"),
  overheadCost: z.string().min(1, "Overhead cost is required"),
});

type TreatmentForm = z.infer<typeof treatmentSchema>;

export default function ProfitMarginCalculator() {
  const { formatCurrency } = useCurrency();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const [calculatedProfit, setCalculatedProfit] = useState({
    totalCosts: 0,
    netProfit: 0,
    profitMargin: 0,
    autoOverheadCost: 0,
  });
  const { toast } = useToast();

  const { data: treatments, isLoading } = useQuery({
    queryKey: ["/api/treatments"],
  });

  const { data: latestHourlyRate } = useQuery({
    queryKey: ["/api/hourly-rate-calculations/latest"],
  });

  const form = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      name: "",
      price: "",
      duration: "",
      overheadCost: "",
    },
  });

  // Auto-calculate overhead cost when duration changes
  const watchedDuration = form.watch("duration");
  
  useEffect(() => {
    if (watchedDuration && latestHourlyRate) {
      const duration = parseInt(watchedDuration);
      const autoOverhead = calculateOverheadCost(duration);
      if (autoOverhead > 0) {
        form.setValue("overheadCost", autoOverhead.toFixed(2));
        calculateProfit();
      }
    }
  }, [watchedDuration, latestHourlyRate]);

  const createTreatmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/treatments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      form.reset();
      setCalculatedProfit({ totalCosts: 0, netProfit: 0, profitMargin: 0, autoOverheadCost: 0 });
      toast({
        title: "Success",
        description: "Treatment added successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add treatment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTreatmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/treatments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Success",
        description: "Treatment deleted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete treatment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const calculateOverheadCost = (duration: number): number => {
    if (!latestHourlyRate || !(latestHourlyRate as any).calculatedRate) return 0;
    const hourlyRate = parseFloat((latestHourlyRate as any).calculatedRate.toString());
    const hours = duration / 60; // Convert minutes to hours
    return hourlyRate * hours;
  };

  const calculateProfit = () => {
    const values = form.getValues();
    const price = parseFloat(values.price) || 0;
    const duration = parseFloat(values.duration) || 0;
    
    // Calculate overhead cost automatically based on duration and hourly rate
    const autoOverheadCost = calculateOverheadCost(duration);
    const manualOverheadCost = parseFloat(values.overheadCost) || 0;
    
    // Use manual overhead if provided, otherwise use auto-calculated
    const overheadCost = manualOverheadCost > 0 ? manualOverheadCost : autoOverheadCost;

    const netProfit = price - overheadCost;
    const profitMargin = price > 0 ? (netProfit / price) * 100 : 0;
    
    setCalculatedProfit({
      totalCosts: overheadCost,
      netProfit,
      profitMargin,
      autoOverheadCost
    });
  };

  const onSubmit = (data: TreatmentForm) => {
    const duration = parseInt(data.duration);
    const autoOverheadCost = calculateOverheadCost(duration);
    const manualOverheadCost = parseFloat(data.overheadCost) || 0;
    const finalOverheadCost = manualOverheadCost > 0 ? manualOverheadCost : autoOverheadCost;

    const treatmentData = {
      name: data.name,
      price: parseFloat(data.price).toString(),
      duration: duration,
      overheadCost: finalOverheadCost.toString(),
    };

    createTreatmentMutation.mutate(treatmentData);
  };

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <>
        <Header 
          title="Profit Margin Calculator" 
          description="Analyze treatment profitability and optimize your pricing strategy" 
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
          title="Profit Margin Calculator" 
          description="Analyze treatment profitability and optimize your pricing strategy" 
        />
        <Paywall 
          title="Profit Margin Calculator"
          description="Maximize your treatment profitability"
          feature="profit margin analysis"
        />
      </>
    );
  }

  return (
    <>
      <Header 
        title="Treatment Profit Calculator" 
        description="Calculate profit margins for individual treatments and manage your service pricing" 
      />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Add New Treatment or Course</h3>
                  <p className="text-slate-600 text-sm mt-1">Calculate profit margins for individual treatments or courses</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Percent className="text-success h-5 w-5" />
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Treatment or Course Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Deep Cleansing Facial"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Treatment Price</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">£</span>
                              <Input
                                {...field}
                                type="number"
                                placeholder="150"
                                className="pl-8"
                                onChange={(e) => {
                                  field.onChange(e);
                                  calculateProfit();
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
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time Required (min)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="90"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="overheadCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overhead Cost (Auto-calculated from hourly rate)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500">£</span>
                            <Input
                              {...field}
                              type="number"
                              className="pl-8 bg-slate-50"
                              readOnly
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-slate-500">
                          {latestHourlyRate ? 
                            `Automatically calculated: ${formatCurrency((latestHourlyRate as any)?.calculatedRate || 0)}/hour × treatment duration` :
                            "Complete the hourly rate calculator first to enable auto-calculation"
                          }
                        </p>
                      </FormItem>
                    )}
                  />

                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Total Costs:</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(calculatedProfit.totalCosts)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700">Net Profit:</span>
                      <span className="font-semibold text-success">
                        {formatCurrency(calculatedProfit.netProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-700 font-medium">Profit Margin:</span>
                      <span className="text-2xl font-bold text-success">
                        {formatPercentage(calculatedProfit.profitMargin)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-success text-white hover:bg-green-700"
                    disabled={createTreatmentMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createTreatmentMutation.isPending ? "Adding..." : "Add to Treatment List"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Treatment List */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Your Treatments</h3>
                  <p className="text-slate-600 text-sm mt-1">Manage your service offerings</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bath className="text-purple-600 h-5 w-5" />
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-8 text-slate-500">Loading treatments...</div>
                ) : (treatments as any)?.length ? (
                  (treatments as any).map((treatment: any) => (
                    <div key={treatment.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-slate-800">{treatment.name}</h4>
                          <p className="text-sm text-slate-600">{treatment.duration} minutes</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-slate-800">
                            {formatCurrency(treatment.price)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTreatmentMutation.mutate(treatment.id)}
                            disabled={deleteTreatmentMutation.isPending}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Overhead Cost:</span>
                          <p className="font-medium">{formatCurrency(treatment.overheadCost)}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Profit Margin:</span>
                          <p className="font-bold text-success">{formatPercentage(treatment.profitMargin)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    No treatments added yet. Create your first treatment!
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
