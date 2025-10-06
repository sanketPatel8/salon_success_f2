import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/header";
import { Clock, Percent, DollarSign, Bath, Calculator, TrendingUp, Lightbulb, Zap, Upload, FileText, GraduationCap, Crown, AlertTriangle, Mail } from "lucide-react";
import { formatPercentage } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// Mock subscription check - in real app this would check user's subscription status
const hasActiveSubscription = false;

export default function Dashboard() {
  const { toast } = useToast();
  const { formatCurrency, setCurrencyFromUser  } = useCurrency();
  const [isEmailPending, setIsEmailPending] = useState(false);
  const [, setLocation] = useLocation();

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
        
        // 🔥 SET CURRENCY FROM USER DATA
        if (data.currency) {
          setCurrencyFromUser(data.currency);
        }
      }
    } catch (error) {
      console.error('❌ Error checking session:', error);
    }
  };

  checkSession();
  const intervalId = setInterval(checkSession, 30000);
  return () => clearInterval(intervalId);
}, [toast, setCurrencyFromUser]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics"],
  });

  const { data: recentCalculations, isLoading: calculationsLoading } = useQuery({
    queryKey: ["/api/hourly-rate-calculations"],
  });

  const { data: recentTreatments, isLoading: treatmentsLoading } = useQuery({
    queryKey: ["/api/treatments"],
  });

  const { data: trialStatus, isLoading: trialLoading } = useQuery({
    queryKey: ["/api/user/trial-status"],
  });

  const isLoading = metricsLoading || calculationsLoading || treatmentsLoading || trialLoading;

  const handleEmailReport = async () => {
    try {
      setIsEmailPending(true);
      
      const response = await fetch('/api/email-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.fallback && data.emailData) {
          // Use mailto fallback
          const subject = encodeURIComponent(data.emailData.subject);
          const body = encodeURIComponent(data.emailData.body);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
        } else {
          toast({
            title: "Report Sent",
            description: "Your business report has been sent to your email address.",
          });
        }
      } else {
        toast({
          title: "Email Failed",
          description: data.message || "Failed to send email report. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while sending the report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEmailPending(false);
    }
  };

  const quickStats = [
    {
      title: "Current Hourly Rate",
      value: metrics ? formatCurrency(metrics.hourlyRate) : "$0.00",
      change: "+12% from last month",
      changeType: "positive",
      icon: Clock,
      bgColor: "bg-blue-100",
      iconColor: "text-primary"
    },
    {
      title: "Avg Profit Margin",
      value: metrics ? `${metrics.avgProfitMargin}%` : "0%",
      change: "+5% from last month",
      changeType: "positive",
      icon: Percent,
      bgColor: "bg-pink-100",
      iconColor: "text-success"
    },
    {
      title: "Monthly Revenue",
      value: metrics ? formatCurrency(metrics.monthlyRevenue) : "$0.00",
      change: "-3% from last month",
      changeType: "negative",
      icon: DollarSign,
      bgColor: "bg-amber-100",
      iconColor: "text-warning"
    },
    {
      title: "Active Treatments",
      value: metrics?.activeTreatments?.toString() || "0",
      change: "Services offered",
      changeType: "neutral",
      icon: Bath,
      bgColor: "bg-purple-100",
      iconColor: "text-purple-600"
    }
  ];

  const quickActions = [
    {
      title: "Quick Rate Check",
      icon: Zap,
      href: "/hourly-rate",
      primary: true
    },
    {
      title: "Import Treatments",
      icon: Upload,
      href: "/profit-margin",
      primary: false
    },
    {
      title: "Email Report",
      icon: Mail,
      href: "#",
      primary: false,
      onClick: true
    },
    {
      title: "Tutorial & Help",
      icon: GraduationCap,
      href: "/help",
      primary: false
    }
  ];

  return (
    <>
      <Header 
        title="Salon Success Manager Dashboard" 
        description="Track your salon's performance, calculate optimal pricing, and manage business growth" 
      />
      
      <main className="flex-1 p-8  overflow-y-auto">
        {/* Trial Status Banner */}
        {trialStatus && trialStatus.status === "trial" && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-800 mb-6">
            <Crown className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>Free Trial Active:</strong> {trialStatus.message}
              </span>
              <Link href="/subscribe">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Subscribe Now
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {trialStatus && trialStatus.status === "expired" && (
          <Alert className="border-red-200 bg-red-50 text-red-800 mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>Trial Expired:</strong> {trialStatus.message}
              </span>
              <Link href="/subscribe">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                  Subscribe to Continue
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-600 text-sm font-medium">{stat.title}</p>
                      <p className="text-2xl font-bold text-slate-800 mt-1">
                        {isLoading ? "..." : stat.value}
                      </p>
                      <p className={`text-sm mt-2 flex items-center ${
                        stat.changeType === 'positive' ? 'text-success' :
                        stat.changeType === 'negative' ? 'text-warning' :
                        'text-slate-500'
                      }`}>
                        {stat.changeType === 'positive' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {stat.changeType === 'negative' && <TrendingUp className="h-3 w-3 mr-1 rotate-180" />}
                        {stat.change}
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`${stat.iconColor} h-6 w-6`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Calculator Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Hourly Rate Calculator Preview */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Hourly Rate Calculator</h3>
                  <p className="text-slate-600 text-sm mt-1">Calculate your optimal hourly rate based on expenses and goals</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="text-primary h-5 w-5" />
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Current Hourly Rate:</span>
                  <span className="text-2xl font-bold text-primary">
                    {isLoading ? "..." : formatCurrency(metrics?.hourlyRate || 0)}
                  </span>
                </div>
                <p className="text-slate-600 text-sm mt-2">Based on your latest calculation</p>
              </div>

              <Link href="/hourly-rate">
                <Button className="w-full bg-primary text-white hover-bg-[#FFB6C1]">
                  Open Calculator
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Treatment Profit Calculator Preview */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Treatment Profit Calculator</h3>
                  <p className="text-slate-600 text-sm mt-1">Calculate profit margins for individual treatments</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Percent className="text-success h-5 w-5" />
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Average Profit Margin:</span>
                  <span className="text-2xl font-bold text-success">
                    {isLoading ? "..." : `${metrics?.avgProfitMargin || 0}%`}
                  </span>
                </div>
                <p className="text-slate-600 text-sm mt-2">Across all your treatments</p>
              </div>

              <Link href="/profit-margin">
                <Button className="w-full bg-success text-white hover-bg-[#FFB6C1]">
                  Open Calculator
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Calculations */}
          <div className="lg:col-span-2">
            <Card className="border border-slate-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Recent Activity</h3>
                  <Button variant="ghost" className="text-primary hover:text-blue-700 text-sm font-medium">
                    View All
                  </Button>
                </div>

                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8 text-slate-500">Loading recent activity...</div>
                  ) : (
                    <>
                      {recentCalculations?.slice(0, 2).map((calc, index) => (
                        <div key={calc.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calculator className="text-primary h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">Hourly Rate Calculation</p>
                              <p className="text-sm text-slate-600">
                                {new Date(calc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCurrency(calc.calculatedRate)}/hr</p>
                            <p className="text-sm text-slate-500">{calc.desiredProfit}% target</p>
                          </div>
                        </div>
                      ))}
                      
                      {recentTreatments?.slice(0, 1).map((treatment) => (
                        <div key={treatment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                              <Bath className="text-success h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{treatment.name}</p>
                              <p className="text-sm text-slate-600">
                                {new Date(treatment.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCurrency(treatment.price)}</p>
                            <p className="text-sm text-success">{formatPercentage(treatment.profitMargin)} margin</p>
                          </div>
                        </div>
                      ))}
                      
                      {(!recentCalculations?.length && !recentTreatments?.length) && (
                        <div className="text-center py-8 text-slate-500">
                          No recent activity. Start by calculating your hourly rate!
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border border-slate-200">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Quick Actions</h3>
              
              <div className="space-y-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  if (action.onClick && action.title === "Email Report") {
                    return (
                      <Button
                        key={index}
                        onClick={handleEmailReport}
                        disabled={isEmailPending}
                        variant={action.primary ? "default" : "outline"}
                        className={`w-full justify-start space-x-3 disabled:opacity-50 ${
                          action.primary 
                            ? "bg-primary text-white hover-bg-[#FFB6C1]" 
                            : "border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{isEmailPending ? 'Sending...' : action.title}</span>
                      </Button>
                    );
                  }
                  return (
                    <Link key={index} href={action.href}>
                      <Button
                        variant={action.primary ? "default" : "outline"}
                        className={`w-full justify-start space-x-3 mt-4 ${
                          action.primary 
                            ? "bg-primary text-white hover-bg-[#FFB6C1]" 
                            : "border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{action.title}</span>
                      </Button>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 mb-4">Business Tips</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-slate-700">
                    <Lightbulb className="text-warning h-4 w-4 mr-2 inline" />
                    Paying yourself last is the fastest way to burn out. Put your wage in the budget first.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}