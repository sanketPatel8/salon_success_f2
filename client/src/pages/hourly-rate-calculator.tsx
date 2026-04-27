import { useEffect, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, type ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Header from "@/components/header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateHourlyRate } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  AlertTriangle,
  Calculator,
  CircleHelp,
  Clock,
  History,
  Lightbulb,
  PlayCircle,
  Save,
  TrendingUp,
  X,
} from "lucide-react";
import TutorialVideoCard from "@/components/tutorial-video-card.tsx";

const WEEKS_PER_MONTH = 4.33;

const simpleCalculatorSchema = z.object({
  monthlyExpenses: z.string().min(1, "Monthly expenses is required"),
  weeklyHours: z.string().min(1, "Hours open per week is required"),
});

const advancedCalculatorSchema = z.object({
  monthlyExpenses: z.string().min(1, "Monthly expenses is required"),
  desiredProfit: z.string().min(1, "Desired profit is required"),
  weeklyHours: z.string().min(1, "Hours open per week is required"),
  taxRate: z.string().min(1, "Tax rate is required"),
});

type SimpleCalculatorForm = z.infer<typeof simpleCalculatorSchema>;
type AdvancedCalculatorForm = z.infer<typeof advancedCalculatorSchema>;
type SubscriptionStatus = {
  active?: boolean;
};
type CalculationHistoryItem = {
  id: number;
  createdAt: string;
  monthlyExpenses: string;
  desiredProfit: string;
  weeklyHours: number;
  taxRate: string;
  calculatedRate: string;
};

type SimpleRateResults = {
  hourlyRate: number;
  profitableMin: number;
  profitableMax: number;
  weeklyBreakEven: number;
  monthlyBreakEven: number;
};

const emptySimpleResults: SimpleRateResults = {
  hourlyRate: 0,
  profitableMin: 0,
  profitableMax: 0,
  weeklyBreakEven: 0,
  monthlyBreakEven: 0,
};

