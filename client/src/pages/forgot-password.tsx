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
  const [resetLink, setResetLink] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
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
      const response = await apiRequest("POST", "/api/v2/auth/reset-password", { email });
      const data = await response.json();
      
      if (data.resetLink) {
        setResetLink(data.resetLink);
        setIsSuccess(true);
        toast({
          title: "Reset link generated",
          description: "Your password reset link is ready below",
        });
      } else {
        toast({
          title: "Reset link sent",
          description: "If that email exists, you'll receive reset instructions",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset link. Please try again.",
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
                    className="w-full bg-pink-600 hover:bg-pink-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  {resetLink ? (
                    <div className="space-y-4">
                      <div className="text-green-600 text-sm font-medium">
                        Your password reset link is ready!
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Click the link below to reset your password:
                        </p>
                        <div className="space-y-3">
                          <button
                            onClick={() => window.open(resetLink, '_self')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                          >
                            Reset Password Now
                          </button>
                          <div className="text-xs text-gray-600 dark:text-gray-400 break-all bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            <strong>Or copy this link:</strong><br/>
                            <span className="font-mono">{resetLink}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          This link expires in 1 hour for security
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-green-600 text-sm">
                      If an account with that email exists, you'll receive reset instructions shortly.
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Need to try a different email address?
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