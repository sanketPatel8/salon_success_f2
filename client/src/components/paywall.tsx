import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, Zap, Crown } from "lucide-react";
import { Link } from "wouter";

interface PaywallProps {
  title: string;
  description: string;
  feature: string;
}

export default function Paywall({ title, description, feature }: PaywallProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Card className="max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl text-slate-800">{title}</CardTitle>
          <p className="text-slate-600 text-sm">{description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <Crown className="h-5 w-5 text-primary mr-2" />
              <span className="font-semibold text-slate-800">Pro Feature Required</span>
            </div>
            <p className="text-sm text-slate-600">
              Access to {feature} requires a Pro subscription
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-slate-600">
              <Zap className="h-4 w-4 text-green-500 mr-2" />
              Unlimited calculations & tracking
            </div>
            <div className="flex items-center text-sm text-slate-600">
              <Zap className="h-4 w-4 text-green-500 mr-2" />
              Advanced business analytics
            </div>
            <div className="flex items-center text-sm text-slate-600">
              <Zap className="h-4 w-4 text-green-500 mr-2" />
              Priority support & updates
            </div>
          </div>

          <div className="pt-4">
            <Link href="/subscribe">
              <Button className="w-full" size="lg">
                <CreditCard className="h-4 w-4 mr-2" />
                Subscribe for £23.97/month
              </Button>
            </Link>
            <p className="text-xs text-slate-500 mt-2">
              Cancel anytime • Instant access
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}