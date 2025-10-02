// import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// interface Currency {
//   code: string;
//   symbol: string;
//   name: string;
//   locale: string;
// }

// export const CURRENCIES: Currency[] = [
//   { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
//   { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
//   { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
//   { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
//   { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
//   { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
//   { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
//   { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
//   { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', locale: 'sv-SE' },
//   { code: 'DKK', symbol: 'kr', name: 'Danish Krone', locale: 'da-DK' },
//   { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', locale: 'nb-NO' },
// ];

// interface CurrencyContextType {
//   currency: Currency;
//   setCurrency: (currency: Currency) => void;
//   formatCurrency: (amount: number | string) => string;
// }

// const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// export function CurrencyProvider({ children }: { children: ReactNode }) {
//   const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]); // Default to GBP

//   // Load saved currency from localStorage on mount
//   useEffect(() => {
//     const savedCurrency = localStorage.getItem('selectedCurrency');
//     if (savedCurrency) {
//       const found = CURRENCIES.find(c => c.code === savedCurrency);
//       if (found) {
//         setCurrencyState(found);
//       }
//     }
//   }, []);

//   const setCurrency = (newCurrency: Currency) => {
//     setCurrencyState(newCurrency);
//     localStorage.setItem('selectedCurrency', newCurrency.code);
//   };

//   const formatCurrency = (amount: number | string): string => {
//     const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
//     return new Intl.NumberFormat(currency.locale, {
//       style: 'currency',
//       currency: currency.code,
//     }).format(numAmount);
//   };

//   return (
//     <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
//       {children}
//     </CurrencyContext.Provider>
//   );
// }

// export function useCurrency() {
//   const context = useContext(CurrencyContext);
//   if (context === undefined) {
//     throw new Error('useCurrency must be used within a CurrencyProvider');
//   }
//   return context;
// }


// CurrencyContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-EU' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'ar-AE' },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
  convert: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [rates, setRates] = useState<{ [key: string]: number }>({ GBP: 1 }); // Changed base to GBP

  // Load selected currency from localStorage
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      const found = CURRENCIES.find(c => c.code === savedCurrency);
      if (found) setCurrencyState(found);
    }
  }, []);

  // Fetch exchange rates from an API with GBP as base
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Fetch rates with GBP as base currency
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/GBP');
        const data = await res.json();
        setRates(data.rates);
      } catch (err) {
        console.error('Failed to fetch exchange rates:', err);
        // Fallback rates if API fails
        setRates({
          GBP: 1,
          USD: 1.27,
          EUR: 1.17,
          AED: 4.66
        });
      }
    };
    fetchRates();
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('selectedCurrency', newCurrency.code);
  };

  // Convert amount from base GBP to selected currency
  const convert = (amount: number) => {
    const rate = rates[currency.code] || 1;
    return amount * rate;
  };

  // Format price with currency symbol and locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
    }).format(convert(amount));
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
}

