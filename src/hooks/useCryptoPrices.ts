
import { useState, useEffect, useCallback } from 'react';
import { cryptoService, PriceData } from '@/services/cryptoService';

interface UseCryptoPricesReturn {
  prices: Record<string, PriceData>;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
  refreshPrices: (symbols: string[]) => Promise<void>;
  getPrice: (symbol: string) => PriceData | null;
}

export const useCryptoPrices = (): UseCryptoPricesReturn => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshPrices = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const newPrices = await cryptoService.fetchPrices(symbols);
      setPrices(prev => ({ ...prev, ...newPrices }));
      setLastUpdated(new Date());
      
      // Cache prices in localStorage
      localStorage.setItem('cryptoPrices', JSON.stringify({
        prices: { ...prices, ...newPrices },
        lastUpdated: new Date().toISOString()
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, [prices]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol.toUpperCase()] || null;
  }, [prices]);

  // Load cached prices on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cryptoPrices');
      if (cached) {
        const { prices: cachedPrices, lastUpdated: cachedTime } = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(cachedTime).getTime();
        
        // Use cached prices if less than 1 hour old
        if (cacheAge < 60 * 60 * 1000) {
          setPrices(cachedPrices);
          setLastUpdated(new Date(cachedTime));
        }
      }
    } catch (error) {
      console.log('No cached prices found');
    }
  }, []);

  return {
    prices,
    isLoading,
    lastUpdated,
    error,
    refreshPrices,
    getPrice
  };
};
