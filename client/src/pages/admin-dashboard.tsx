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
  Trash2,
  Instagram,
  Menu,
  X
} from "lucide-react";

interface User {
  id: number;
  email: string;
  name: string;
  businessType: string;
  currency: string;
  instagramLink: string;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
      case "trialing":
        return "bg-blue-100 text-blue-800";
      case "trial":
        return "bg-blue-100 text-blue-800";
      case "free_access":
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
      case "trialing":
        return <Clock className="w-4 h-4" />;
      case "trial":
        return <Clock className="w-4 h-4" />;
      case "free_access":
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
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 md:py-4">
            <div className="flex items-center">
              <Settings className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 mr-2 md:mr-3" />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Salon Success Manager</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} size="sm" className="md:size-default">
              <LogOut className="w-4 h-4 mr-0 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 md:mb-8">
            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  +{stats.recentUsers} this week
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.activeSubscriptions}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}% conv.
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Trial</CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.trialUsers}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  In trial
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
                <CardTitle className="text-xs sm:text-sm font-medium">Free</CardTitle>
                <Gift className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                <div className="text-xl sm:text-2xl font-bold">{stats.freeUsers}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Promo
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Business Types */}
        {stats && Object.keys(stats.businessTypes).length > 0 && (
          <Card className="mb-6 md:mb-8">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg md:text-xl">Business Types</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Distribution of user business types</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                {Object.entries(stats.businessTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg">
                    <span className="text-xs sm:text-sm font-medium truncate mr-2">{type}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Management */}
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl">User Management</CardTitle>
            <CardDescription className="text-xs sm:text-sm mb-3 sm:mb-4">
              Search and manage user accounts
            </CardDescription>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 sm:pl-8 text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {usersData && (
              <>
                <div className="space-y-3 sm:space-y-4">
                  {usersData.users.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-slate-200 rounded-lg gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{user.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                            <p className="text-[10px] sm:text-xs text-gray-400 truncate">{user.businessType}</p>
                            {user.instagramLink && (
                              <a 
                                href={user.instagramLink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] sm:text-xs text-pink-600 hover:text-pink-800 flex items-center gap-1 mt-1"
                              >
                                <Instagram className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Instagram
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <div className="w-full sm:w-auto sm:text-right">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(user.subscriptionStatus)}
                            <Badge className={`${getStatusColor(user.subscriptionStatus)} text-[10px] sm:text-xs`}>
                              {user.subscriptionStatus}
                            </Badge>
                          </div>
                          {user.subscriptionEndDate && (
                            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                              Ends: {new Date(user.subscriptionEndDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUserMutation.mutate({ 
                              userId: user.id, 
                              status: "free_access",
                              endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
                            })}
                            disabled={updateUserMutation.isPending}
                            className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
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
                            className="text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3"
                          >
                            Revoke
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
                            className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {usersData.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 sm:mt-6 gap-3 sm:gap-0">
                    <div className="text-xs sm:text-sm text-gray-500">
                      Showing {usersData.users.length} of {usersData.total} users
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="text-xs sm:text-sm h-7 sm:h-8"
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-2 sm:px-3 text-xs sm:text-sm">
                        Page {page} of {usersData.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page === usersData.totalPages}
                        className="text-xs sm:text-sm h-7 sm:h-8"
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