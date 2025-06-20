
import React from 'react';
import { Button } from '@/components/ui/button';
import { PortfolioPosition } from '@/hooks/useTradingData';

interface PortfolioTabProps {
  portfolio: PortfolioPosition[];
  portfolioValue: number;
  setPortfolioValue: (value: number) => void;
  updatePosition: (id: string, currentPrice: number) => void;
  closePosition: (id: string, exitPrice: number) => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({
  portfolio,
  portfolioValue,
  setPortfolioValue,
  updatePosition,
  closePosition
}) => {
  const openPositions = portfolio.filter(p => p.status === 'open');
  
  const calculatePnL = (position: PortfolioPosition): number => {
    const percentChange = (position.currentPrice - position.entryPrice) / position.entryPrice;
    const pnl = position.size * percentChange;
    return position.direction === 'LONG' ? pnl : -pnl;
  };

  const totalPnL = openPositions.reduce((sum, pos) => sum + calculatePnL(pos), 0);
  const monthlyProgress = (totalPnL / 2000) * 100;

  const handleUpdatePrice = (id: string) => {
    const newPrice = prompt('Enter current market price:');
    if (newPrice && !isNaN(Number(newPrice))) {
      updatePosition(id, parseFloat(newPrice));
    }
  };

  const handleClosePosition = (id: string) => {
    const exitPrice = prompt('Enter exit price:');
    if (exitPrice && !isNaN(Number(exitPrice))) {
      closePosition(id, parseFloat(exitPrice));
      alert('Position closed successfully!');
    }
  };

  const handleEditPortfolioValue = () => {
    const newValue = prompt('Enter new total portfolio value:', portfolioValue.toString());
    const value = parseFloat(newValue || '');
    if (!isNaN(value) && value > 0) {
      setPortfolioValue(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-sm text-gray-400">Portfolio Value</div>
          <div className="text-xl font-bold text-cyan-400">
            ${portfolioValue.toLocaleString()}
          </div>
          <Button 
            onClick={handleEditPortfolioValue}
            className="mt-2 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
            size="sm"
          >
            Edit
          </Button>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-sm text-gray-400">Active Positions</div>
          <div className="text-xl font-bold text-white">{openPositions.length}</div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-sm text-gray-400">Total P&L</div>
          <div className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-sm text-gray-400">Monthly Goal</div>
          <div className="text-xl font-bold text-cyan-400">
            {monthlyProgress.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">
            ${(2000 - totalPnL).toFixed(2)} remaining
          </div>
        </div>
      </div>

      {/* Positions List */}
      <div className="space-y-4">
        {openPositions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <h3 className="text-xl font-semibold mb-2">No Active Positions</h3>
            <p>Execute trades from your calculator to see them here</p>
          </div>
        ) : (
          openPositions.map(position => {
            const pnl = calculatePnL(position);
            return (
              <div key={position.id} className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-cyan-400">
                      {position.symbol} {position.direction}
                    </h4>
                    <div className="text-sm text-gray-400">
                      Opened: {new Date(position.openDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-right ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="text-lg font-bold">
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </div>
                    <div className="text-sm">P&L</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Entry:</span>
                    <div className="font-semibold">${position.entryPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Current:</span>
                    <div className="font-semibold">${position.currentPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Target:</span>
                    <div className="font-semibold">${position.targetPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Stop:</span>
                    <div className="font-semibold">${position.stopPrice.toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Size:</span>
                    <div className="font-semibold">${position.size.toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdatePrice(position.id)}
                      size="sm"
                      className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
                    >
                      Update
                    </Button>
                    <Button
                      onClick={() => handleClosePosition(position.id)}
                      size="sm"
                      className="bg-green-500/20 hover:bg-green-500/30 text-green-400"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
