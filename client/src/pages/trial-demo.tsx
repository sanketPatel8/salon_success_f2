import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/header";
import { Check, Crown, Zap, Calendar, Tag } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TrialDemo() {
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const { toast } = useToast();
  
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

  const promoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/apply-promo-code", { code });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPromoApplied(true);
        toast({
          title: "Promo Code Applied!",
          description: data.message,
        });
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

  const handlePromoCode = () => {
    if (promoCode.trim()) {
      promoMutation.mutate(promoCode.trim());
    }
  };

  return (
    <>
      <Header 
        title="Salon Success Manager Pro" 
        description="14-Day Free Trial Available" 
      />
      
      {/* 14-Day Trial Banner */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Calendar className="h-6 w-6" />
            <span className="text-xl font-bold">14-Day FREE Trial</span>
          </div>
          <p className="text-pink-100">Start your free trial today - no payment required until day 15!</p>
        </div>
      </div>
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Features */}
            <div>
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Zap className="h-6 w-6 text-primary mr-2" />
                    <h3 className="text-xl font-bold text-slate-800">Everything You Need</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-pink-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-800">£23.97</div>
                      <div className="text-sm text-slate-600">per month</div>
                      <div className="text-xs text-slate-500 mt-1">Cancel anytime</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trial Start */}
            <div>
              <Card className="max-w-md mx-auto">
                <CardContent className="p-6 text-center">
                  <Crown className="mx-auto h-12 w-12 text-primary mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Start Your Free Trial</h3>
                  <p className="text-slate-600 mb-6">Get instant access to all business tools and features for 14 days completely free.</p>
                  
                  {/* Promo Code Section */}
                  {!promoApplied && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Tag className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm font-semibold text-blue-800">Have a discount code?</span>
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          type="text"
                          placeholder="Enter discount code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="text-sm"
                        />
                        <Button 
                          onClick={handlePromoCode}
                          variant="outline" 
                          size="sm"
                          className="whitespace-nowrap"
                          disabled={promoMutation.isPending || !promoCode.trim()}
                        >
                          {promoMutation.isPending ? "Applying..." : "Apply"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Free Access from Promo Code */}
                  {promoApplied && (
                    <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-bold text-green-800 mb-2">🎉 Discount Code Applied!</h4>
                      <p className="text-xs text-green-700 mb-3">
                        Congratulations! You now have FREE access to all premium features.
                      </p>
                      <Button 
                        className="bg-green-600 text-white hover:bg-green-700 w-full"
                        onClick={() => window.location.href = '/dashboard'}
                      >
                        Access Your Dashboard
                      </Button>
                    </div>
                  )}

                  {/* Regular Trial Button */}
                  {!promoApplied && (
                    <>
                      <Button 
                        className="bg-primary text-white hover:bg-pink-600 w-full mb-2"
                      >
                        Start 14-Day FREE Trial
                      </Button>
                      <p className="text-xs text-slate-500">
                        No payment required for 14 days. Then £23.97/month.
                      </p>
                    </>
                  )}

                  <div className="mt-6 p-4 bg-green-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-green-800 mb-2">✓ {promoApplied ? 'FREE Access' : '14-Day Trial'} Benefits:</h4>
                    <div className="text-xs text-green-700 space-y-1">
                      <div>• Full access to all features</div>
                      <div>• No credit card required</div>
                      <div>• Cancel anytime{!promoApplied ? ' during trial' : ''}</div>
                      {!promoApplied && <div>• Automatic billing after 14 days</div>}
                      {promoApplied && <div>• Completely FREE forever</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}