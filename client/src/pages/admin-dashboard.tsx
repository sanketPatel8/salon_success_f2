import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminAiMentorStudio from "@/components/admin-ai-mentor-studio";
import AdminHomepageCmsStudio from "@/components/admin-homepage-cms-studio";
import {
  Users,
  Crown,
  Clock,
  UserX,
  Gift,
  Search,
  Settings,
  LogOut,
  Trash2,
  Instagram,
  Menu,
  X,
  Sparkles,
  LayoutTemplate,
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

const adminNavItems = [
  {
    label: "User Listing",
    href: "/admin/dashboard",
    icon: Users,
    description: "Manage members and subscriptions",
  },
  {
    label: "KG AI Mentor",
    href: "/admin/ai-mentor",
    icon: Sparkles,
    description: "Prompt, files, and visibility controls",
  },
  {
    label: "Homepage CMS",
    href: "/admin/homepage-cms",
    icon: LayoutTemplate,
    description: "Edit homepage copy without changing layout",
  },
];

function getAdminSection(path: string) {
  if (path === "/admin/ai-mentor") {
    return "ai-mentor";
  }

  if (path === "/admin/homepage-cms") {
    return "homepage-cms";
  }

  return "users";
}

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const currentSection = getAdminSection(location);
  const adminPassword = localStorage.getItem("adminPassword");

  useEffect(() => {
    if (!adminPassword) {
      setLocation("/admin");
    }
  }, [adminPassword, setLocation]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

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
    enabled: !!adminPassword && currentSection === "users",
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
    enabled: !!adminPassword && currentSection === "users",
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
      endDate,
    }: {
      userId: number;
      status: string;
      endDate?: string;
    }) => {
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
      case "trial":
        return <Clock className="w-4 h-4" />;
      case "free_access":
        return <Gift className="w-4 h-4" />;
      case "inactive":
      default:
        return <UserX className="w-4 h-4" />;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminPassword");
    setLocation("/admin");
  };

  const currentNavItem =
    adminNavItems.find((item) => item.href === location) ?? adminNavItems[0];

  if (!adminPassword) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 md:py-4">
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-blue-600 sm:h-7 sm:w-7 md:h-8 md:w-8" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
                  Admin Dashboard
                </h1>
                <p className="hidden text-xs text-gray-500 sm:block sm:text-sm">
                  {currentNavItem.label}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
              <Button variant="outline" onClick={handleLogout} size="sm" className="md:size-default">
                <LogOut className="mr-0 h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>

          <div className="hidden gap-2 border-t border-slate-100 py-3 md:flex">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === location;

              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex min-w-[210px] items-center gap-3 rounded-xl border px-4 py-3 transition ${
                      isActive
                        ? "border-primary bg-rose-50 text-slate-900"
                        : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-500"}`} />
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {mobileMenuOpen && (
            <div className="space-y-2 border-t border-slate-100 py-3 md:hidden">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === location;

                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                        isActive
                          ? "border-primary bg-rose-50 text-slate-900"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-500"}`} />
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:px-8">
        {currentSection === "users" && (
          <>
            {stats && (
              <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:mb-8 md:gap-6 lg:grid-cols-4">
                <Card className="col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-4 md:p-6">
                    <CardTitle className="text-xs font-medium sm:text-sm">Total Users</CardTitle>
                    <Users className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-4 md:p-6">
                    <div className="text-xl font-bold sm:text-2xl">{stats.totalUsers}</div>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      +{stats.recentUsers} this week
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-4 md:p-6">
                    <CardTitle className="text-xs font-medium sm:text-sm">Active</CardTitle>
                    <Crown className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-4 md:p-6">
                    <div className="text-xl font-bold sm:text-2xl">{stats.activeSubscriptions}</div>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      {stats.totalUsers > 0
                        ? `${((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}% conv.`
                        : "0% conv."}
                    </p>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-4 md:p-6">
                    <CardTitle className="text-xs font-medium sm:text-sm">Trial</CardTitle>
                    <Clock className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-4 md:p-6">
                    <div className="text-xl font-bold sm:text-2xl">{stats.trialUsers}</div>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">In trial</p>
                  </CardContent>
                </Card>

                <Card className="col-span-1">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-2 sm:p-4 md:p-6">
                    <CardTitle className="text-xs font-medium sm:text-sm">Free</CardTitle>
                    <Gift className="h-3 w-3 text-muted-foreground sm:h-4 sm:w-4" />
                  </CardHeader>
                  <CardContent className="p-3 pt-0 sm:p-4 md:p-6">
                    <div className="text-xl font-bold sm:text-2xl">{stats.freeUsers}</div>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">Promo</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {stats && Object.keys(stats.businessTypes).length > 0 && (
              <Card className="mb-6 md:mb-8">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg md:text-xl">Business Types</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Distribution of user business types
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-4">
                    {Object.entries(stats.businessTypes).map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-2 sm:p-3"
                      >
                        <span className="mr-2 truncate text-xs font-medium sm:text-sm">
                          {type}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg md:text-xl">User Listing</CardTitle>
                <CardDescription className="mb-3 text-xs sm:text-sm sm:mb-4">
                  Search and manage user accounts
                </CardDescription>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 transform text-gray-400 sm:h-4 sm:w-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-7 text-xs sm:pl-8 sm:text-sm"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {usersData && (
                  <>
                    <div className="space-y-3 sm:space-y-4">
                      {usersData.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium sm:text-base">
                              {user.name}
                            </p>
                            <p className="truncate text-xs text-gray-500 sm:text-sm">
                              {user.email}
                            </p>
                            <p className="truncate text-[10px] text-gray-400 sm:text-xs">
                              {user.businessType}
                            </p>
                            {user.instagramLink && (
                              <p className="mt-1 flex items-center gap-1 text-[10px] text-pink-600 sm:text-xs">
                                <Instagram className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                {user.instagramLink}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                            <div className="w-full sm:w-auto sm:text-right">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(user.subscriptionStatus)}
                                <Badge className={`${getStatusColor(user.subscriptionStatus)} text-[10px] sm:text-xs`}>
                                  {user.subscriptionStatus}
                                </Badge>
                              </div>
                              {user.subscriptionEndDate && (
                                <p className="mt-1 text-[10px] text-gray-500 sm:text-xs">
                                  Ends: {new Date(user.subscriptionEndDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateUserMutation.mutate({
                                    userId: user.id,
                                    status: "free_access",
                                    endDate: new Date(
                                      Date.now() + 180 * 24 * 60 * 60 * 1000,
                                    ).toISOString(),
                                  })
                                }
                                disabled={updateUserMutation.isPending}
                                className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
                              >
                                Free 6mo
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  updateUserMutation.mutate({
                                    userId: user.id,
                                    status: "inactive",
                                  })
                                }
                                disabled={updateUserMutation.isPending}
                                className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
                              >
                                Revoke
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to permanently delete ${user.name} (${user.email})? This will remove all their data and cannot be undone.`,
                                    )
                                  ) {
                                    deleteUserMutation.mutate(user.id);
                                  }
                                }}
                                disabled={deleteUserMutation.isPending}
                                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {usersData.totalPages > 1 && (
                      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:mt-6 sm:flex-row sm:gap-0">
                        <div className="text-xs text-gray-500 sm:text-sm">
                          Showing {usersData.users.length} of {usersData.total} users
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            className="h-7 text-xs sm:h-8 sm:text-sm"
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(page + 1)}
                            disabled={page === usersData.totalPages}
                            className="h-7 text-xs sm:h-8 sm:text-sm"
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
          </>
        )}

        {currentSection === "ai-mentor" && (
          <AdminAiMentorStudio adminPassword={adminPassword} />
        )}

        {currentSection === "homepage-cms" && (
          <AdminHomepageCmsStudio adminPassword={adminPassword} />
        )}
      </div>
    </div>
  );
}
