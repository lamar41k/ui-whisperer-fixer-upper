import { useState, useEffect } from 'react';

export interface TradingSetup {
  id: string;
  name: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  targetPrice: number;
  stopPrice: number;
  totalAllocation: number;
  probability: number;
  totalFactors: number;
  priority: 'high' | 'medium' | 'low';
  status: 'monitoring' | 'active' | 'executed' | 'cancelled';
  tags: string[];
  createdDate: string;
  lastUpdated: string;
  factors?: string[];
  dcaEntries?: Array<{
    price: number;
    amount: number;
    status: 'planned' | 'executed';
  }>;
  dcaExits?: Array<{
    price: number;
    percentage: number;
    status: 'planned' | 'executed';
  }>;
  marketPrice?: number;
  priceChange24h?: number;
  lastPriceUpdate?: string;
}

export interface PortfolioPosition {
  id: string;
  setupId?: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  targetPrice: number;
  stopPrice: number;
  size: number;
  openDate: string;
  closeDate?: string;
  exitPrice?: number;
  status: 'open' | 'closed';
  lastUpdated?: string;
  marketPrice?: number;
  priceChange24h?: number;
  lastPriceUpdate?: string;
}

const INITIAL_PORTFOLIO_VALUE = 14766;
const MONTHLY_GOAL = 2000;

export const useTradingData = () => {
  const [portfolioValue, setPortfolioValue] = useState(INITIAL_PORTFOLIO_VALUE);
  const [setups, setSetups] = useState<TradingSetup[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('tradingSystemData');
      if (savedData) {
        const data = JSON.parse(savedData);
        setSetups(data.setups || []);
        setPortfolio(data.portfolio || []);
        setPortfolioValue(data.portfolioValue ?? INITIAL_PORTFOLIO_VALUE);
      }
    } catch (error) {
      console.log('No saved data found');
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    try {
      const data = {
        portfolioValue,
        setups,
        portfolio,
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('tradingSystemData', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, [portfolioValue, setups, portfolio]);

  const saveSetup = (setupData: TradingSetup, executedEntries?: PortfolioPosition) => {
    const existingIndex = setups.findIndex(s => s.id === setupData.id);
    
    if (existingIndex !== -1) {
      setSetups(prev => prev.map((s, i) => i === existingIndex ? setupData : s));
    } else {
      setSetups(prev => [...prev, setupData]);
    }

    // Add executed entries to portfolio
    if (executedEntries) {
      const existingPosIndex = portfolio.findIndex(p => p.setupId === setupData.id);
      if (existingPosIndex !== -1) {
        setPortfolio(prev => prev.map((p, i) => i === existingPosIndex ? executedEntries : p));
      } else {
        setPortfolio(prev => [...prev, executedEntries]);
      }
    }
  };

  const updateSetup = (setupData: TradingSetup) => {
    setSetups(prev => prev.map(s => s.id === setupData.id ? setupData : s));
  };

  const deleteSetup = (id: string) => {
    setSetups(prev => prev.filter(s => s.id !== id));
    // Also remove associated portfolio positions
    setPortfolio(prev => prev.filter(p => p.setupId !== id));
  };

  const updatePosition = (id: string, currentPrice: number) => {
    setPortfolio(prev => prev.map(p => 
      p.id === id 
        ? { ...p, currentPrice, lastUpdated: new Date().toISOString() }
        : p
    ));
  };

  const closePosition = (id: string, exitPrice: number) => {
    setPortfolio(prev => prev.map(p => 
      p.id === id 
        ? { 
            ...p, 
            status: 'closed' as const, 
            exitPrice, 
            closeDate: new Date().toISOString() 
          }
        : p
    ));
  };

  const updateMarketPrices = (priceData: Record<string, { price: number; change24h: number; lastUpdated: string }>) => {
    const now = new Date().toISOString();
    
    // Update setup prices
    setSetups(prev => prev.map(setup => {
      const priceInfo = priceData[setup.symbol.toUpperCase()];
      if (priceInfo) {
        return {
          ...setup,
          marketPrice: priceInfo.price,
          priceChange24h: priceInfo.change24h,
          lastPriceUpdate: now
        };
      }
      return setup;
    }));

    // Update portfolio position prices
    setPortfolio(prev => prev.map(position => {
      const priceInfo = priceData[position.symbol.toUpperCase()];
      if (priceInfo && position.status === 'open') {
        return {
          ...position,
          currentPrice: priceInfo.price,
          marketPrice: priceInfo.price,
          priceChange24h: priceInfo.change24h,
          lastPriceUpdate: now
        };
      }
      return position;
    }));
  };

  const calculatePositionPnL = (position: PortfolioPosition): number => {
    const percentChange = (position.currentPrice - position.entryPrice) / position.entryPrice;
    const pnl = position.size * percentChange;
    return position.direction === 'LONG' ? pnl : -pnl;
  };

  return {
    portfolioValue,
    setPortfolioValue,
    setups,
    portfolio,
    saveSetup,
    updateSetup,
    deleteSetup,
    updatePosition,
    closePosition,
    updateMarketPrices,
    calculatePositionPnL,
    MONTHLY_GOAL
  };
};
