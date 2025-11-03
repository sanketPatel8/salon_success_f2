import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import HourlyRateCalculator from "@/pages/hourly-rate-calculator";
import ProfitMarginCalculator from "@/pages/profit-margin-calculator";
import ExpenseTracker from "@/pages/expense-tracker";
import RevenueProjections from "@/pages/revenue-projections";
import Reports from "@/pages/reports";
import CEONumbers from "@/pages/ceo-numbers";
import MoneyPots from "@/pages/money-pots";
import StockBudgetCalculator from "@/pages/stock-budget-calculator";
import Subscribe from "@/pages/subscribe";
import TrialDemo from "@/pages/trial-demo";
import Help from "@/pages/help";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Privacy from "@/pages/privacy";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import Subscription from "@/pages/subscription";
import SubscriptionSuccess from "@/pages/subscription-success";
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";
import SubscriptionGuard from "./pages/subscriptionGuard.tsx";
import TeamTarget from "./pages/team-target.tsx";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
          aria-label="Loading"
        />
      </div>
    );
  }

  // Public routes (not authenticated)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/trial-demo" component={TrialDemo} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated routes with sidebar
  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Switch>
          <Route path="/subscription-success" component={SubscriptionSuccess} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/help" component={Help} />

          {/* Protected routes - require subscription (trial or paid) */}
          <Route path="/">
            <SubscriptionGuard>
              <Dashboard />
            </SubscriptionGuard>
          </Route>

          <Route path="/hourly-rate">
            <SubscriptionGuard>
              <HourlyRateCalculator />
            </SubscriptionGuard>
          </Route>

          <Route path="/profit-margin">
            <SubscriptionGuard>
              <ProfitMarginCalculator />
            </SubscriptionGuard>
          </Route>

          <Route path="/expenses">
            <SubscriptionGuard>
              <ExpenseTracker />
            </SubscriptionGuard>
          </Route>

          <Route path="/stock-budget">
            <SubscriptionGuard>
              <StockBudgetCalculator />
            </SubscriptionGuard>
          </Route>

          <Route path="/revenue">
            <SubscriptionGuard>
              <RevenueProjections />
            </SubscriptionGuard>
          </Route>

          <Route path="/ceo-numbers">
            <SubscriptionGuard>
              <CEONumbers />
            </SubscriptionGuard>
          </Route>

          <Route path="/money-pots">
            <SubscriptionGuard>
              <MoneyPots />
            </SubscriptionGuard>
          </Route>

          <Route path="/team-target">
            <SubscriptionGuard>
              <TeamTarget />
            </SubscriptionGuard>
          </Route>

          {/* Reports - requires PAID subscription (no trial) */}
          <Route path="/reports">
            <SubscriptionGuard>
              <Reports />
            </SubscriptionGuard>
          </Route>

          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

export default App;