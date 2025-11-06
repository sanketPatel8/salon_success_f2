import { Link, useLocation } from "wouter";
import { Calculator, Home, Clock, Percent, Receipt, TrendingUp, FileText, DollarSign, Crown, Package, LogOut, HelpCircle, Palette, Menu, X, Target  } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from "@assets/KatieGodfrey-Logo_Black.png";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Hourly Rate Calculator", href: "/hourly-rate", icon: Clock },
  { name: "Pricing Calculator", href: "/profit-margin", icon: Percent },
  { name: "Money Pots", href: "/money-pots", icon: Palette },
  { name: "CEO Numbers", href: "/ceo-numbers", icon: DollarSign },
  { name: "Expense Tracker", href: "/expenses", icon: Receipt },
  { name: "Stock Budget Calculator", href: "/stock-budget", icon: Package },
  { name: "Teams Targets", href: "/team-target", icon: Target },
  { name: "Revenue Projections", href: "/revenue", icon: TrendingUp },
  { name: "Reports & Export", href: "/reports", icon: FileText },

];

export default function Sidebar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (error) {
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-md border-b border-slate-200 ">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <img src="/logo_withbg.jpeg" alt="salon success Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Salon Success</h1>
              <p className="text-xs text-slate-500">Manager</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-slate-600" />
            ) : (
              <Menu className="h-6 w-6 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Drawer & Desktop Fixed */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-40 w-64 bg-white shadow-lg border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:static",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo Section - Desktop Only */}
        <div className="hidden lg:block p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center">
              <img src="/logo_withbg.jpeg" alt="salon success Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Salon Success</h1>
              <p className="text-sm text-slate-500">Manager</p>
            </div>
          </div>
        </div>

        {/* Mobile Spacing */}
        <div className="lg:hidden h-4" />
        
        <nav className="flex-1 p-4 overflow-y-auto lg:mt-[0px] mt-[55px]">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
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
            onClick={handleLinkClick}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors text-slate-600 hover:text-primary hover:bg-slate-50"
          >
            <HelpCircle className="h-5 w-5" />
            <span>Help & Support</span>
          </Link>
          
          <button
            onClick={handleLogout}
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
    </>
  );
}