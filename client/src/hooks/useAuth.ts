import { useQuery } from "@tanstack/react-query";

type User = {
  id: number;
  email: string;
  name: string;
  businessType: string;
  subscriptionStatus: 'inactive' | 'trial' | 'active' | 'free_access' | 'cancelled';
  subscriptionEndDate: string | null;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/v2/auth/user"],
    retry: false,
  });

  const hasAccess = user && (
    user.subscriptionStatus === 'active' || 
    (user.subscriptionStatus === 'free_access' && user.subscriptionEndDate && new Date() <= new Date(user.subscriptionEndDate))
  );

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasAccess: !!hasAccess,
  };
}