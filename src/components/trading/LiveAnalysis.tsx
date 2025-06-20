
import React from 'react';
import { Button } from '@/components/ui/button';

interface LiveAnalysisProps {
  calculations: any;
  portfolioValue: number;
  formData: any;
  canSave: boolean;
  onSave: () => void;
  onClear: () => void;
}

export const LiveAnalysis: React.FC<LiveAnalysisProps> = ({
  calculations,
  portfolioValue,
  formData,
  canSave,
  onSave,
  onClear
}) => {
  const getConvictionLevel = () => {
    if (calculations.totalFactors < 3) return { level: 'Need 3+ Factors', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (calculations.probability < 70) return { level: 'Low Conviction', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (calculations.probability < 80) return { level: 'Medium Conviction', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
    return { level: 'High Conviction', color: 'text-green-400', bg: 'bg-green-500/20' };
  };

  const conviction = getConvictionLevel();
  const monthlyImpact = (calculations.potentialProfit / 2000) * 100;

  return (
    <div className="bg-gray-700/50 rounded-lg p-6 border border-cyan-500/30 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-cyan-400 mb-2">Live Analysis</h3>
        <p className="text-sm text-gray-400">Real-time probability & profit</p>
      </div>

      {/* Probability Display */}
      <div className="text-center">
        <div className="text-4xl font-bold text-cyan-400 mb-1">
          {calculations.probability}%
        </div>
        <div className="text-sm text-gray-400">Probability</div>
      </div>

      {/* Conviction Level */}
      <div className={`text-center p-3 rounded-lg ${conviction.bg}`}>
        <div className={`font-semibold ${conviction.color}`}>
          {conviction.level} ({calculations.probability}%)
        </div>
      </div>

      {/* Factor Analysis */}
      <div className="space-y-3">
        <h4 className="font-semibold text-cyan-400">📊 Factor Analysis</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Pattern Factors:</span>
            <span className="text-white">{calculations.totalFactors}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Support/Resistance:</span>
            <span className="text-white">—</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Confluence Factors:</span>
            <span className="text-white">—</span>
          </div>
          <div className="flex justify-between border-t border-cyan-500/30 pt-2">
            <span className="font-semibold text-gray-300">Total Factors:</span>
            <span className="font-semibold text-cyan-400">{calculations.totalFactors}</span>
          </div>
        </div>
      </div>

      {/* Position Analysis */}
      <div className="space-y-3">
        <h4 className="font-semibold text-cyan-400">💰 Position Analysis</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Average Entry:</span>
            <span className="text-white">${calculations.averageEntry.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Allocation:</span>
            <span className="text-white">${formData.totalAllocation.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Portfolio %:</span>
            <span className="text-white">{((formData.totalAllocation / portfolioValue) * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Risk/Reward */}
      <div className="space-y-3">
        <h4 className="font-semibold text-cyan-400">📈 Risk/Reward</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Profit:</span>
            <span className="text-green-400">${calculations.potentialProfit.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Potential Loss:</span>
            <span className="text-red-400">${Math.abs(calculations.potentialLoss).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Risk/Reward:</span>
            <span className="text-white">{calculations.riskReward.toFixed(1)}:1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Monthly Goal:</span>
            <span className="text-white">{monthlyImpact.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Warning Box */}
      {calculations.totalFactors < 3 && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
          <div className="text-red-400 text-sm">
            ⚠️ Need minimum 3 factors for any trade
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button 
          onClick={onSave}
          disabled={!canSave}
          className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30"
        >
          {canSave ? 'SAVE SETUP' : 'COMPLETE ALL FIELDS'}
        </Button>
        
        <Button 
          onClick={onClear}
          variant="outline"
          className="w-full border-gray-500 text-gray-400 hover:text-white"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
};