export default function HourlyRateCalculator() {
  const { formatCurrency, formatSymbol } = useCurrency();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: subscriptionStatus, isLoading: subscriptionLoading } =
    useQuery<SubscriptionStatus>({
      queryKey: ["/api/subscription-status"],
    });

  const { data: calculationHistory = [] } = useQuery<CalculationHistoryItem[]>({
    queryKey: ["/api/hourly-rate-calculations"],
    enabled: !subscriptionLoading && subscriptionStatus?.active !== false,
  });

  const [simpleResults, setSimpleResults] =
    useState<SimpleRateResults>(emptySimpleResults);
  const [advancedResults, setAdvancedResults] = useState({ hourlyRate: 0 });
  const [showVideoCard, setShowVideoCard] = useState(true);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/v2/auth/user", {
          method: "GET",
          credentials: "include",
        });

        if (response.status === 401) {
          toast({
            title: "Session Expired",
            description: "Please log in to continue",
            variant: "destructive",
          });

          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      }
    };

    checkSession();

    const intervalId = setInterval(checkSession, 30000);

    return () => clearInterval(intervalId);
  }, [toast]);

  const parseNumberInput = (value: string): number => {
    const cleanValue = value.replace(/,/g, "").replace(/[^0-9.-]/g, "");
    return parseFloat(cleanValue) || 0;
  };

  const formatNumberWithCommas = (value: string): string => {
    let cleaned = value.replace(/[^0-9.,]/g, "");

    cleaned = cleaned.replace(/,/g, "");

    const parts = cleaned.split(".");
    let integerPart = parts[0];
    const decimalPart = parts[1];

    if (integerPart.length > 3) {
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return decimalPart !== undefined
      ? `${integerPart}.${decimalPart}`
      : integerPart;
  };

  const validatePercentageInput = (value: string): string => {
    let cleaned = value.replace(/[^0-9.]/g, "");

    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }

    if (cleaned.includes(".")) {
      const [integerPart, decimalPart] = cleaned.split(".");
      const limitedInteger = integerPart.slice(0, 3);
      const limitedDecimal = decimalPart.slice(0, 1);
      cleaned = limitedInteger + "." + limitedDecimal;
    } else {
      cleaned = cleaned.slice(0, 4);
    }

    return cleaned;
  };

  const handleCurrencyInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void,
  ) => {
    const formattedValue = formatNumberWithCommas(event.target.value);
    onChange(formattedValue);
    return formattedValue;
  };

  const simpleForm = useForm<SimpleCalculatorForm>({
    resolver: zodResolver(simpleCalculatorSchema),
    defaultValues: {
      monthlyExpenses: "",
      weeklyHours: "",
    },
  });

  const advancedForm = useForm<AdvancedCalculatorForm>({
    resolver: zodResolver(advancedCalculatorSchema),
    defaultValues: {
      monthlyExpenses: "",
      desiredProfit: "30",
      weeklyHours: "",
      taxRate: "25",
    },
  });

  const saveCalculationMutation = useMutation({
    mutationFn: async (data: unknown) => {
      return apiRequest("POST", "/api/hourly-rate-calculations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/hourly-rate-calculations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/hourly-rate-calculations/latest"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
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

  const calculateSimpleRate = (
    monthlyExpenses: string,
    weeklyHours: string,
  ) => {
    const expenses = parseNumberInput(monthlyExpenses);
    const hours = parseNumberInput(weeklyHours);

    if (expenses > 0 && hours > 0) {
      const monthlyHours = hours * WEEKS_PER_MONTH;
      const hourlyRate = expenses / monthlyHours;
      const profitableMin = calculateHourlyRate(
        expenses,
        20,
        hours,
        0,
      ).hourlyRate;
      const profitableMax = calculateHourlyRate(
        expenses,
        30,
        hours,
        0,
      ).hourlyRate;

      setSimpleResults({
        hourlyRate,
        profitableMin,
        profitableMax,
        weeklyBreakEven: hourlyRate * hours,
        monthlyBreakEven: expenses,
      });
      return;
    }

    setSimpleResults(emptySimpleResults);
  };

  const calculateAdvancedRate = (
    monthlyExpenses: string,
    desiredProfit: string,
    weeklyHours: string,
    taxRate: string,
  ) => {
    const expenses = parseNumberInput(monthlyExpenses);
    const profit = parseNumberInput(desiredProfit);
    const hours = parseNumberInput(weeklyHours);
    const tax = parseNumberInput(taxRate);

    if (expenses > 0 && hours > 0) {
      const results = calculateHourlyRate(expenses, profit, hours, tax);
      setAdvancedResults({ hourlyRate: results.hourlyRate });
      return;
    }

    setAdvancedResults({ hourlyRate: 0 });
  };

  const onSimpleSubmit = (data: SimpleCalculatorForm) => {
    const calculationData = {
      monthlyExpenses: parseNumberInput(data.monthlyExpenses).toString(),
      desiredProfit: "0",
      weeklyHours: Math.round(parseNumberInput(data.weeklyHours)),
      taxRate: "0",
      staffCount: 0,
      calculatedRate: simpleResults.hourlyRate.toString(),
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
      staffCount: 0,
      calculatedRate: advancedResults.hourlyRate.toString(),
      staffTargetPerPerson: null,
    };

    saveCalculationMutation.mutate(calculationData);
  };

  return (
    <>
      <Header
        title="Hourly Rate Calculator"
        description="This shows the minimum you must earn per hour to cover your costs and break even in your business."
      />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-6xl space-y-6">
          <TutorialVideoCard
            title="Want help setting up your Salon's Hourly Rate?"
            description="Use this to find your non-negotiable hourly minimum before checking the prices of your treatments."
            videoTitle="Hourly Rate Calculator Walkthrough"
            embedUrl="https://www.youtube.com/embed/FdnvxSMMf0w?si=wxmyOTugAMc6Huwi"
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card className="border border-slate-200">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl text-slate-800">
                      What You NEED to Earn Per Hour
                    </CardTitle>
                    <CardDescription className="mt-2 text-sm text-slate-600">
                      This shows the minimum you must earn per hour to cover
                      your costs and break even in your business.
                    </CardDescription>
                  </div>
                  <div className="hidden rounded-xl bg-blue-100 p-3 md:flex">
                    <Calculator className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                <Form {...simpleForm}>
                  <form
                    onSubmit={simpleForm.handleSubmit(onSimpleSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={simpleForm.control}
                      name="monthlyExpenses"
                      render={({
                        field,
                      }: {
                        field: ControllerRenderProps<
                          SimpleCalculatorForm,
                          "monthlyExpenses"
                        >;
                      }) => (
                        <FormItem>
                          <FormLabel>{`Monthly Expenses (${formatSymbol()})`}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                {formatSymbol()}
                              </span>
                              <Input
                                {...field}
                                type="text"
                                placeholder="0"
                                className="pl-8"
                                onChange={(
                                  event: ChangeEvent<HTMLInputElement>,
                                ) => {
                                  const formattedValue =
                                    handleCurrencyInputChange(
                                      event,
                                      field.onChange,
                                    );
                                  calculateSimpleRate(
                                    formattedValue,
                                    simpleForm.getValues("weeklyHours"),
                                  );
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            This is your TOTAL monthly business spend (rent,
                            wages, stock, bills, subscriptions, EVERYTHING).
                            This should be the same every month on average.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={simpleForm.control}
                      name="weeklyHours"
                      render={({
                        field,
                      }: {
                        field: ControllerRenderProps<
                          SimpleCalculatorForm,
                          "weeklyHours"
                        >;
                      }) => (
                        <FormItem>
                          <FormLabel>Hours Open Per Week</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="0"
                              onChange={(
                                event: ChangeEvent<HTMLInputElement>,
                              ) => {
                                const formattedValue =
                                  handleCurrencyInputChange(
                                    event,
                                    field.onChange,
                                  );
                                calculateSimpleRate(
                                  simpleForm.getValues("monthlyExpenses"),
                                  formattedValue,
                                );
                              }}
                            />
                          </FormControl>
                          <FormDescription>
                            How many hours your business is open per week (not
                            per person).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-5">
                      {simpleResults.hourlyRate > 0 ? (
                        <>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Break-even target
                            </p>
                            <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
                              You must earn at least{" "}
                              {formatCurrency(simpleResults.hourlyRate)}/hour to
                              break even
                            </p>
                          </div>

                          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <p className="text-sm text-amber-900">
                              If your treatments are priced below this, you are
                              losing money.
                            </p>
                          </div>

                          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                            <p className="text-sm text-emerald-900">
                              To be profitable, aim for{" "}
                              {formatCurrency(simpleResults.profitableMin)}-
                              {formatCurrency(simpleResults.profitableMax)} per
                              hour.
                            </p>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                              <div className="flex items-start gap-3">
                                <TrendingUp className="mt-0.5 h-5 w-5 text-primary" />
                                <p className="text-sm text-slate-700">
                                  You need to generate{" "}
                                  <span className="font-semibold text-slate-900">
                                    {formatCurrency(
                                      simpleResults.weeklyBreakEven,
                                    )}
                                  </span>{" "}
                                  per week to break even.
                                </p>
                              </div>
                            </div>
                            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                              <div className="flex items-start gap-3">
                                <TrendingUp className="mt-0.5 h-5 w-5 text-primary" />
                                <p className="text-sm text-slate-700">
                                  You need to generate{" "}
                                  <span className="font-semibold text-slate-900">
                                    {formatCurrency(
                                      simpleResults.monthlyBreakEven,
                                    )}
                                  </span>{" "}
                                  per month to break even.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xl font-bold text-slate-800">
                            Add your numbers to reveal your break-even targets.
                          </p>
                          <p className="text-sm text-slate-600">
                            This section will show the hourly, weekly, and
                            monthly amounts your business needs to generate.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-slate-300"
                        onClick={() => setLocation("/profit-margin")}
                      >
                        Check My Treatment Prices
                      </Button>
                      <Button
                        type="submit"
                        className="bg-primary text-white"
                        disabled={
                          saveCalculationMutation.isPending ||
                          simpleResults.hourlyRate === 0
                        }
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {saveCalculationMutation.isPending
                          ? "Saving..."
                          : "Save Rate"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <div className="space-y-6">

              <Card className="border border-slate-200">
                <CardContent className="p-6">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">
                        Advanced Planning
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Add profit and tax targets if you want a more ambitious
                        hourly rate as well.
                      </p>
                    </div>
                    <div className="hidden rounded-xl bg-blue-100 p-3 md:flex">
                      <Calculator className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <Form {...advancedForm}>
                    <form
                      onSubmit={advancedForm.handleSubmit(onAdvancedSubmit)}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={advancedForm.control}
                          name="monthlyExpenses"
                          render={({
                            field,
                          }: {
                            field: ControllerRenderProps<
                              AdvancedCalculatorForm,
                              "monthlyExpenses"
                            >;
                          }) => (
                            <FormItem>
                              <FormLabel>{`Monthly Expenses (${formatSymbol()})`}</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    {formatSymbol()}
                                  </span>
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="0"
                                    className="pl-8"
                                    onChange={(
                                      event: ChangeEvent<HTMLInputElement>,
                                    ) => {
                                      const formattedValue =
                                        handleCurrencyInputChange(
                                          event,
                                          field.onChange,
                                        );
                                      calculateAdvancedRate(
                                        formattedValue,
                                        advancedForm.getValues("desiredProfit"),
                                        advancedForm.getValues("weeklyHours"),
                                        advancedForm.getValues("taxRate"),
                                      );
                                    }}
                                  />
                                </div>
                              </FormControl>
                              <FormDescription>
                                Your average monthly business spend.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={advancedForm.control}
                          name="desiredProfit"
                          render={({
                            field,
                          }: {
                            field: ControllerRenderProps<
                              AdvancedCalculatorForm,
                              "desiredProfit"
                            >;
                          }) => (
                            <FormItem>
                              <FormLabel>Desired Profit %</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="0"
                                    className="pr-8"
                                    onChange={(
                                      event: ChangeEvent<HTMLInputElement>,
                                    ) => {
                                      const validatedValue =
                                        validatePercentageInput(
                                          event.target.value,
                                        );
                                      field.onChange(validatedValue);
                                      calculateAdvancedRate(
                                        advancedForm.getValues(
                                          "monthlyExpenses",
                                        ),
                                        validatedValue,
                                        advancedForm.getValues("weeklyHours"),
                                        advancedForm.getValues("taxRate"),
                                      );
                                    }}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    %
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField
                          control={advancedForm.control}
                          name="weeklyHours"
                          render={({
                            field,
                          }: {
                            field: ControllerRenderProps<
                              AdvancedCalculatorForm,
                              "weeklyHours"
                            >;
                          }) => (
                            <FormItem>
                              <FormLabel>Hours Open Per Week</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="text"
                                  placeholder="0"
                                  onChange={(
                                    event: ChangeEvent<HTMLInputElement>,
                                  ) => {
                                    const formattedValue =
                                      handleCurrencyInputChange(
                                        event,
                                        field.onChange,
                                      );
                                    calculateAdvancedRate(
                                      advancedForm.getValues("monthlyExpenses"),
                                      advancedForm.getValues("desiredProfit"),
                                      formattedValue,
                                      advancedForm.getValues("taxRate"),
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Total business opening hours per week.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={advancedForm.control}
                          name="taxRate"
                          render={({
                            field,
                          }: {
                            field: ControllerRenderProps<
                              AdvancedCalculatorForm,
                              "taxRate"
                            >;
                          }) => (
                            <FormItem>
                              <FormLabel>Tax Rate %</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    {...field}
                                    type="text"
                                    placeholder="0"
                                    className="pr-8"
                                    onChange={(
                                      event: ChangeEvent<HTMLInputElement>,
                                    ) => {
                                      const validatedValue =
                                        validatePercentageInput(
                                          event.target.value,
                                        );
                                      field.onChange(validatedValue);
                                      calculateAdvancedRate(
                                        advancedForm.getValues(
                                          "monthlyExpenses",
                                        ),
                                        advancedForm.getValues("desiredProfit"),
                                        advancedForm.getValues("weeklyHours"),
                                        validatedValue,
                                      );
                                    }}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                                    %
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-slate-700">
                            Recommended Hourly Rate
                          </span>
                          <span className="text-2xl font-bold text-primary">
                            {formatCurrency(advancedResults.hourlyRate)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          This version includes your target profit and tax
                          allowance.
                        </p>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>

          {calculationHistory && calculationHistory.length > 0 && (
            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Recent Calculations
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Your last {calculationHistory.length} hourly rate
                      calculations
                    </p>
                  </div>
                  <div className="flex rounded-xl bg-green-100 p-3">
                    <History className="h-5 w-5 text-green-600" />
                  </div>
                </div>

                <div className="space-y-4">
                  {calculationHistory.map((calculation) => (
                    <div
                      key={calculation.id}
                      className="rounded-lg border bg-slate-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-500">
                            {new Date(calculation.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(
                            parseFloat(calculation.calculatedRate),
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                        <div>
                          <span className="text-slate-500">Expenses:</span>
                          <div className="font-medium">
                            {formatCurrency(
                              parseFloat(calculation.monthlyExpenses),
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Profit:</span>
                          <div className="font-medium">
                            {parseFloat(calculation.desiredProfit)}%
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Hours:</span>
                          <div className="font-medium">
                            {calculation.weeklyHours}/week
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">Tax:</span>
                          <div className="font-medium">
                            {parseFloat(calculation.taxRate)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-lg border-slate-200 bg-white">
          <DialogHeader>
            <DialogTitle>How do I use this section?</DialogTitle>
            <DialogDescription>
              Use these quick steps to find your break-even hourly rate and
              check whether your pricing is working hard enough for your
              business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-slate-600">
            <div className="rounded-xl bg-slate-50 p-4">
              Add your average monthly business spend, including everything your
              business pays out each month.
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              Enter the total number of hours the business is open each week,
              not the hours for one team member.
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              Use the break-even hourly figure as your minimum benchmark. Then
              open the pricing calculator to check whether each treatment clears
              that hourly target.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
