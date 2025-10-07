import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function SubscriptionSuccess() {
  const [location] = useLocation();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.split('?')[1]);
    const sessionId = params.get('session_id');

    if (sessionId) {
      verifySession(sessionId);
    } else {
      setVerifying(false);
    }
  }, [location]);

  const verifySession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/stripe/verify-session/${sessionId}`, {
        credentials: 'include',
      });

      if (res.ok) {
        setVerified(true);
      }
    } catch (error) {
      console.error('Failed to verify session:', error);
    } finally {
      setVerifying(false);
    }
  };

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  if (verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600">Verifying your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome to Salon Success Manager Pro!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-gray-600">
            {verified 
              ? "Your subscription has been activated successfully. You now have full access to all business management tools."
              : "Thank you for subscribing! Your subscription is being set up."}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left">
            <h3 className="font-semibold mb-2 text-blue-900">🎉 What's Next?</h3>
            <ul className="space-y-2 text-blue-800">
              <li>• Start your 15-day free trial with full access</li>
              <li>• Calculate your perfect hourly rate</li>
              <li>• Track treatments, expenses, and profits</li>
              <li>• Set income goals and monitor progress</li>
              <li>• Manage multiple business locations</li>
            </ul>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-left">
            <h3 className="font-semibold mb-2">💳 Trial Information</h3>
            <p className="text-gray-600">
              Your 15-day free trial starts now. You won't be charged until the trial ends. 
              After the trial, you'll be billed £23.97 per month. Cancel anytime before the trial ends to avoid charges.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button
              onClick={() => navigateTo('/')}
              className="bg-pink-600 hover:bg-pink-700"
              size="lg"
            >
              Go to Dashboard
            </Button>
            <Button
              onClick={() => navigateTo('/subscribe')}
              variant="outline"
              size="lg"
            >
              View Subscription
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}