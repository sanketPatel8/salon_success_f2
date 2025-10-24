
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Mail, Phone, MessageCircle, Book, Video, FileText, Calculator, Clock, Percent, Receipt, Package, TrendingUp, DollarSign, Crown, Zap, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Loader2, Gift, Calendar } from "lucide-react";
import Header from "@/components/header";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast.ts";

export default function Help() {
  const [activeTab, setActiveTab] = useState("subscribe");
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [priceId, setPriceId] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
const [loadingProgress, setLoadingProgress] = useState(0);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchSubscriptionStatus();
    fetchPriceId();
  }, []);

  const fetchPriceId = async () => {
    try {
      const response = await fetch('/api/config/price-id', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPriceId(data.priceId);
      }
    } catch (error) {
      console.error('Failed to fetch price ID:', error);
    }
  };

  const fetchSubscriptionStatus = async () => {
  try {
    setSubscribeLoading(true);
    setLoadingProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) return 90;
        return prev + Math.random() * 40;
      });
    }, 200);

    const response = await fetch(`/subscription-status`, {
      credentials: 'include',
    });
    
    clearInterval(progressInterval);
    setLoadingProgress(100);

    if (response.ok) {
      const data = await response.json();
      setSubscription(data);
    }
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to fetch subscription status",
      variant: "destructive",
    });
  } finally {
    setSubscribeLoading(false);
    setLoadingProgress(0);
  }
};

  const handleSubscribe = async (priceId) => {
    try {
      setActionLoading(true);
      
      const endpoint = (subscription?.status === 'canceled' || subscription?.status === 'past_due')
        ? '/api/stripe/create-session'
        : '/api/stripe/create-checkout-session';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const session = await response.json();
      
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start checkout process: ${errorMessage}. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setActionLoading(true);
      
      const response = await fetch(`/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      if (data.status) {
        toast({
          title: "Success",
          description: "Subscription cancelled successfully",
        });
        await fetchSubscriptionStatus();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setShowCancelDialog(false);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      setActionLoading(true);
      
      const response = await fetch(`/reactivate-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Subscription reactivated successfully",
        });
        await fetchSubscriptionStatus();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reactivate subscription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setShowReactivateDialog(false);
    }
  };

  const handleSyncSubscription = async () => {
    try {
      setActionLoading(true);
      await fetchSubscriptionStatus();
      toast({
        title: "Success",
        description: "Subscription synced with Stripe",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync subscription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (subscription.status === 'free_access') {
      return <Badge className="bg-green-500 hover:bg-green-600">Free Access</Badge>;
    }

    if (subscription.isTrial) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Trial Active</Badge>;
    }

    if (subscription.status === 'active') {
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    }

    if (subscription.status === 'past_due') {
      return <Badge variant="destructive">Payment Failed</Badge>;
    }

    if (subscription.status === 'canceled') {
      return <Badge variant="secondary">Cancelled</Badge>;
    }

    return <Badge variant="outline">Inactive</Badge>;
  };

  const features = [
    "Perfect Pricing Calculator",
    "Track Your Salon's Income",
    "Keep on Top of Your Expenses",
    "Money goal setting tracker",
    "Katie's famous CEO Numbers formula",
    "Money Pot System",
    "Instant Profit Insights",
    "One Place for All Your Businesses",
    "Simple, Professional Reports",
    "Bonus Support & Community"
  ];

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 pb-6">
      <Header 
        title="Help & Support" 
        description="Get help with your Salon Success Manager and contact our support team"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6 mx-2 sm:mx-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1 sm:gap-0">
          <TabsTrigger value="subscribe" className="text-xs sm:text-sm px-2 py-2 flex items-center gap-1">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            Subscribe Pro
          </TabsTrigger>
          <TabsTrigger value="getting-started" className="text-xs sm:text-sm px-2 py-2">
            Getting Started
          </TabsTrigger>
          <TabsTrigger value="features" className="text-xs sm:text-sm px-2 py-2">
            Features Guide
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs sm:text-sm px-2 py-2">
            FAQ
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs sm:text-sm px-2 py-2">
            Contact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Video className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Quick Start Video
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Watch a 5-minute overview of your Salon Success Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4 sm:pb-6">
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center mb-3 sm:mb-4">
                  <div className="text-center">
                    <Video className="h-8 w-8 sm:h-12 sm:w-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-slate-500">Tutorial video coming soon</p>
                  </div>
                </div>
                <Button className="w-full text-sm text-white">Watch Tutorial</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Book className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Step-by-Step Guide
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Follow our comprehensive setup guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 pb-4 sm:pb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-xs">1</Badge>
                  <span className="text-xs sm:text-sm">Set up your business profile</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-xs">2</Badge>
                  <span className="text-xs sm:text-sm">Calculate your hourly rate</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-xs">3</Badge>
                  <span className="text-xs sm:text-sm">Track expenses and revenue</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="text-xs">4</Badge>
                  <span className="text-xs sm:text-sm">Review your CEO numbers</span>
                </div>
                <Button variant="outline" className="w-full mt-3 sm:mt-4 text-sm" onClick={() => setActiveTab("features")}>
                  View Full Guide
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  Hourly Rate Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 pb-4 sm:pb-6">
                <p>Calculate your optimal hourly rate based on:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Business expenses</li>
                  <li>Desired salary</li>
                  <li>Working hours</li>
                  <li>Profit margins</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Percent className="h-3 w-3 sm:h-4 sm:w-4" />
                  Profit Margin Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 pb-4 sm:pb-6">
                <p>Analyse profitability of services:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Service costs vs. pricing</li>
                  <li>Profit margin analysis</li>
                  <li>Pricing recommendations</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Receipt className="h-3 w-3 sm:h-4 sm:w-4" />
                  Expense Tracker
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 pb-4 sm:pb-6">
                <p>Monitor business expenses:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Track all business costs</li>
                  <li>Categorise expenses</li>
                  <li>Monthly summaries</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                  Stock Budget Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 pb-4 sm:pb-6">
                <p>Plan your stock purchases:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Budget allocation</li>
                  <li>Inventory planning</li>
                  <li>Cost management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  CEO Numbers
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 pb-4 sm:pb-6">
                <p>Key business metrics:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>Revenue tracking</li>
                  <li>Profit analysis</li>
                  <li>Growth indicators</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  Reports & Export
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2 pb-4 sm:pb-6">
                <p>Generate professional reports:</p>
                <ul className="list-disc list-inside text-xs space-y-1 text-slate-600">
                  <li>PDF reports</li>
                  <li>CSV exports</li>
                  <li>Email sharing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subscribe" className="space-y-4 sm:space-y-6">
          {subscribeLoading && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-slate-700">Loading subscription details...</p>
                  <span className="text-xs text-slate-500">{Math.round(loadingProgress)}%</span>
                </div>
                <Progress value={loadingProgress} className="h-2" />
              </div>
            </div>
          )}
          
          {!subscribeLoading && (
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Current Status Card */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-pink-500" />
                      Current Status
                    </CardTitle>
                    {getStatusBadge()}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscription?.hasAccess ? (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">
                            {subscription.isTrial 
                              ? `Trial Active`
                              : subscription.status === 'free_access'
                              ? 'Free Access Active'
                              : 'Full Access Active'}
                          </p>
                          {subscription.isTrial && subscription.daysLeft !== null && (
                            <p className="text-sm text-slate-600">{subscription.daysLeft} days remaining</p>
                          )}
                        </div>
                      </div>

                      {subscription.endDate && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-slate-600" />
                          <div className="text-sm">
                            <p className="font-medium text-slate-700">
                              {subscription.cancelAtPeriodEnd ? 'Access ends' : 'Next billing'}
                            </p>
                            <p className="text-slate-600">
                              {new Date(subscription.endDate).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      )}

                      {subscription.amount && subscription.currency && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-600">Monthly Price</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {new Intl.NumberFormat('en-GB', {
                              style: 'currency',
                              currency: subscription.currency.toUpperCase(),
                            }).format(subscription.amount / 100)}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 pt-4 border-t">
                        {subscription.status !== 'free_access' && (
                          subscription.cancelAtPeriodEnd ? (
                            <Button
                              onClick={() => setShowReactivateDialog(true)}
                              disabled={actionLoading}
                              className="w-full bg-green-600 hover:bg-green-700"
                            >
                              {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                              Reactivate Subscription
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setShowCancelDialog(true)}
                              disabled={actionLoading}
                              variant="destructive"
                              className="w-full"
                            >
                              {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                              Cancel Subscription
                            </Button>
                          )
                        )}
                        
                        <Button
                          onClick={handleSyncSubscription}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className={`mr-2 w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                          Sync with Stripe
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <XCircle className="w-6 h-6 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-slate-800">No Active Subscription</p>
                          <p className="text-sm text-slate-600">Subscribe to access all features</p>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button
                          onClick={handleSyncSubscription}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full"
                        >
                          <RefreshCw className={`mr-2 w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                          Check Stripe Status
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Pricing Card - Only show when no access */}
              {!subscription?.hasAccess && (
                <Card className="border-pink-200 shadow-lg bg-gradient-to-br from-pink-50 to-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-pink-500" />
                      Salon Success Manager Pro
                    </CardTitle>
                    <CardDescription>
                      Complete business management tools for salon professionals
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-pink-600">
                        £23.97
                        <span className="text-lg font-normal text-slate-600">/month</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        3-day free trial • Cancel anytime
                      </p>
                    </div>

                    <Button
                      onClick={() => handleSubscribe(priceId)}
                      disabled={actionLoading}
                      className="w-full bg-primary text-white hover:bg-pink-600"
                      size="lg"
                    >
                      {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                      {subscription?.isTrial || subscription?.status === 'canceled' 
                        ? 'Subscribe Now - £23.97/month' 
                        : 'Start 3-Day Free Trial'}
                    </Button>

                    <p className="text-xs text-slate-500 text-center">
                      {subscription?.isTrial || subscription?.status === 'canceled'
                        ? 'Secure payment via Stripe • Cancel anytime'
                        : 'Cancel anytime during trial without charge.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Features List */}
            <div className="lg:sticky lg:top-8 lg:h-fit">
              <Card className="shadow-lg border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-pink-500" />
                    What's Included
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <p className="text-xs text-slate-500 text-center">
                      Join hundreds of beauty professionals growing their businesses with our proven system
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </TabsContent>

        <TabsContent value="faq" className="space-y-4 sm:space-y-6">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">How do I calculate my ideal hourly rate?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Use the Hourly Rate Calculator to input your business expenses, desired salary, and working hours. It will generate a recommended hourly rate that ensures profitability and covers all your outgoings. Once you know your hourly rate, you can make sure all your treatments and services are priced correctly.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">This is the number one mistake we see in beauty businesses, pricing that doesn't reflect the true cost of running the business.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">How do I use the Profit Margin Calculator?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">With the Profit Margin Calculator, you can input your treatments or training courses, their prices, and the time it takes to deliver each service. The calculator will then show you exactly how much profit you're making, or if you're actually making a loss. Plus the profit percentage of each service.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">This is a crucial step in understanding whether your services are priced correctly and sustainably.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">How to Use the Expense Tracker</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">This tool makes it easy to track your monthly business spending. It helps you clearly see where your money is going, so you can understand your outgoings, stay in control of your finances, and feed accurate figures into the Hourly Rate Calculator.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">What is the Stock Budget Calculator?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">One of the most common issues we see is business owners not knowing how much to budget for stock each month. Many simply purchase as and when needed, or store excess stock in treatment rooms and retail shelves, without realising that's their money just sitting there.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">Another challenge arises when handing over stock management to team members, often, they don't know how much they're allowed to spend, which leads to over- or under-ordering.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">The Stock Budget Calculator helps you track your average monthly stock spend so you can set clear budgets and keep better control of your cash flow.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">What is the Revenue Projections Tool?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">This tool is perfect for helping you understand how many treatments or services you need to offer to reach your income goals.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">One of the most common questions we get is: "How can I make more money?"</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">Whether you want to boost your revenue by a specific amount or set new targets, this tool shows you exactly which treatments to focus on and how many clients you need to hit those goals. It takes the guesswork out of planning and helps you make smarter business decisions.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">What is CEO Numbers?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">CEO Numbers is Katie Godfrey's proven formula that has helped thousands of business owners take control of their finances and finally understand their numbers.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">One of the biggest problems in the industry is that 95% of business owners don't know their key figures, including how much they actually turn over.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">This tool allows you to input what you make each week and track it clearly, so you can understand your income and make informed decisions. Even better, it guides you on exactly how much money to set aside each week into separate accounts or "money pots", helping you manage your finances with clarity and confidence.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">You can customise the pots and amounts based on what your business needs most, whether it's tax, wages, stock, savings, or growth.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">What are Money Pots?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Money Pots are a simple but powerful way to manage your business finances by dividing your income into separate accounts or "pots" for specific purposes.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">You can create your own Money Pots based on what your business needs. For example, if you're VAT registered, a VAT Pot is essential to make sure you're never caught short. I also always recommend setting up a Profit Pot, so you're consistently putting money aside for growth or rewards.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">You decide how many pots you want and what percentage of your income goes into each one.</p>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium leading-relaxed">Each week, when you complete your CEO Numbers, you'll log into your bank and transfer money from your current account into each of your pots, keeping everything organised and giving you full control over your cash flow.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Can I track multiple businesses?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Yes, the system supports multiple business tracking. You can switch between different businesses in your CEO Numbers dashboard.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">How do I export my reports?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Go to Reports & Export, select your date range and report type, then choose from PDF, CSV, print, or email options.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">What's included in the Pro subscription?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Pro subscription (£23.97/month) includes unlimited access to all calculators, advanced reporting, export features, and priority support.</p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Can I cancel my subscription anytime?</h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Get in Touch</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Need help? Our support team is here to assist you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-4 sm:pb-6">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm sm:text-base">Email Support</p>
                    <p className="text-xs sm:text-sm text-slate-600 break-all">help@salonsuccessmanager.com</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">Response Times</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Expected response times for support requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pb-4 sm:pb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm">Email Support</span>
                  <Badge variant="outline" className="text-xs">24-48 hours</Badge>
                </div>
                
               
                  <Button 
                    className="w-full text-sm text-white"
                    onClick={() => window.open('mailto:help@salonsuccessmanager.com?subject=Salon Success Manager Support Request', '_blank')}
                  >
                    Send Email
                  </Button>
                
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}