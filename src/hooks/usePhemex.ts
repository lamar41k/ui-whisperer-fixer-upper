
import { useState, useEffect, useCallback } from 'react';
import { phemexService, PhemexPosition, PhemexOrder, PhemexAccount } from '@/services/phemexService';

export const usePhemex = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<PhemexAccount | null>(null);
  const [positions, setPositions] = useState<PhemexPosition[]>([]);
  const [orders, setOrders] = useState<PhemexOrder[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await phemexService.testConnection();
        setIsConnected(connected);
        if (connected) {
          await refreshData();
        }
      } catch (err) {
        setIsConnected(false);
        setError('Failed to connect to Phemex');
      }
    };
    
    checkConnection();
  }, []);

  const connect = useCallback(async (apiKey: string, apiSecret: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Since credentials are stored in Supabase secrets, we just test the connection
      const connectionTest = await phemexService.testConnection();
      
      if (connectionTest) {
        setIsConnected(true);
        await refreshData();
        return true;
      } else {
        setIsConnected(false);
        setError('Failed to connect to Phemex API. Please check your credentials in Supabase secrets.');
        return false;
      }
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : 'Connection failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    phemexService.clearCredentials();
    setIsConnected(false);
    setAccount(null);
    setPositions([]);
    setOrders([]);
    setError(null);
    setLastUpdated(null);
  }, []);

  const refreshData = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const [accountData, positionsData, ordersData] = await Promise.all([
        phemexService.getAccount(),
        phemexService.getPositions(),
        phemexService.getOrders()
      ]);

      setAccount(accountData);
      setPositions(positionsData);
      setOrders(ordersData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  const placeOrder = useCallback(async (
    symbol: string, 
    side: 'Buy' | 'Sell', 
    quantity: number, 
    price?: number
  ): Promise<PhemexOrder | null> => {
    if (!isConnected) {
      setError('Not connected to Phemex');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const order = await phemexService.placeOrder(symbol, side, quantity, price);
      await refreshData(); // Refresh to get updated positions/orders
      return order;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, refreshData]);

  const syncPositionsToPortfolio = useCallback(() => {
    if (!positions.length) return [];

    return positions
      .filter(pos => pos.size > 0) // Only active positions
      .map(pos => ({
        id: `phemex-${pos.symbol}`,
        setupId: undefined,
        symbol: pos.symbol,
        direction: pos.side === 'Buy' ? 'LONG' as const : 'SHORT' as const,
        entryPrice: pos.entryPrice,
        currentPrice: pos.markPrice,
        targetPrice: pos.markPrice * (pos.side === 'Buy' ? 1.1 : 0.9), // Default 10% target
        stopPrice: pos.markPrice * (pos.side === 'Buy' ? 0.95 : 1.05), // Default 5% stop
        size: pos.value,
        openDate: new Date().toISOString(),
        status: 'open' as const,
        lastUpdated: new Date().toISOString(),
        marketPrice: pos.markPrice,
        priceChange24h: 0,
        lastPriceUpdate: new Date().toISOString()
      }));
  }, [positions]);

  return {
    isConnected,
    isLoading,
    error,
    account,
    positions,
    orders,
    lastUpdated,
    connect,
    disconnect,
    refreshData,
    placeOrder,
    syncPositionsToPortfolio
  };
};
