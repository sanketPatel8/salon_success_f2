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
// import {
//   createContext,
//   useContext,
//   useState,
//   useEffect,
//   ReactNode,
// } from "react";

// export interface Currency {
//   code: string;
//   symbol: string;
//   name: string;
//   locale: string;
// }

// export const CURRENCIES: Currency[] = [
//   { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
//   { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
//   { code: "EUR", symbol: "€", name: "Euro", locale: "en-EU" },
//   { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
//   { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
//   { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
//   { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
//   { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
//   { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
//   { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
//   { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
// ];

// interface CurrencyContextType {
//   currency: Currency;
//   setCurrency: (currency: Currency) => void;
//   formatCurrency: (amount: number) => string;
// }

// const CurrencyContext = createContext<CurrencyContextType | undefined>(
//   undefined
// );

// export function CurrencyProvider({ children }: { children: ReactNode }) {
//   const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
//   const [rates, setRates] = useState<{ [key: string]: number }>({ USD: 1 }); // base USD

//   // Load selected currency from localStorage
//   useEffect(() => {
//     const savedCurrency = localStorage.getItem("selectedCurrency");
//     if (savedCurrency) {
//       const found = CURRENCIES.find((c) => c.code === savedCurrency);
//       if (found) setCurrencyState(found);
//     }
//   }, []);

//   // Fetch exchange rates from an API
//   useEffect(() => {
//     const fetchRates = async () => {
//       try {
//         const res = await fetch(
//           "https://api.exchangerate-api.com/v4/latest/USD"
//         );
//         const data = await res.json();
//         setRates(data.rates);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchRates();
//   }, []);

//   const setCurrency = (newCurrency: Currency) => {
//     setCurrencyState(newCurrency);
//     localStorage.setItem("selectedCurrency", newCurrency.code);
//   };

  

//   // Format price with currency symbol and locale
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat(currency.locale, {
//       style: "currency",
//       currency: currency.code,
//     }).format(amount);
//   };

//   const formatSymbol = () => {
//     return currency.symbol;
//   };

//   return (
//     <CurrencyContext.Provider
//       value={{ currency, setCurrency,  formatCurrency, formatSymbol }}
//     >
//       {children}
//     </CurrencyContext.Provider>
//   );
// }

// export function useCurrency() {
//   const context = useContext(CurrencyContext);
//   if (!context)
//     throw new Error("useCurrency must be used within a CurrencyProvider");
//   return context;
// }


import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "en-EU" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  setCurrencyFromUser: (currencyCode: string) => void;
  formatCurrency: (amount: number) => string;
  formatSymbol: () => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]);
  const [rates, setRates] = useState<{ [key: string]: number }>({ USD: 1 });

  // Load selected currency from localStorage on initial mount only
  useEffect(() => {
    const savedCurrency = localStorage.getItem("selectedCurrency");
    if (savedCurrency) {
      const found = CURRENCIES.find((c) => c.code === savedCurrency);
      if (found) setCurrencyState(found);
    }
  }, []);

  // Fetch exchange rates from an API
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        const data = await res.json();
        setRates(data.rates);
      } catch (err) {
        console.error("Failed to fetch exchange rates:", err);
      }
    };
    fetchRates();
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("selectedCurrency", newCurrency.code);
  };

  // New function to set currency from user data (after login/register)
  const setCurrencyFromUser = (currencyCode: string) => {
    const found = CURRENCIES.find((c) => c.code === currencyCode);
    if (found) {
      setCurrencyState(found);
      localStorage.setItem("selectedCurrency", found.code);
      console.log(`Currency set from user profile: ${currencyCode}`);
    } else {
      console.warn(`Currency code ${currencyCode} not found in CURRENCIES list`);
    }
  };

  // Format price with currency symbol and locale
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.code,
    }).format(amount);
  };

  const formatSymbol = () => {
    return currency.symbol;
  };

  return (
    <CurrencyContext.Provider
      value={{ 
        currency, 
        setCurrency, 
        setCurrencyFromUser,
        formatCurrency, 
        formatSymbol 
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context)
    throw new Error("useCurrency must be used within a CurrencyProvider");
  return context;
}