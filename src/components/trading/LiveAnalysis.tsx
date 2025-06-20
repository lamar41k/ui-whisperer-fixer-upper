import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveAnalysisProps {
  calculations: {
    probability: number;
    totalFactors: number;
    averageEntry: number;
    totalDeployed: number;
    potentialProfit: number;
    potentialLoss: number;
    riskReward: number;
  };
  portfolioValue: number;
  formData: {
    symbol: string;
    direction: 'long' | 'short';
    targetPrice: number;
    stopPrice: number;
    totalAllocation: number;
  };
  canSave: boolean;
  onSave: () => void;
  onClear: () => void;
  dcaEntries: Array<{
    price: number;
    amount: number;
    status: 'planned' | 'executed';
  }>;
  isEditing?: boolean;
}

export const LiveAnalysis: React.FC<LiveAnalysisProps> = ({
  calculations,
  portfolioValue,
  formData,
  canSave,
  onSave,
  onClear,
  dcaEntries,
  isEditing = false
}) => {
  const [selectedEntry, setSelectedEntry] = useState(1);

  const calculateScenario = (entryCount: number) => {
    const executedEntries = dcaEntries.slice(0, entryCount).filter(entry => entry.status === 'executed' && entry.price > 0 && entry.amount > 0);
    const totalDeployed = executedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const weightedSum = executedEntries.reduce((sum, entry) => sum + (entry.price * entry.amount), 0);
    const averageEntry = totalDeployed > 0 ? weightedSum / totalDeployed : 0;

    let potentialProfit = 0;
    let potentialLoss = 0;
    
    if (averageEntry > 0 && formData.targetPrice > 0 && formData.stopPrice > 0 && totalDeployed > 0) {
      if (formData.direction === 'long') {
        potentialProfit = ((formData.targetPrice - averageEntry) / averageEntry) * totalDeployed;
        potentialLoss = ((averageEntry - formData.stopPrice) / averageEntry) * totalDeployed;
      } else {
        potentialProfit = ((averageEntry - formData.targetPrice) / averageEntry) * totalDeployed;
        potentialLoss = ((formData.stopPrice - averageEntry) / averageEntry) * totalDeployed;
      }
    }

    const riskReward = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;

    return {
      averageEntry,
      totalDeployed,
      potentialProfit,
      potentialLoss,
      riskReward
    };
  };

  const scenarioCalc = calculateScenario(selectedEntry);

  return (
    <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-400">Live Analysis</h3>
        {isEditing && (
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
            Editing
          </Badge>
        )}
      </div>

      {/* Entry Scenario Toggle */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">What-if Scenario</h4>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((entry) => (
            <button
              key={entry}
              onClick={() => setSelectedEntry(entry)}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                selectedEntry === entry
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/50'
              }`}
            >
              Entry {entry}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Analysis */}
      <div className="space-y-4">
        <div className="bg-gray-600/20 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-cyan-400">Scenario: Up to Entry {selectedEntry}</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Avg Entry</div>
              <div className="text-white font-medium">
                ${scenarioCalc.averageEntry > 0 ? scenarioCalc.averageEntry.toFixed(4) : '0.0000'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Deployed</div>
              <div className="text-white font-medium">
                ${scenarioCalc.totalDeployed.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Potential Profit</div>
              <div className="text-green-400 font-medium">
                ${scenarioCalc.potentialProfit.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Potential Loss</div>
              <div className="text-red-400 font-medium">
                ${scenarioCalc.potentialLoss.toFixed(0)}
              </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-600/30">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Risk/Reward</span>
              <span className={`font-medium ${
                scenarioCalc.riskReward >= 2 ? 'text-green-400' :
                scenarioCalc.riskReward >= 1 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {scenarioCalc.riskReward > 0 ? `1:${scenarioCalc.riskReward.toFixed(2)}` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Factor Analysis Summary */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Factor Analysis</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400">Probability</div>
            <div className="text-cyan-400 font-medium">{calculations.probability}%</div>
          </div>
          <div>
            <div className="text-gray-400">Total Factors</div>
            <div className="text-cyan-400 font-medium">{calculations.totalFactors}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button 
          onClick={onSave} 
          disabled={!canSave}
          className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          {isEditing ? 'Update Setup' : 'Save Setup'}
        </Button>
        <Button 
          onClick={onClear} 
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-600/20"
        >
          Clear
        </Button>
      </div>
    </div>
  );
};
