import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, AlertCircle, Calendar, CreditCard, Gift } from 'lucide-react';

export default function SubscriptionSuccess() {
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      verifySession(sessionId);
    } else {
      setError('No session ID found. Please try subscribing again.');
      setVerifying(false);
    }
  }, []);

  const verifySession = async (sessionId: string) => {
    const startTime = Date.now();
    
    try {
      console.log('Verifying session:', sessionId);
      
      const res = await fetch(`/api/stripe/verify-session/${sessionId}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to verify subscription');
      }

      const data = await res.json();
      console.log('Verification response:', data);
      
      // Ensure minimum 2 second delay
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      setSubscriptionData(data);
    } catch (err: any) {
      console.error('Verification error:', err);
      
      // Ensure minimum 2 second delay even for errors
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2000 - elapsedTime);
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      setError(err.message || 'Failed to verify your subscription. Please contact support.');
    } finally {
      setVerifying(false);
    }
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount || !currency) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Loading state
  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Verifying your subscription...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl text-red-900">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-3 justify-center pt-4">
              <Button
                onClick={() => navigateTo('/subscribe')}
                className="bg-pink-600 hover:bg-pink-700"
                size="lg"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigateTo('/')}
                variant="outline"
                size="lg"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  const { status, hasAccess, isTrial, daysLeft, endDate, cancelAtPeriodEnd, amount, currency } = subscriptionData || {};

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            {isTrial ? 'Welcome to Your Free Trial!' : 'Subscription Activated!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Message */}
          <div className="text-center">
            <p className="text-gray-600 text-lg">
              {hasAccess 
                ? isTrial 
                  ? "Your 15-day free trial has started. Enjoy full access to all features!"
                  : "Your subscription is now active. Thank you for choosing Salon Success Manager Pro!"
                : "Your payment was successful, but there was an issue activating your subscription. Please contact support."}
            </p>
          </div>

          {/* Subscription Details */}
          {hasAccess && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-pink-600" />
                Subscription Details
              </h3>
              <div className="space-y-3 text-sm">
                {isTrial && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded">
                    <Gift className="w-5 h-5" />
                    <span className="font-medium">Free Trial Active - 15 days remaining</span>
                  </div>
                )}
                {amount && currency && !isTrial && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Monthly price:</span>
                    <span className="font-medium text-gray-900">{formatAmount(amount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium px-3 py-1 rounded-full text-xs ${
                    status === 'active' ? 'bg-green-100 text-green-700' :
                    status === 'trial' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {status === 'trial' ? 'Free Trial' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
              🎉 What's Next?
            </h3>
            <ul className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Calculate your perfect hourly rate based on your business goals</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Track treatments, expenses, and profits in real-time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Set income goals and monitor your progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Manage multiple business locations effortlessly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">✓</span>
                <span>Access detailed analytics and insights</span>
              </li>
            </ul>
          </div>

          {/* Trial Information */}
          {isTrial && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-2 text-gray-900">💳 Trial Information</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your 15-day free trial starts now. After the trial, you'll be billed 
                per month. You can cancel anytime before the trial ends to avoid charges.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
            <Button
              onClick={() => navigateTo('/')}
              className="bg-primary text-white hover-bg-[#FFB6C1]"
              size="lg"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => navigateTo('/subscribe')}
              variant="outline"
              size="lg"
              className="border-pink-300 text-pink-700 hover:bg-pink-50"
            >
              View Subscription
            </Button>
          </div>

          {/* Support Note */}
          <div className="text-center pt-4">
            <p className="text-xs text-gray-500">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@salonsuccess.com" className="text-pink-600 hover:underline">
                support@salonsuccess.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}