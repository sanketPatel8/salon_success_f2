import { useEffect, useState, ReactNode } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SubscriptionGuardProps {
  children: ReactNode;
  requireActive?: boolean; // If true, requires active subscription (not just trial)
}

interface SubscriptionStatus {
  hasAccess: boolean;
  status: string;
  isTrial: boolean;
  daysLeft: number | null;
}

export default function SubscriptionGuard({ 
  children, 
  requireActive = false 
}: SubscriptionGuardProps) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      // Use the route from routes.ts
      const res = await fetch('/subscription-status', {
        credentials: 'include',
      });

      if (!res.ok) {
        // User not authenticated or error
        window.location.href = '/login';
        return;
      }

      const data = await res.json();
      setSubscription(data);

      // Check if user has access
      if (!data.hasAccess) {
        setLoading(false);
        return; // Show upgrade prompt
      }

      // If requireActive is true, check for active subscription (not trial)
      if (requireActive && data.isTrial) {
        setLoading(false);
        return; // Show upgrade from trial prompt
      }

      setLoading(false);
    } catch (error) {
      console.error('Subscription check failed:', error);
      window.location.href = '/login';
    }
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // User has access - render children
  if (subscription?.hasAccess && (!requireActive || !subscription.isTrial)) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card className="border-pink-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-pink-600" />
          </div>
          <CardTitle className="text-2xl">
            {requireActive && subscription?.isTrial 
              ? 'Premium Feature'
              : 'Subscription Required'}
          </CardTitle>
          <CardDescription>
            {requireActive && subscription?.isTrial
              ? 'This feature is available to paid subscribers. Upgrade now to unlock.'
              : 'Subscribe to access all business management tools and grow your salon.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {subscription?.isTrial && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="text-blue-900">
                🎉 You're currently on a free trial with {subscription.daysLeft} days remaining.
                {requireActive && ' Upgrade to a paid plan to access this feature.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold">What you'll get:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✓ Perfect Pricing Calculator</li>
              <li>✓ Track Your Salon’s Income</li>
              <li>✓ Keep on Top of Your Expenses</li>
              <li>✓ Money goal setting tracker</li>
              <li>✓ Katie’s famous CEO Numbers formula</li>
              <li>✓ Money Pot System</li>
              <li>✓ Instant Profit Insights</li>
              <li>✓ One Place for All Your Businesses</li>
              <li>✓ Simple, Professional Reports</li>
              <li>✓ Bonus Support & Community</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-600">£23.97/month</p>
              <p className="text-sm text-gray-600">
                {!subscription?.isTrial && '3-day free trial • '}
                Cancel anytime
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigateTo('/subscribe')}
              className="flex-1 bg-primary text-white hover-bg-[#FFB6C1]"
              size="lg"
            >
              {subscription?.isTrial ? 'Upgrade Now' : 'Start Free Trial'}
            </Button>
            
          </div>
        </CardContent>
      </Card>
    </div>
  );
}