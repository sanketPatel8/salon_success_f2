import CurrencySelector from "@/components/currency-selector";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLocation } from "wouter";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { formatCurrency, currency, setCurrency } = useCurrency();
  const [location, setLocation] = useLocation();

  return (
    <header className="bg-white shadow-sm border-b border-slate-200 px-8 py-6 md:mt-[0px] mt-[75px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            <span> {title} </span>
            {location !== "/forgot-password" &&
              location !== "/reset-password" && (
                <span>{formatCurrency(1000)}</span>
              )}
          </h2>
          <p className="text-slate-600 mt-1">{description}</p>
        </div>
        {/* <div className="flex items-center space-x-4">
          <CurrencySelector />
        </div> */}
      </div>
    </header>
  );
}
