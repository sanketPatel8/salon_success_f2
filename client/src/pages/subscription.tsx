import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Calendar, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const getStatusBadge = () => {
    if (!subscription) return null;

    if (subscription.status === 'free_access') {
      return <Badge className="bg-green-500">Free Access</Badge>;
    }

    if (subscription.isTrial) {
      return <Badge className="bg-blue-500">Trial Active</Badge>;
    }

    if (subscription.status === 'active') {
      return <Badge className="bg-green-500">Active</Badge>;
    }

    if (subscription.status === 'past_due') {
      return <Badge variant="destructive">Payment Failed</Badge>;
    }

    if (subscription.status === 'canceled') {
      return <Badge variant="secondary">Cancelled</Badge>;
    }

    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>

      {/* Current Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Status</CardTitle>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Manage your Salon Success Manager subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.hasAccess ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-medium">
                  {subscription.isTrial 
                    ? `Trial active - ${subscription.daysLeft} days remaining`
                    : subscription.status === 'free_access'
                    ? 'Free access active'
                    : 'Full access active'}
                </span>
              </div>

              {subscription.endDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {subscription.cancelAtPeriodEnd 
                      ? `Access ends: ${new Date(subscription.endDate).toLocaleDateString()}`
                      : `Next billing: ${new Date(subscription.endDate).toLocaleDateString()}`}
                  </span>
                </div>
              )}

              {subscription.amount && subscription.currency && (
                <div className="text-sm text-gray-600">
                  Price: {new Intl.NumberFormat('en-GB', {
                    style: 'currency',
                    currency: subscription.currency.toUpperCase(),
                  }).format(subscription.amount / 100)} per month
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-4">
                {subscription.status !== 'free_access' && (
                  <>

                    {subscription.cancelAtPeriodEnd ? (
                      <Button
                        onClick={handleReactivateSubscription}
                        disabled={actionLoading}
                      >
                        {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                        Reactivate Subscription
                      </Button>
                    ) : (
                      <Button
                        onClick={handleCancelSubscription}
                        disabled={actionLoading}
                        variant="destructive"
                      >
                        {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
                        Cancel Subscription
                      </Button>
                    )}
                  </>
                )}
                
                <Button
                  onClick={handleSyncSubscription}
                  disabled={actionLoading}
                  variant="secondary"
                  className="ml-auto"
                >
                  <RefreshCw className={`mr-2 w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  Sync with Stripe
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="font-medium">No active subscription</span>
              </div>
              <p className="text-sm text-gray-600">
                Subscribe now to access all business management tools
              </p>
              
              <div className="pt-4">
                <Button
                  onClick={handleSyncSubscription}
                  disabled={actionLoading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`mr-2 w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
                  Check Stripe Status
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Pricing Card */}
      {!subscription?.hasAccess && (
        <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
          <CardHeader>
            <CardTitle>Salon Success Manager Pro</CardTitle>
            <CardDescription>
              Complete business management tools for salon professionals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-4xl font-bold text-pink-600">
                £27
                <span className="text-lg font-normal text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                15-day free trial • Cancel anytime
              </p>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Treatment pricing & profit margin analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Expense tracking & financial reporting</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Multi-business management</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Weekly income tracking & goals</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Money pot budgeting system</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Priority email support</span>
              </li>
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={actionLoading}
              className="w-full bg-pink-600 hover:bg-pink-700"
              size="lg"
            >
              {actionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
              Start 3-Day Free Trial
            </Button>

            <p className="text-xs text-gray-500 text-center">
              No credit card required for trial. Cancel anytime during trial without charge.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}   