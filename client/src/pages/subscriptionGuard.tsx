import { useEffect, useState, ReactNode } from 'react';
import { Loader2, Lock, MonitorPlay, Calculator, TrendingUp, Users, Calendar  } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubscriptionGuardProps {
  children: ReactNode;
  requireActive?: boolean;
  pageType?: 'default' | 'community';
}

interface SubscriptionStatus {
  hasAccess: boolean;
  status: string;
  isTrial: boolean;
  daysLeft: number | null;
}

export default function SubscriptionGuard({ 
  children, 
  requireActive = false,
  pageType = 'default'
}: SubscriptionGuardProps) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);

  useEffect(() => {
    checkSubscription();

    const handleSubscriptionUpdate = (event: CustomEvent) => {
      const data = event.detail as SubscriptionStatus;
      setSubscription(data);
      setLoading(false);
    };

    window.addEventListener('subscriptionStatusUpdated', handleSubscriptionUpdate as EventListener);

    return () => {
      window.removeEventListener('subscriptionStatusUpdated', handleSubscriptionUpdate as EventListener);
    };
  }, [forceRefresh]);

  const checkSubscription = async () => {
    try {
      const cached = sessionStorage.getItem('subscription_status');
      if (cached) {
        const cachedData = JSON.parse(cached);
        setSubscription(cachedData);
        setLoading(false);
      }

      const res = await fetch('/subscription-status', {
        credentials: 'include',
      });

      if (!res.ok) {
        window.location.href = '/login';
        return;
      }

      const data = await res.json();
      sessionStorage.setItem('subscription_status', JSON.stringify(data));
      setSubscription(data);

      if (!data.hasAccess) {
        setLoading(false);
        return;
      }

      if (requireActive && data.isTrial) {
        setLoading(false);
        return;
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

  const handleRefresh = () => {
    setLoading(true);
    setForceRefresh(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (subscription?.hasAccess && (!requireActive || !subscription.isTrial)) {
    return <>{children}</>;
  }

  // Community page style
  if (pageType === 'community') {
    return (
      <div className="min-h-screen mt-[30px] md:mt-0 bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-12 text-center">
          {/* Lock Icon */}
          <div className="mx-auto w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold mb-4">
            Members Area Only
          </h2>

          {/* Description */}
          <p className="text-gray-500 text-md leading-relaxed mb-8 max-w-xl mx-auto">
            This exclusive area is available to our paying members. Subscribe to unlock monthly live calls with Katie, £1,500+ of business training, and our private community.
          </p>

          {/* What you'll get access to */}
          <div className="mb-8 bg-blue-50 p-8 rounded-lg">
            <h3 className="font-semibold  text-left font-medium mb-6">
              What you'll get access to:
            </h3>
            <div className="space-y-3 text-left max-w-md">
              <div className="flex items-start gap-3">
                <span className=" text-xl"><MonitorPlay className='text-primary'/></span>
                <span className="text-gray-600">Welcome video & getting started guide</span>
              </div>
              <div className="flex items-start gap-3">
                <span className=" text-xl">< Calendar className='text-primary'/></span>
                <span className="text-gray-600">Monthly live accountability calls with Katie</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl">< TrendingUp className='text-primary'/></span>
                <span className="text-gray-600">£1,500+ worth of business training</span>
              </div>
              <div className="flex items-start gap-3">
                <span className=" text-xl"><Users className='text-primary'/></span>
                <span className="text-gray-600">Private Facebook Community</span>
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          <Button
            onClick={() => navigateTo('/help')}
            className="bg-primary hover:bg-primary/80 text-white font-medium px-12 py-6 text-md  shadow-md transition-all duration-200"
            size="lg"
          >
            Subscribe to Unlock Access
          </Button>

          {/* Footer Note */}
          <p className="text-gray-400 text-sm mt-6">
            Part of our community of successful salon owners
          </p>
        </div>
      </div>
    );
  }

  // Default style (your original design)
  return (
    <div className="container mt-[40px] md:mt-0 max-w-2xl mx-auto py-12 px-4">
      <div className="border border-pink-200 rounded-lg bg-white shadow-sm">
        <div className="text-center p-6 border-b">
          <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">
            {requireActive && subscription?.isTrial 
              ? 'Premium Feature'
              : 'Subscription Required'}
          </h2>
          <p className="text-gray-600">
            {requireActive && subscription?.isTrial
              ? 'This feature is available to paid subscribers. Upgrade now to unlock.'
              : 'Subscribe to access all business management tools and grow your salon.'}
          </p>
        </div>
        <div className="p-6 space-y-6">
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
              <li>✓ Track Your Salon's Income</li>
              <li>✓ Keep on Top of Your Expenses</li>
              <li>✓ Money goal setting tracker</li>
              <li>✓ Katie's famous CEO Numbers formula</li>
              <li>✓ Money Pot System</li>
              <li>✓ Instant Profit Insights</li>
              <li>✓ One Place for All Your Businesses</li>
              <li>✓ Simple, Professional Reports</li>
              <li>✓ Bonus Support & Community</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-pink-600">£27/month</p>
              <p className="text-sm text-gray-600">
                {!subscription?.isTrial && '3-day free trial • '}
                Cancel anytime
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigateTo('/help')}
              className="flex-1 bg-primary text-white hover:bg-primary/80"
              size="lg"
            >
              {subscription?.isTrial ? 'Upgrade Now' : 'Start Free Trial'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}