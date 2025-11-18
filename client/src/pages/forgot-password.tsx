import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import logoPath from "@assets/KatieGodfrey-Logo_Black.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use fetch directly instead of apiRequest to handle errors manually
      const response = await fetch("/api/v2/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      
      const data = await response.json();
      console.log('Reset password response:', data, 'Status:', response.status);
      
      // Handle 404 - email not found
      if (response.status === 404) {
        toast({
          title: "Email not found",
          description: data.message || "No account exists with this email address. Please register and try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle other error statuses
      if (!response.ok) {
        toast({
          title: "Error",
          description: data.message || "Failed to send reset link. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if the request was successful
      if (data.success) {
        setIsSuccess(true);
        
        // Show appropriate message based on whether email was actually sent
        if (data.emailSent) {
          toast({
            title: "Reset link sent",
            description: "Check your email for reset instructions",
          });
        } else {
          toast({
            title: "Request processed",
            description: "If the email exists, you'll receive instructions",
          });
        }
      } else {
        // Show specific error message
        toast({
          title: "Email not found",
          description: data.message || "No account exists with this email address. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      // Only network errors reach here
      toast({
        title: "Network Error",
        description: "Unable to connect. Please check your internet connection.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Header title="Forgot Password" description="Reset your account password" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src={logoPath} 
              alt="Katie Godfrey Business Coach" 
              className="h-16 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Reset Your Password
            </h1>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Forgot Password?</CardTitle>
              <CardDescription>
                {isSuccess 
                  ? "Check your email for reset instructions"
                  : "Enter your email address and we'll send you a link to reset your password"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover-bg-[#FFB6C1]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-center mb-4">
                      <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                      Reset Link Sent Successfully!
                    </h3>
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      We've sent a password reset link to <strong>{email}</strong>
                    </p>
                    <p className="text-green-600 dark:text-green-400 text-sm mt-3">
                      Please check your email inbox (and spam folder) for the reset link.
                    </p>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Didn't receive the email? try again with a different email address.
                  </div>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link href="/login">
                  <Button variant="ghost" className="text-sm">
                    ← Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Additional help */}
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>Need more help? Contact help at</p>
            <a href="mailto:help@salonsuccessmanager.com" className="text-pink-600 hover:underline">
              help@salonsuccessmanager.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}