import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Crown, Zap, Calendar, Gift, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionData {
  status: string;
  hasAccess: boolean;
  endDate: string | null;
  isTrial: boolean;
  daysLeft: number | null;
  cancelAtPeriodEnd?: boolean;
  amount?: number;
  currency?: string;
  subscriptionId?: string;
}

export default function Subscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [priceId, setPriceId] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const { toast } = useToast();

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
      setLoading(true);
      const response = await fetch(`/subscription-status`, {
        credentials: 'include',
      });
      
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
      setLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string): Promise<void> => {
    try {
      console.log('Starting checkout for price:', priceId);
      
      const response = await fetch(`/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const session = await response.json();
      console.log('Session created:', session);
      
      if (session.url) {
        window.open(session.url, '_blank');
      } else {
        throw new Error('No checkout URL received from server');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start checkout process: ${errorMessage}. Please try again.`);
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
    "Treatment pricing & profit margin analysis",
    "Expense tracking & financial reporting",
    "Multi-business management",
    "Weekly income tracking & goals",
    "Money pot budgeting system",
    "CEO numbers tracking & forecasting",
    "Professional reports & exports",
    "Priority email support"
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  console.log("priceID", priceId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Subscription Management</h1>
          <p className="text-slate-600">Manage your Salon Success Manager subscription</p>
        </div>

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
                      15-day free trial • Cancel anytime
                    </p>
                  </div>

                  <Button
                    onClick={() => handleSubscribe(priceId)}
                    disabled={actionLoading}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                    size="lg"
                  >
                    {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                    {subscription?.isTrial || subscription?.status === 'canceled' 
                      ? 'Subscribe Now - £23.97/month' 
                      : 'Start 15-Day Free Trial'}
                  </Button>

                  <p className="text-xs text-slate-500 text-center">
                    {subscription?.isTrial || subscription?.status === 'canceled'
                      ? 'Secure payment via Stripe • Cancel anytime'
                      : 'No credit card required for trial. Cancel anytime during trial without charge.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Features List - Always visible */}
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
      </div>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-white border-pink-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-slate-800">Cancel Subscription?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to cancel your subscription? You'll continue to have access until{' '}
              {subscription?.endDate && (
                <span className="font-semibold text-slate-700">
                  {new Date(subscription.endDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              )}
              , after which you'll lose access to all premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-slate-300 hover:bg-slate-100"
              disabled={actionLoading}
            >
              Keep Subscription
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSubscription}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Yes, Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Subscription Confirmation Dialog */}
      <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
        <AlertDialogContent className="bg-white border-pink-200">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <AlertDialogTitle className="text-slate-800">Reactivate Subscription?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-600">
              Welcome back! By reactivating your subscription, you'll continue to have uninterrupted access to all premium features. Your subscription will automatically renew on{' '}
              {subscription?.endDate && (
                <span className="font-semibold text-slate-700">
                  {new Date(subscription.endDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              )}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="border-slate-300 hover:bg-slate-100"
              disabled={actionLoading}
            >
              Not Now
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReactivateSubscription}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Yes, Reactivate Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}