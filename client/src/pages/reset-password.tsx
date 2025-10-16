import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import logoPath from "@assets/KatieGodfrey-Logo_Black.png";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [token, setToken] = useState("");
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    // Extract token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast({
        title: "Invalid reset link",
        description: "This reset link is invalid or expired",
        variant: "destructive",
      });
    }
  }, [location, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      toast({
        title: "All fields required",
        description: "Please enter and confirm your new password",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length <= 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/v2/auth/confirm-reset", { 
        token, 
        newPassword 
      });
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password",
      });
    } catch (error) {
      toast({
        title: "Reset failed",
        description: "Invalid or expired reset token. Please request a new reset link.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <Header title="Reset Password" description="Set your new password" />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <img 
                src={logoPath} 
                alt="Katie Godfrey Business Coach" 
                className="h-16 mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Invalid Reset Link
              </h1>
            </div>

            <Card className="shadow-xl border-0">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Link Invalid</CardTitle>
                <CardDescription>
                  This reset link is invalid or expired. Please request a new one.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="text-center">
                  <Link href="/forgot-password">
                    <Button className="bg-primary hover-bg-[#FFB6C1]">
                      Request New Reset Link
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Header title="Reset Password" description="Set your new password" />
      
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
              Set New Password
            </h1>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Reset Your Password</CardTitle>
              <CardDescription>
                {isSuccess 
                  ? "Password reset successfully"
                  : "Enter your new password below"
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {!isSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={6}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover-bg-[#FFB6C1]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="text-green-600 text-sm">
                    Your password has been successfully reset!
                  </div>
                  <Link href="/login">
                    <Button className="bg-primary hover-bg-[#FFB6C1]">
                      Go to Login
                    </Button>
                  </Link>
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