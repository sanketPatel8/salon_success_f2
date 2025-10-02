import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/header";
import { TrendingUp, DollarSign, Calendar, Target } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import Paywall from "@/components/paywall";
import type { Treatment } from "@shared/schema";

interface ProjectionInputs {
  selectedTreatment: string;
  sessionsPerWeek: number;
  weeksPerMonth: number;
  seasonalMultiplier: number;
}

export default function RevenueProjections() {
  const { formatCurrency } = useCurrency();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ["/api/subscription-status"],
  });

  const [projectionInputs, setProjectionInputs] = useState<ProjectionInputs>({
    selectedTreatment: "",
    sessionsPerWeek: 0,
    weeksPerMonth: 4.33,
    seasonalMultiplier: 1,
  });

  const { data: treatments = [], isLoading: treatmentsLoading } = useQuery<Treatment[]>({
    queryKey: ["/api/treatments"],
  });

  const selectedTreatment = treatments?.find(t => t.id.toString() === projectionInputs.selectedTreatment);

  // Calculate projections
  const calculateProjections = () => {
    if (!selectedTreatment || !selectedTreatment.price) return null;

    const price = selectedTreatment.price ? parseFloat(selectedTreatment.price.toString()) : 0;
    const duration = selectedTreatment.duration || 0;
    const monthlyRevenue = price * projectionInputs.sessionsPerWeek * projectionInputs.weeksPerMonth * projectionInputs.seasonalMultiplier;
    const yearlyRevenue = monthlyRevenue * 12;
    
    const overheadCost = selectedTreatment.overheadCost ? parseFloat(selectedTreatment.overheadCost.toString()) : 0;
    const totalCosts = overheadCost * projectionInputs.sessionsPerWeek * projectionInputs.weeksPerMonth * projectionInputs.seasonalMultiplier;
    const monthlyProfit = monthlyRevenue - totalCosts;
    const yearlyProfit = monthlyProfit * 12;

    const monthlyHours = (duration / 60) * projectionInputs.sessionsPerWeek * projectionInputs.weeksPerMonth * projectionInputs.seasonalMultiplier;
    const yearlyHours = monthlyHours * 12;

    return {
      monthly: {
        revenue: monthlyRevenue,
        profit: monthlyProfit,
        hours: monthlyHours,
        sessions: projectionInputs.sessionsPerWeek * projectionInputs.weeksPerMonth * projectionInputs.seasonalMultiplier,
      },
      yearly: {
        revenue: yearlyRevenue,
        profit: yearlyProfit,
        hours: yearlyHours,
        sessions: projectionInputs.sessionsPerWeek * projectionInputs.weeksPerMonth * projectionInputs.seasonalMultiplier * 12,
      }
    };
  };

  const projections = calculateProjections();

  const seasonalOptions = [
    { value: 0.7, label: "Low Season (-30%)" },
    { value: 1, label: "Normal Season" },
    { value: 1.3, label: "Peak Season (+30%)" },
    { value: 1.5, label: "Holiday Season (+50%)" },
  ];

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <>
        <Header 
          title="Revenue Projections & Forecasting" 
          description="Project future revenue based on treatment performance" 
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
  //         title="Revenue Projections & Forecasting" 
  //         description="Project future revenue based on treatment performance" 
  //       />
  //       <Paywall 
  //         title="Revenue Projections & Forecasting"
  //         description="Plan your business growth with data-driven forecasts"
  //         feature="revenue forecasting and projections"
  //       />
  //     </>
  //   );
  // }

  return (
    <>
      <Header 
        title="Revenue Projections" 
        description="Project your business revenue based on treatment pricing and capacity" 
      />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Projection Inputs */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Projection Calculator</h3>
                  <p className="text-slate-600 text-sm mt-1">Calculate revenue based on specific treatments</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-primary h-5 w-5" />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="treatment">Select Treatment</Label>
                  <Select 
                    value={projectionInputs.selectedTreatment} 
                    onValueChange={(value) => setProjectionInputs(prev => ({...prev, selectedTreatment: value}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentsLoading ? (
                        <SelectItem value="loading" disabled>Loading treatments...</SelectItem>
                      ) : treatments?.length ? (
                        treatments.map((treatment) => (
                          <SelectItem key={treatment.id} value={treatment.id.toString()}>
                            {treatment.name} - {formatCurrency(treatment.price)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No treatments available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessions">Sessions per Week</Label>
                    <Input
                      id="sessions"
                      type="number"
                      value={projectionInputs.sessionsPerWeek || ""}
                      onChange={(e) => setProjectionInputs(prev => ({
                        ...prev, 
                        sessionsPerWeek: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="weeks">Weeks per Month</Label>
                    <Input
                      id="weeks"
                      type="number"
                      step="0.1"
                      value={projectionInputs.weeksPerMonth}
                      onChange={(e) => setProjectionInputs(prev => ({
                        ...prev, 
                        weeksPerMonth: parseFloat(e.target.value) || 4.33
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="seasonal">Seasonal Adjustment</Label>
                  <Select 
                    value={projectionInputs.seasonalMultiplier.toString()} 
                    onValueChange={(value) => setProjectionInputs(prev => ({
                      ...prev, 
                      seasonalMultiplier: parseFloat(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonalOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTreatment && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-2">Treatment Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Price:</span>
                        <p className="font-medium">{formatCurrency(selectedTreatment.price)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Duration:</span>
                        <p className="font-medium">{selectedTreatment.duration} min</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Profit Margin:</span>
                        <p className="font-medium text-success">
                          {selectedTreatment.profitMargin ? parseFloat(selectedTreatment.profitMargin.toString()).toFixed(1) : '0.0'}%
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Net Profit:</span>
                        <p className="font-medium text-success">
                          {formatCurrency(
                            (selectedTreatment.price ? parseFloat(selectedTreatment.price.toString()) : 0) - 
                            (selectedTreatment.overheadCost ? parseFloat(selectedTreatment.overheadCost.toString()) : 0)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Treatment Projections */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Revenue Projections</h3>
                  <p className="text-slate-600 text-sm mt-1">Based on your inputs</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-success h-5 w-5" />
                </div>
              </div>

              {projections ? (
                <div className="space-y-6">
                  {/* Monthly Projections */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Monthly Projections
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-primary">Revenue</p>
                        <p className="text-xl font-bold text-black">{formatCurrency(projections.monthly.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Profit</p>
                        <p className="text-xl font-bold text-black">{formatCurrency(projections.monthly.profit)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Sessions</p>
                        <p className="text-lg font-semibold text-slate-800">{projections.monthly.sessions.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Hours</p>
                        <p className="text-lg font-semibold text-slate-800">{projections.monthly.hours.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Yearly Projections */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Yearly Projections
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-primary">Revenue</p>
                        <p className="text-xl font-bold text-black">{formatCurrency(projections.yearly.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Profit</p>
                        <p className="text-xl font-bold text-black">{formatCurrency(projections.yearly.profit)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Sessions</p>
                        <p className="text-lg font-semibold text-slate-800">{projections.yearly.sessions.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Hours</p>
                        <p className="text-lg font-semibold text-slate-800">{projections.yearly.hours.toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  Select a treatment and enter session details to see projections
                </div>
              )}
            </CardContent>
          </Card>
        </div>


      </main>
    </>
  );
}
