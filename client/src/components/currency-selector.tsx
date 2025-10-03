import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency, CURRENCIES } from "@/contexts/CurrencyContext";

export default function CurrencySelector() {
  const { formatCurrency, currency, setCurrency } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {currency.symbol} {currency.code}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="">
        {CURRENCIES.map((curr) => (
          <DropdownMenuItem
            key={curr.code}
            onClick={() => setCurrency(curr)}
            className={currency.code === curr.code ? "bg-accent" : ""}
          >
            <div className="flex justify-between w-full">
              <span>{curr.name}</span>
              <span className="text-muted-foreground">
                {curr.symbol} {curr.code}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
