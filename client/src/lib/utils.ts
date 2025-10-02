import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, locale = 'en-GB', currency = 'GBP'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(numAmount);
}

export function formatPercentage(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(1)}%`;
}

export function calculateHourlyRate(
  monthlyExpenses: number,
  desiredProfit: number,
  weeklyHours: number,
  taxRate: number,
  staffCount: number = 0
): {
  hourlyRate: number;
  staffTargetPerPerson: number | null;
} {
  const monthlyHours = weeklyHours * 4.33; // Average weeks per month
  const totalNeeded = monthlyExpenses * (1 + desiredProfit / 100);
  const beforeTax = totalNeeded / (1 - taxRate / 100);
  const hourlyRate = beforeTax / monthlyHours;
  
  let staffTargetPerPerson = null;
  if (staffCount > 0) {
    // Each staff member needs to generate enough to cover their portion plus profit
    staffTargetPerPerson = beforeTax / staffCount;
  }
  
  return {
    hourlyRate,
    staffTargetPerPerson
  };
}

export function calculateTreatmentProfit(
  price: number,
  productCost: number,
  overheadCost: number
): {
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
} {
  const totalCosts = productCost + overheadCost;
  const netProfit = price - totalCosts;
  const profitMargin = price > 0 ? (netProfit / price) * 100 : 0;
  
  return {
    totalCosts,
    netProfit,
    profitMargin
  };
}
