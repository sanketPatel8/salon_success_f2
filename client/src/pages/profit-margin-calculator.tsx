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
} from "@/components/ui/card";
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
import { formatPercentage } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import TutorialVideoCard from "@/components/tutorial-video-card";
import {
  AlertTriangle,
  Lightbulb,
  PencilLine,
  Percent,
  Plus,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

const treatmentSchema = z.object({
  name: z.string().min(1, "Treatment or course name is required"),
  price: z.string().min(1, "Treatment price is required"),
  duration: z.string().min(1, "Treatment time is required"),
  productCost: z.string().optional(),
  averageTeamWorking: z.string().min(1, "Average team working is required"),
});

type TreatmentForm = z.infer<typeof treatmentSchema>;
type SubscriptionStatus = {
  active?: boolean;
};
type LatestHourlyRate = {
  calculatedRate: string | number;
};
type SavedTreatment = {
  id: number;
  name: string;
  price: string | number;
  duration: number;
  productCost?: string | number | null;
  averageTeamWorking?: number | null;
  overheadCost: string | number;
  profitMargin: string | number;
};

export default function ProfitMarginCalculator() {
  const { formatCurrency, formatSymbol } = useCurrency();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  const [editingTreatment, setEditingTreatment] = useState<SavedTreatment | null>(null);

  const { data: subscriptionStatus, isLoading: subscriptionLoading } =
    useQuery<SubscriptionStatus>({
      queryKey: ["/api/subscription-status"],
    });

  const pricingQueriesEnabled =
    !subscriptionLoading && subscriptionStatus?.active !== false;

  const {
    data: treatments = [],
    isLoading: treatmentsLoading,
    refetch: refetchTreatments,
  } = useQuery<SavedTreatment[]>({
    queryKey: ["/api/treatments"],
    enabled: pricingQueriesEnabled,
    staleTime: 0,
  });

  const {
    data: latestHourlyRate,
    refetch: refetchLatestHourlyRate,
  } = useQuery<LatestHourlyRate | null>({
    queryKey: ["/api/hourly-rate-calculations/latest"],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: pricingQueriesEnabled,
    staleTime: 0,
  });

  const form = useForm<TreatmentForm>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: {
      name: "",
      price: "",
      duration: "",
      productCost: "",
      averageTeamWorking: "1",
    },
  });

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

  useEffect(() => {
    if (!pricingQueriesEnabled || location !== "/profit-margin") {
      return;
    }

    queryClient.invalidateQueries({
      queryKey: ["/api/hourly-rate-calculations/latest"],
    });
    queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
    void refetchLatestHourlyRate();
    void refetchTreatments();
  }, [
    location,
    pricingQueriesEnabled,
    refetchLatestHourlyRate,
    refetchTreatments,
  ]);

  useEffect(() => {
    if (!pricingQueriesEnabled) {
      return;
    }

    const refreshPricingData = () => {
      if (document.visibilityState === "visible") {
        void refetchLatestHourlyRate();
        void refetchTreatments();
      }
    };

    window.addEventListener("focus", refreshPricingData);
    document.addEventListener("visibilitychange", refreshPricingData);

    return () => {
      window.removeEventListener("focus", refreshPricingData);
      document.removeEventListener("visibilitychange", refreshPricingData);
    };
  }, [pricingQueriesEnabled, refetchLatestHourlyRate, refetchTreatments]);

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

    return decimalPart !== undefined ? `${integerPart}.${decimalPart}` : integerPart;
  };

  const handleNumberInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    onChange: (value: string) => void,
  ) => {
    const formattedValue = formatNumberWithCommas(event.target.value);
    onChange(formattedValue);
    return formattedValue;
  };

  const watchedPrice = form.watch("price");
  const watchedDuration = form.watch("duration");
  const watchedProductCost = form.watch("productCost");
  const watchedAverageTeamWorking = form.watch("averageTeamWorking");

  const treatmentPrice = parseNumberInput(watchedPrice);
  const treatmentMinutes = parseNumberInput(watchedDuration);
  const extraProductCost = parseNumberInput(watchedProductCost || "0");
  const averageTeamWorking = parseNumberInput(watchedAverageTeamWorking);
  const totalSalonHourlyCost = parseNumberInput(
    latestHourlyRate?.calculatedRate?.toString() || "0",
  );
  const costPerTeamMemberPerHour =
    totalSalonHourlyCost > 0 && averageTeamWorking > 0
      ? totalSalonHourlyCost / averageTeamWorking
      : 0;
  const treatmentHours = treatmentMinutes > 0 ? treatmentMinutes / 60 : 0;
  const treatmentCost =
    treatmentHours > 0 ? costPerTeamMemberPerHour * treatmentHours + extraProductCost : 0;
  const profit = treatmentPrice - treatmentCost;
  const profitMargin = treatmentPrice > 0 ? (profit / treatmentPrice) * 100 : 0;
  const profitPerHour = treatmentHours > 0 ? profit / treatmentHours : 0;
  const hasHourlyRate = totalSalonHourlyCost > 0;
  const canCalculate = hasHourlyRate && treatmentHours > 0 && averageTeamWorking > 0;
  const hasEnteredPrice = treatmentPrice > 0;
  const isProfitable = profit > 0;
  const recommendedPrice = canCalculate ? treatmentCost * 1.2 : 0;
  const absoluteProfit = Math.abs(profit);
  const absoluteProfitPerHour = Math.abs(profitPerHour);
  const isEditing = Boolean(editingTreatment);

  const calculateSavedTreatmentMetrics = (treatment: SavedTreatment) => {
    const savedPrice = parseNumberInput(treatment.price.toString());
    const savedProductCost = parseNumberInput(
      treatment.productCost?.toString() || "0",
    );
    const savedAverageTeamWorking = Math.max(
      1,
      Number(treatment.averageTeamWorking) || 1,
    );
    const savedTreatmentHours = treatment.duration > 0 ? treatment.duration / 60 : 0;
    const savedTreatmentCost =
      hasHourlyRate && savedTreatmentHours > 0
        ? (totalSalonHourlyCost / savedAverageTeamWorking) * savedTreatmentHours +
          savedProductCost
        : parseNumberInput(treatment.overheadCost.toString());
    const savedProfit = savedPrice - savedTreatmentCost;
    const savedProfitMargin =
      savedPrice > 0 ? (savedProfit / savedPrice) * 100 : 0;

    return {
      productCost: savedProductCost,
      averageTeamWorking: savedAverageTeamWorking,
      treatmentCost: savedTreatmentCost,
      profitMargin: savedProfitMargin,
    };
  };

  const createTreatmentMutation = useMutation({
    mutationFn: async (data: unknown) => {
      return apiRequest("POST", "/api/treatments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Success",
        description: "Treatment added successfully!",
      });
      resetFormToAddMode();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add treatment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTreatmentMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: {
        name: string;
        price: string;
        duration: number;
        productCost: string;
        averageTeamWorking: number;
        overheadCost: string;
      };
    }) => {
      return apiRequest("PUT", `/api/treatments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/treatments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      toast({
        title: "Success",
        description: "Treatment updated successfully!",
      });
      resetFormToAddMode();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update treatment price. Please try again.",
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

  const resetFormToAddMode = () => {
    const nextAverageTeamWorking = "1";
    setEditingTreatment(null);
    form.reset({
      name: "",
      price: "",
      duration: "",
      productCost: "",
      averageTeamWorking: nextAverageTeamWorking,
    });
  };

  const onAddTreatment = (data: TreatmentForm) => {
    if (!canCalculate) {
      toast({
        title: "Hourly rate needed",
        description:
          "Please set your hourly rate and complete the analysis fields before saving a treatment.",
        variant: "destructive",
      });
      return;
    }

    const treatmentData = {
      name: data.name,
      price: parseNumberInput(data.price).toString(),
      duration: Math.round(parseNumberInput(data.duration)),
      productCost: extraProductCost.toFixed(2),
      averageTeamWorking: Math.max(1, Math.round(averageTeamWorking)),
      overheadCost: treatmentCost.toFixed(2),
    };

    createTreatmentMutation.mutate(treatmentData);
  };

  const openEditDialog = (treatment: SavedTreatment) => {
    setEditingTreatment(treatment);
    form.reset({
      name: treatment.name,
      price: formatNumberWithCommas(treatment.price.toString()),
      duration: treatment.duration.toString(),
      productCost: formatNumberWithCommas(
        treatment.productCost?.toString() || "0",
      ),
      averageTeamWorking: Math.max(
        1,
        (treatment.averageTeamWorking ??
          parseNumberInput(form.getValues("averageTeamWorking"))) || 1,
      ).toString(),
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleUpdateTreatmentPrice = () => {
    if (!editingTreatment) {
      return;
    }

    const values = form.getValues();
    const nextName = values.name.trim();
    const nextPrice = parseNumberInput(values.price);
    const nextDuration = Math.round(parseNumberInput(values.duration));

    if (!nextName || !nextPrice || !nextDuration) {
      toast({
        title: "Details required",
        description:
          "Please complete the treatment name, price, and time before updating.",
        variant: "destructive",
      });
      return;
    }

    if (!canCalculate) {
      toast({
        title: "Hourly rate needed",
        description:
          "Please make sure the calculator can work out the treatment cost before updating.",
        variant: "destructive",
      });
      return;
    }

    updateTreatmentMutation.mutate({
      id: editingTreatment.id,
      data: {
        name: nextName,
        price: nextPrice.toFixed(2),
        duration: nextDuration,
        productCost: extraProductCost.toFixed(2),
        averageTeamWorking: Math.max(1, Math.round(averageTeamWorking)),
        overheadCost: treatmentCost.toFixed(2),
      },
    });
  };

  const sortedTreatments = [...treatments].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  if (subscriptionLoading) {
    return (
      <>
        <Header
          title="Treatment Profit Calculator"
          description="Calculate profit margins for individual treatments and manage your service pricing"
        />
        <div className="flex flex-1 items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
            aria-label="Loading"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Treatment Profit Calculator"
        description="Calculate profit margins for individual treatments and manage your service pricing"
      />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-6xl space-y-6">
          <TutorialVideoCard
            title="Want help checking a treatment price?"
            description="Watch a quick walkthrough if you want help understanding how shared team costs affect treatment pricing."
            videoTitle="Pricing Calculator Walkthrough"
            embedUrl="https://www.youtube.com/embed/CWPqabq0YDk?si=JVtv9bE_Xl6E0U8T"
          />

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">
                      {isEditing ? "Update Treatment" : "Are You Charging Enough? Pricing Calculator"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {isEditing
                        ? "Edit the treatment details below and save the changes."
                        : "Find out if your treatment is making you money or costing you."}
                    </p>
                  </div>
                  <div className="hidden rounded-lg bg-green-100 p-3 md:flex">
                    <Percent className="h-5 w-5 text-emerald-700" />
                  </div>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => {
                      if (isEditing) {
                        handleUpdateTreatmentPrice();
                        return;
                      }
                      onAddTreatment(data);
                    })}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({
                        field,
                      }: {
                        field: ControllerRenderProps<TreatmentForm, "name">;
                      }) => (
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="price"
                        render={({
                          field,
                        }: {
                          field: ControllerRenderProps<TreatmentForm, "price">;
                        }) => (
                          <FormItem>
                            <FormLabel>{`Treatment Price (${formatSymbol()})`}</FormLabel>
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
                                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                    handleNumberInputChange(event, field.onChange)
                                  }
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
                        render={({
                          field,
                        }: {
                          field: ControllerRenderProps<TreatmentForm, "duration">;
                        }) => (
                          <FormItem>
                            <FormLabel>Treatment Time (minutes)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="text"
                                placeholder="0"
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                  handleNumberInputChange(event, field.onChange)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="productCost"
                      render={({
                        field,
                      }: {
                        field: ControllerRenderProps<TreatmentForm, "productCost">;
                      }) => (
                        <FormItem>
                          <FormLabel>{`Extra Product Cost (${formatSymbol()})`}</FormLabel>
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
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                  handleNumberInputChange(event, field.onChange)
                                }
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Only add this if this treatment uses more product than
                            normal (e.g. colour, extensions, advanced treatments).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="averageTeamWorking"
                      render={({
                        field,
                      }: {
                        field: ControllerRenderProps<
                          TreatmentForm,
                          "averageTeamWorking"
                        >;
                      }) => (
                        <FormItem>
                          <FormLabel>Average Team Working At The Same Time</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="1"
                              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                handleNumberInputChange(event, field.onChange)
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            On a typical day, how many team members are carrying out
                            treatments and bringing in money at the same time? Do not
                            include reception/admin unless they generate income.
                          </FormDescription>
                          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                            Your salon costs are shared across your team. This helps
                            calculate a more realistic cost per treatment.
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>{`Treatment Cost (${formatSymbol()})`}</FormLabel>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          {formatSymbol()}
                        </span>
                        <Input
                          value={canCalculate ? treatmentCost.toFixed(2) : ""}
                          className="bg-slate-50 pl-8"
                          readOnly
                        />
                      </div>
                      {!hasHourlyRate ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          Please configure your Hourly Rate before proceeding.
                          <Button
                            type="button"
                            variant="link"
                            className="ml-1 h-auto p-0 text-amber-900 underline"
                            onClick={() => setLocation("/hourly-rate")}
                          >
                            Open Hourly Rate Calculator
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">
                          Automatically calculated using your salon hourly cost,
                          team split, treatment time, and any extra product cost.
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Total Costs:</span>
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(treatmentCost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-700">Net Profit:</span>
                        <span
                          className={`font-semibold ${
                            isProfitable ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {formatCurrency(profit)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                        <span className="font-medium text-slate-700">
                          Profit Margin:
                        </span>
                        <span
                          className={`text-2xl font-bold ${
                            isProfitable ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {formatPercentage(profitMargin)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">
                            Total salon hourly cost
                          </p>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatCurrency(totalSalonHourlyCost)}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <p className="text-sm text-slate-500">
                              Cost per team member per hour
                            </p>
                          </div>
                          <p className="mt-1 text-xl font-bold text-slate-900">
                            {formatCurrency(costPerTeamMemberPerHour)}
                          </p>
                        </div>
                      </div>

                      {!canCalculate || !hasEnteredPrice ? (
                        <p className="text-sm text-slate-600">
                          Add the treatment price, time, and team number to see
                          whether this service is making money.
                        </p>
                      ) : (
                        <>
                          <div
                            className={`rounded-xl p-4 ${
                              isProfitable
                                ? "border border-emerald-200 bg-emerald-50"
                                : "border border-rose-200 bg-rose-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {isProfitable ? (
                                <TrendingUp className="mt-0.5 h-5 w-5 text-emerald-700" />
                              ) : (
                                <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-700" />
                              )}
                              <div className="space-y-2">
                                <p
                                  className={`font-semibold ${
                                    isProfitable
                                      ? "text-emerald-900"
                                      : "text-rose-900"
                                  }`}
                                >
                                  {isProfitable
                                    ? `You are making ${formatCurrency(
                                        absoluteProfit,
                                      )} profit on this treatment`
                                    : `You are losing ${formatCurrency(
                                        absoluteProfit,
                                      )} on this treatment`}
                                </p>
                                <p
                                  className={`text-sm ${
                                    isProfitable
                                      ? "text-emerald-900"
                                      : "text-rose-900"
                                  }`}
                                >
                                  That&apos;s {formatCurrency(absoluteProfitPerHour)}
                                  /hour
                                </p>
                                <p
                                  className={`text-sm font-medium ${
                                    isProfitable
                                      ? "text-emerald-900"
                                      : "text-rose-900"
                                  }`}
                                >
                                  {isProfitable
                                    ? "This treatment is profitable"
                                    : "You are undercharging"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm text-slate-600">
                              This is calculated using your hourly business costs
                              (rent, bills, stock, etc), so you can clearly see if
                              this treatment is covering your expenses.
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start gap-3">
                              <Lightbulb className="mt-0.5 h-5 w-5 text-amber-500" />
                              <div>
                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Recommended Price
                                </p>
                                <p className="mt-2 text-md font-bold text-slate-900">
                                  To be profitable, you should be charging above:{" "}
                                  {formatCurrency(recommendedPrice)}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">
                                  This ensures you are covering your costs and making
                                  profit.
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Button
                          type="submit"
                          className="bg-primary text-white"
                          disabled={updateTreatmentMutation.isPending || !canCalculate}
                        >
                          {updateTreatmentMutation.isPending ? "Updating..." : "Update"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-300"
                          onClick={resetFormToAddMode}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        className="w-full bg-primary text-white"
                        disabled={createTreatmentMutation.isPending || !canCalculate}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        {createTreatmentMutation.isPending
                          ? "Adding..."
                          : "Add to Treatment List"}
                      </Button>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      Your Treatments
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Manage your service offerings
                    </p>
                  </div>
                  <div className="hidden rounded-lg bg-purple-100 p-3 md:flex">
                    <Percent className="h-5 w-5 text-purple-600" />
                  </div>
                </div>

                <div className="max-h-[780px] space-y-4 overflow-y-auto">
                  {treatmentsLoading ? (
                    <div className="py-8 text-center text-slate-500">
                      Loading treatments...
                    </div>
                  ) : sortedTreatments.length ? (
                    sortedTreatments.map((treatment) => {
                      const savedMetrics = calculateSavedTreatmentMetrics(treatment);

                      return (
                        <div key={treatment.id} className="rounded-lg bg-slate-50 p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-slate-800">
                                {treatment.name}
                              </h4>
                              <p className="text-sm text-slate-600">
                                {treatment.duration} minutes
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <span className="text-lg font-bold text-slate-800">
                                {formatCurrency(treatment.price)}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-3 text-xs"
                                  onClick={() => openEditDialog(treatment)}
                                >
                                  <PencilLine className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    deleteTreatmentMutation.mutate(treatment.id)
                                  }
                                  disabled={deleteTreatmentMutation.isPending}
                                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                            <div>
                              <span className="text-slate-500">Treatment Cost:</span>
                              <p className="font-medium text-slate-800">
                                {formatCurrency(savedMetrics.treatmentCost)}
                              </p>
                            </div>
                            <div>
                              <span className="text-slate-500">Profit Margin:</span>
                              <p className="font-bold text-emerald-600">
                                {formatPercentage(savedMetrics.profitMargin)}
                              </p>
                            </div>
                            {savedMetrics.productCost > 0 && (
                              <div>
                                <span className="text-slate-500">
                                  Extra Product Cost:
                                </span>
                                <p className="font-medium text-slate-800">
                                  {formatCurrency(savedMetrics.productCost)}
                                </p>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-500">
                                Avg Team Working:
                              </span>
                              <p className="font-medium text-slate-800">
                                {savedMetrics.averageTeamWorking}{" "}
                                {savedMetrics.averageTeamWorking === 1
                                  ? "team member"
                                  : "team members"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-slate-500">
                      No treatments added yet. Create your first treatment!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

    </>
  );
}
