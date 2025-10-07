import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, RefreshCw, Crown, Zap, Calendar, Gift } from 'lucide-react';
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
}

export default function Subscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch('/api/stripe/subscription', {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create checkout session',
        variant: 'destructive',
      });
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to cancel subscription');
      }

      const data = await res.json();
      toast({
        title: 'Subscription Cancelled',
        description: data.message,
      });
      
      await fetchSubscription();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      const data = await res.json();
      toast({
        title: 'Subscription Reactivated',
        description: data.message,
      });
      
      await fetchSubscription();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/stripe/sync-subscription', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      toast({
        title: 'Subscription Synced',
        description: 'Your subscription has been synced with Stripe',
      });
      
      await fetchSubscription();
    } catch (error: any) {
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync subscription',
        variant: 'destructive',
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
                            onClick={handleReactivateSubscription}
                            disabled={actionLoading}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                            Reactivate Subscription
                          </Button>
                        ) : (
                          <Button
                            onClick={handleCancelSubscription}
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
                    onClick={handleSubscribe}
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
    </div>
  );
}