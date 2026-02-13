import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const currencies = {
  USD: { symbol: '$', code: 'USD', name: 'United States', rate: 1, flag: '🇺🇸' },
  GBP: { symbol: '£', code: 'GBP', name: 'United Kingdom', rate: 0.79, flag: '🇬🇧' },
  INR: { symbol: '₹', code: 'INR', name: 'India', rate: 83.12, flag: '🇮🇳' }
};

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('USD');

  // Load currency from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency && currencies[savedCurrency]) {
      setCurrency(savedCurrency);
    }
  }, []);

  // Save currency to localStorage when it changes
  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem('selectedCurrency', newCurrency);
  };

  const formatPrice = (price) => {
    const currencyData = currencies[currency];
    const convertedPrice = price * currencyData.rate;
    return `${currencyData.symbol}${convertedPrice.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, changeCurrency, formatPrice, currencies }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
