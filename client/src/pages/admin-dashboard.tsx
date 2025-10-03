import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Crown, 
  Clock, 
  UserX, 
  Gift, 
  Search, 
  Settings,
  LogOut,
  Calendar,
  TrendingUp,
  Trash2
} from "lucide-react";

interface User {
  id: number;
  email: string;
  name: string;
  businessType: string;
  currency: string;
  subscriptionStatus: string;
  subscriptionEndDate: string | null;
  createdAt: string;
}

interface UserStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  inactiveUsers: number;
  freeUsers: number;
  recentUsers: number;
  businessTypes: Record<string, number>;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const adminPassword = localStorage.getItem("adminPassword");

  useEffect(() => {
    if (!adminPassword) {
      setLocation("/admin");
    }
  }, [adminPassword, setLocation]);

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: async (): Promise<UserStats> => {
      const response = await fetch("/api/admin/stats", {
        headers: {
          "x-admin-password": adminPassword!,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      
      return response.json();
    },
    enabled: !!adminPassword,
  });

  const { data: usersData } = useQuery({
    queryKey: ["/api/admin/users", page, searchTerm],
    queryFn: async (): Promise<UsersResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        search: searchTerm,
      });
      
      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          "x-admin-password": adminPassword!,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      
      return response.json();
    },
    enabled: !!adminPassword,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, status, endDate }: { userId: number; status: string; endDate?: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": adminPassword!,
        },
        body: JSON.stringify({ status, endDate }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update user");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "x-admin-password": adminPassword!,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "trial":
        return "bg-blue-100 text-blue-800";
      case "free":
        return "bg-purple-100 text-purple-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Crown className="w-4 h-4" />;
      case "trial":
        return <Clock className="w-4 h-4" />;
      case "free":
        return <Gift className="w-4 h-4" />;
      case "inactive":
        return <UserX className="w-4 h-4" />;
      default:
        return <UserX className="w-4 h-4" />;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminPassword");
    setLocation("/admin");
  };

  if (!adminPassword) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Salon Success Manager</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.recentUsers} this week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
                <p className="text-xs text-muted-foreground">
                  {((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}% conversion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trial Users</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.trialUsers}</div>
                <p className="text-xs text-muted-foreground">
                  In trial period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Free Access</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.freeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  Promo code users
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Business Types */}
        {stats && Object.keys(stats.businessTypes).length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Business Types</CardTitle>
              <CardDescription>Distribution of user business types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(stats.businessTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-medium">{type}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Search and manage user accounts
            </CardDescription>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users by email, name, or business type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {usersData && (
              <>
                <div className="space-y-4">
                  {usersData.users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                            <p className="text-xs text-gray-400">{user.businessType}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(user.subscriptionStatus)}
                            <Badge className={getStatusColor(user.subscriptionStatus)}>
                              {user.subscriptionStatus}
                            </Badge>
                          </div>
                          {user.subscriptionEndDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ends: {new Date(user.subscriptionEndDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              status: "active",
                              endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                            })}
                            disabled={updateUserMutation.isPending}
                          >
                            Activate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              status: "trial" 
                            })}
                            disabled={updateUserMutation.isPending}
                          >
                            Trial
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              status: "free",
                              endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
                            })}
                            disabled={updateUserMutation.isPending}
                          >
                            Free 6mo
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              status: "inactive"
                            })}
                            disabled={updateUserMutation.isPending}
                          >
                            Revoke Access
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete ${user.name} (${user.email})? This will remove all their data and cannot be undone.`)) {
                                deleteUserMutation.mutate(user.id);
                              }
                            }}
                            disabled={deleteUserMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {usersData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-500">
                      Showing {usersData.users.length} of {usersData.total} users
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        Page {page} of {usersData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === usersData.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}