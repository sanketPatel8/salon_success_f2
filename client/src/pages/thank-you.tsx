// ThankYou.tsx - Token-based verification
"use client";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Mail, LogIn, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function ThankYou() {
  const [location] = useLocation();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>("");

  // Extract token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    // Verify token validity
    const verifyToken = async () => {
      if (!token) {
        setIsValid(false);
        setError("Invalid verification link");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-registration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          setIsValid(true);
          // Initialize Meta Pixel
          initializeMetaPixel();
        } else {
          setIsValid(false);
          setError("Verification link has expired or is invalid");
        }
      } catch (err) {
        setIsValid(false);
        setError("Failed to verify registration");
      }
    };

    verifyToken();
  }, [token]);

  const initializeMetaPixel = () => {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod ?
    n.callMethod.apply(n,arguments) : n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    
    fbq('init', '544990893994369');
    fbq('track', 'PageView');
    fbq('track', 'Purchase');
  };

  if (isValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600">Verifying your registration...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValid) {
    const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/register';
    } catch (error) {
      window.location.href = '/register';
    }
  };
   handleLogout();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
          </div>
          
          <CardTitle className="text-3xl font-bold">
            Welcome! 🎉
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold text-slate-900">
              Account Created Successfully
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Your Salon Success Manager account is ready to go! Start your subscription now to unlock all premium features.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/help" className="block">
              <Button size="lg" className="w-full text-base text-white">
                <LogIn className="w-4 h-4 mr-2 text-white" />
                Start Your 3-Day Trial
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-slate-500">
            Questions? Contact us at{" "}
            <a href="mailto:help@salonsuccessmanager.com" className="text-primary hover:underline">
              help@salonsuccessmanager.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}