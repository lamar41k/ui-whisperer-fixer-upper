
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { usePhemex } from '@/hooks/usePhemex';
import { PortfolioPosition } from '@/hooks/useTradingData';

interface PhemexSyncProps {
  onSyncPositions: (positions: PortfolioPosition[]) => void;
  existingPositions: PortfolioPosition[];
}

export const PhemexSync: React.FC<PhemexSyncProps> = ({ 
  onSyncPositions, 
  existingPositions 
}) => {
  const { isConnected, positions, isLoading, refreshData, syncPositionsToPortfolio } = usePhemex();

  if (!isConnected) {
    return (
      <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
        <div className="text-center text-gray-400">
          <p className="text-sm">Connect to Phemex to sync live positions</p>
        </div>
      </div>
    );
  }

  const handleSyncPositions = () => {
    const phemexPositions = syncPositionsToPortfolio();
    
    // Filter out positions that already exist (avoid duplicates)
    const newPositions = phemexPositions.filter(pos => 
      !existingPositions.some(existing => 
        existing.symbol === pos.symbol && existing.direction === pos.direction
      )
    );

    if (newPositions.length > 0) {
      onSyncPositions(newPositions);
    }
  };

  const activePhemexPositions = positions.filter(pos => pos.size > 0);
  const syncablePositions = syncPositionsToPortfolio().filter(pos => 
    !existingPositions.some(existing => 
      existing.symbol === pos.symbol && existing.direction === pos.direction
    )
  );

  return (
    <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-cyan-400">Phemex Positions</h4>
          <p className="text-xs text-gray-400">
            {activePhemexPositions.length} active position{activePhemexPositions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          onClick={refreshData}
          disabled={isLoading}
          size="sm"
          className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {activePhemexPositions.length > 0 && (
        <div className="space-y-2">
          {activePhemexPositions.slice(0, 3).map((pos) => {
            const isAlreadySynced = existingPositions.some(existing => 
              existing.symbol === pos.symbol && 
              existing.direction === (pos.side === 'Buy' ? 'LONG' : 'SHORT')
            );

            return (
              <div key={pos.symbol} className="flex items-center justify-between bg-gray-600/20 rounded p-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{pos.symbol}</span>
                  <Badge 
                    variant={pos.side === 'Buy' ? 'default' : 'destructive'}
                    className={pos.side === 'Buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
                  >
                    {pos.side === 'Buy' ? 'LONG' : 'SHORT'}
                  </Badge>
                  {isAlreadySynced && (
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                      Synced
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className={pos.unrealisedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {pos.unrealisedPnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    ${pos.unrealisedPnl.toFixed(2)}
                  </div>
                </div>
              </div>
            );
          })}

          {syncablePositions.length > 0 && (
            <Button
              onClick={handleSyncPositions}
              className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
              size="sm"
            >
              <ArrowRight className="mr-2 h-4 w-4" />
              Sync {syncablePositions.length} New Position{syncablePositions.length !== 1 ? 's' : ''} to Portfolio
            </Button>
          )}
        </div>
      )}

      {activePhemexPositions.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          <p className="text-sm">No active positions found</p>
        </div>
      )}
    </div>
  );
};
