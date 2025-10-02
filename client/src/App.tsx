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
import Sidebar from "@/components/sidebar";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading, hasAccess } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/trial-demo" component={TrialDemo} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/admin" component={AdminLogin} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // If authenticated but no subscription access, show subscribe page
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Switch>
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/help" component={Help} />
            <Route component={Subscribe} />
          </Switch>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/hourly-rate" component={HourlyRateCalculator} />
          <Route path="/profit-margin" component={ProfitMarginCalculator} />
          <Route path="/expenses" component={ExpenseTracker} />
          <Route path="/stock-budget" component={StockBudgetCalculator} />
          <Route path="/revenue" component={RevenueProjections} />
          <Route path="/ceo-numbers" component={CEONumbers} />
          <Route path="/money-pots" component={MoneyPots} />
          <Route path="/reports" component={Reports} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/help" component={Help} />
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
