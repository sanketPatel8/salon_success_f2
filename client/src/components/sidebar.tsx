import { Link, useLocation } from "wouter";
import { Calculator, Home, Clock, Percent, Receipt, TrendingUp, FileText, DollarSign, Crown, Package, LogOut, HelpCircle, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/KatieGodfrey-Logo_Black.png";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Hourly Rate Calculator", href: "/hourly-rate", icon: Clock },
  { name: "Profit Margin Calculator", href: "/profit-margin", icon: Percent },
  { name: "Expense Tracker", href: "/expenses", icon: Receipt },
  { name: "Stock Budget Calculator", href: "/stock-budget", icon: Package },
  { name: "Revenue Projections", href: "/revenue", icon: TrendingUp },
  { name: "CEO Numbers", href: "/ceo-numbers", icon: DollarSign },
  { name: "Money Pots", href: "/money-pots", icon: Palette },
  { name: "Reports & Export", href: "/reports", icon: FileText },
  { name: "Subscribe Pro", href: "/subscribe", icon: Crown, isPro: true },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-lg border-r border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-10 bg-white rounded-lg flex items-center justify-center p-1">
            <img src={logoPath} alt="Katie Godfrey Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Salon Success</h1>
            <p className="text-sm text-slate-500">Manager</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
                    item.isPro
                      ? "text-primary bg-gradient-to-r from-pink-50 to-pink-100 hover:from-pink-100 hover:to-pink-200 border border-primary/20"
                      : isActive
                      ? "text-primary bg-blue-50"
                      : "text-slate-600 hover:text-primary hover:bg-slate-50"
                  )}
                >
                  <Icon className={cn("h-5 w-5", item.isPro && "text-primary")} />
                  <span className={cn(item.isPro && "font-semibold")}>{item.name}</span>
                  {item.isPro && (
                    <span className="ml-auto text-xs bg-primary text-white px-2 py-1 rounded-full">
                      £23.97/mo
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Help and Logout Section */}
      <div className="p-4 border-t border-slate-200 space-y-2">
        <Link
          href="/help"
          className="flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-slate-600 hover:text-primary hover:bg-slate-50"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help & Support</span>
        </Link>
        
        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (error) {
              window.location.href = '/login';
            }
          }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-slate-600 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
      
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
            <span className="text-slate-600 text-sm font-medium">KG</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">Katie Godfrey</p>
            <p className="text-xs text-slate-500">Business Strategist</p>
          </div>
        </div>
      </div>
    </div>
  );
}
