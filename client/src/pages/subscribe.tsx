import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/header";
import { Check, Crown, Zap, Tag, Calendar, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!stripe || !elements) {
      setIsLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Subscription Successful!",
        description: "Welcome to Salon Success Manager Pro! You now have full access to all business tools.",
      });
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full bg-primary text-white hover:bg-pink-600"
        disabled={!stripe || isLoading}
      >
        {isLoading ? "Processing..." : "Subscribe Now - £23.97/month"}
      </Button>
      <p className="text-xs text-center text-slate-500 mt-2">
        Cancel anytime • Secure payment via Stripe
      </p>
    </form>
  );
};

const PromoCodeForm = () => {
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const promoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/apply-promo-code", { code });
      return response.json();
    },
    onSuccess: (data, originalCode) => {
      if (data.success) {
        toast({
          title: "Promo Code Applied!",
          description: data.message,
        });
        
        // If CLIENT6FREE code was used, simply refresh auth data
        // The auth hook will detect free_access status and App.tsx will route correctly
        if (originalCode.toUpperCase() === 'CLIENT6FREE') {
          // Invalidate and refetch auth data immediately
          queryClient.invalidateQueries({ queryKey: ["/api/v2/auth/user"] });
          queryClient.refetchQueries({ queryKey: ["/api/v2/auth/user"] });
          
          // No redirect needed - let React routing handle this automatically
          toast({
            title: "Redirecting to Dashboard...",
            description: "Setting up your free access now!",
          });
        } else {
          // For other promo codes, refresh the page
          window.location.reload();
        }
      } else {
        toast({
          title: "Invalid Promo Code",
          description: data.message || "Please check your code and try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to apply promo code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim()) {
      promoMutation.mutate(promoCode.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="promoCode">Promo Code</Label>
        <Input
          id="promoCode"
          type="text"
          placeholder="Enter your promo code"
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button 
        type="submit" 
        variant="outline"
        className="w-full"
        disabled={promoMutation.isPending || !promoCode.trim()}
      >
        {promoMutation.isPending ? "Applying..." : "Apply Promo Code"}
      </Button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-subscription")
      .then((res) => res.json())
      .then((data) => {
        console.log("Subscription response:", data);
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          console.log("No client secret received:", data);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Subscription creation error:", error);
        setIsLoading(false);
      });
  }, []);

  const features = [
    "Unlimited hourly rate calculations",
    "Advanced profit margin analysis", 
    "Multi-business management",
    "CEO numbers tracking & money pots",
    "Revenue projections & forecasting",
    "Comprehensive expense tracking",
    "Professional reports & exports",
    "Priority email support"
  ];

  if (isLoading) {
    return (
      <>
        <Header 
          title="Complete Your Subscription" 
          description="Choose your preferred payment method" 
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="Complete Your Subscription" 
        description="Choose your preferred payment method" 
      />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Payment Options */}
          <div className="space-y-6">
            
            {/* Stripe Payment Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Subscribe with Payment Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-slate-800">£23.97<span className="text-lg font-normal text-slate-600">/month</span></div>
                  <p className="text-sm text-slate-600 mt-1">Cancel anytime • Secure payment via Stripe</p>
                </div>
                
                {clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <SubscribeForm />
                  </Elements>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-600">Setting up payment form...</p>
                    <Button 
                      onClick={() => window.location.reload()} 
                      variant="outline" 
                      className="mt-2"
                    >
                      Retry Payment Setup
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Promo Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-600" />
                  Have a Promo Code?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Enter your promo code to get special access to all business tools.
                </p>
                <PromoCodeForm />
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  What's Included
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
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
    </>
  );
}