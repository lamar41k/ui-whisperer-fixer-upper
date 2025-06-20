
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TradingSetup } from '@/hooks/useTradingData';

interface WatchlistTabProps {
  setups: TradingSetup[];
  deleteSetup: (id: string) => void;
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({ setups, deleteSetup }) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredSetups = setups.filter(setup => 
    filter === 'all' || setup.status === filter
  );

  const handleDelete = (id: string) => {
    if (confirm('Delete this setup? This cannot be undone.')) {
      deleteSetup(id);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return '#22c55e';
    if (probability >= 70) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'monitoring', 'active', 'executed', 'cancelled'].map(filterOption => (
          <Button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            variant={filter === filterOption ? "default" : "ghost"}
            size="sm"
            className={filter === filterOption 
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
              : "text-gray-400 hover:text-cyan-400"
            }
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </Button>
        ))}
      </div>

      {/* Setups List */}
      <div className="space-y-4">
        {filteredSetups.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <h3 className="text-xl font-semibold mb-2">
              No {filter === 'all' ? '' : filter} setups
            </h3>
            <p>Create a new setup using the calculator</p>
          </div>
        ) : (
          filteredSetups.map(setup => (
            <div key={setup.id} className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getPriorityColor(setup.priority) }}
                  />
                  <h4 className="text-lg font-semibold text-cyan-400">{setup.symbol}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    setup.direction === 'LONG' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {setup.direction}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(setup.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Stop:</span>
                  <div className="font-semibold">${setup.stopPrice.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Target:</span>
                  <div className="font-semibold">${setup.targetPrice.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Probability:</span>
                  <div 
                    className="font-semibold"
                    style={{ color: getProbabilityColor(setup.probability) }}
                  >
                    {setup.probability}%
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Allocation:</span>
                  <div className="font-semibold">${setup.totalAllocation.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div className="font-semibold capitalize">{setup.status}</div>
                </div>
                <div>
                  <span className="text-gray-400">Factors:</span>
                  <div className="font-semibold">{setup.totalFactors}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
