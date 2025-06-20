
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioTab } from './trading/PortfolioTab';
import { WatchlistTab } from './trading/WatchlistTab';
import { CalculatorTab } from './trading/CalculatorTab';
import { useTradingData } from '@/hooks/useTradingData';

export const TradingApp = () => {
  const { 
    portfolioValue, 
    setPortfolioValue, 
    setups, 
    portfolio, 
    saveSetup, 
    deleteSetup, 
    updatePosition, 
    closePosition 
  } = useTradingData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-cyan-400">Trading System</h1>
            <div className="text-right">
              <div className="text-sm text-gray-400">Portfolio Value</div>
              <div className="text-xl font-bold text-cyan-400">
                ${portfolioValue.toLocaleString()}
              </div>
            </div>
          </div>

          <Tabs defaultValue="portfolio" className="w-full">
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
              />
            </TabsContent>

            <TabsContent value="watchlist" className="mt-6">
              <WatchlistTab 
                setups={setups}
                deleteSetup={deleteSetup}
              />
            </TabsContent>

            <TabsContent value="calculator" className="mt-6">
              <CalculatorTab 
                portfolioValue={portfolioValue}
                saveSetup={saveSetup}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
