
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioTab } from './trading/PortfolioTab';
import { WatchlistTab } from './trading/WatchlistTab';
import { CalculatorTab } from './trading/CalculatorTab';
import { useTradingData } from '@/hooks/useTradingData';
import { useCryptoPrices } from '@/hooks/useCryptoPrices';
import { PhemexIndicator } from './trading/PhemexIndicator';

export const TradingApp = () => {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [editingSetupId, setEditingSetupId] = useState<string | undefined>(undefined);

  const { 
    portfolioValue, 
    setPortfolioValue, 
    setups, 
    portfolio, 
    saveSetup, 
    updateSetup,
    deleteSetup, 
    updatePosition, 
    closePosition,
    updateMarketPrices
  } = useTradingData();

  const { prices, refreshPrices } = useCryptoPrices();

  // Update market prices when crypto prices change
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      const priceData: Record<string, { price: number; change24h: number; lastUpdated: string }> = {};
      Object.entries(prices).forEach(([symbol, data]) => {
        priceData[symbol] = {
          price: data.price,
          change24h: data.change24h,
          lastUpdated: data.lastUpdated
        };
      });
      updateMarketPrices(priceData);
    }
  }, [prices, updateMarketPrices]);

  const handleEditSetup = (setupId: string) => {
    setEditingSetupId(setupId);
    setActiveTab('calculator');
  };

  const handleClearEdit = () => {
    setEditingSetupId(undefined);
  };

  const handleSyncPhemexPositions = (newPositions: any[]) => {
    // Add new positions to portfolio
    newPositions.forEach(position => {
      // Create a portfolio position from Phemex data
      saveSetup({
        id: position.id,
        name: `Phemex ${position.symbol} ${position.direction}`,
        symbol: position.symbol,
        direction: position.direction,
        targetPrice: position.targetPrice,
        stopPrice: position.stopPrice,
        totalAllocation: position.size,
        probability: 70, // Default probability for synced positions
        totalFactors: 5, // Default factors
        priority: 'medium' as const,
        status: 'executed' as const,
        tags: ['phemex', 'synced'],
        createdDate: position.openDate,
        lastUpdated: new Date().toISOString(),
        marketPrice: position.currentPrice
      }, position);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-cyan-400">Trading System</h1>
            <div className="flex items-center gap-4">
              <PhemexIndicator />
              <div className="text-right">
                <div className="text-sm text-gray-400">Portfolio Value</div>
                <div className="text-xl font-bold text-cyan-400">
                  ${portfolioValue.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700/50 border border-cyan-500/30">
              <TabsTrigger value="portfolio" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Portfolio
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Watchlist
              </TabsTrigger>
              <TabsTrigger value="calculator" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Calculator
              </TabsTrigger>
            </TabsList>

            <TabsContent value="portfolio" className="mt-6">
              <PortfolioTab 
                portfolio={portfolio}
                portfolioValue={portfolioValue}
                setPortfolioValue={setPortfolioValue}
                updatePosition={updatePosition}
                closePosition={closePosition}
                updateMarketPrices={updateMarketPrices}
                onSyncPhemexPositions={handleSyncPhemexPositions}
              />
            </TabsContent>

            <TabsContent value="watchlist" className="mt-6">
              <WatchlistTab 
                setups={setups}
                deleteSetup={deleteSetup}
                updateSetup={updateSetup}
                onEditSetup={handleEditSetup}
                refreshPrices={refreshPrices}
              />
            </TabsContent>

            <TabsContent value="calculator" className="mt-6">
              <CalculatorTab 
                portfolioValue={portfolioValue}
                saveSetup={saveSetup}
                setups={setups}
                editingSetupId={editingSetupId}
                onClearEdit={handleClearEdit}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
