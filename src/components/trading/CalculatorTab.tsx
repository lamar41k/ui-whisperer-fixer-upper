
import React, { useState, useEffect } from 'react';
import { FactorAnalysis } from './FactorAnalysis';
import { DCAPlanner } from './DCAPlanner';
import { TradeForm } from './TradeForm';
import { LiveAnalysis } from './LiveAnalysis';
import { TradingSetup } from '@/hooks/useTradingData';

interface CalculatorTabProps {
  portfolioValue: number;
  saveSetup: (setupData: TradingSetup, executedEntries?: any) => void;
  setups: TradingSetup[];
  editingSetupId?: string;
  onClearEdit?: () => void;
}

export const CalculatorTab: React.FC<CalculatorTabProps> = ({ 
  portfolioValue, 
  saveSetup, 
  setups, 
  editingSetupId,
  onClearEdit 
}) => {
  const [formData, setFormData] = useState({
    symbol: '',
    direction: 'long' as 'long' | 'short',
    targetPrice: 0,
    stopPrice: 0,
    totalAllocation: 0,
    setupName: '',
    setupPriority: 'medium' as 'high' | 'medium' | 'low',
    setupStatus: 'monitoring' as 'monitoring' | 'active' | 'executed' | 'cancelled',
    setupTags: ''
  });

  const [checkedFactors, setCheckedFactors] = useState<string[]>([]);
  const [dcaEntries, setDcaEntries] = useState(Array(4).fill(null).map(() => ({
    price: 0,
    amount: 0,
    status: 'planned' as 'planned' | 'executed'
  })));

  const [calculations, setCalculations] = useState({
    probability: 0,
    totalFactors: 0,
    averageEntry: 0,
    totalDeployed: 0,
    potentialProfit: 0,
    potentialLoss: 0,
    riskReward: 0
  });

  // Load setup data when editing
  useEffect(() => {
    if (editingSetupId) {
      const setupToEdit = setups.find(s => s.id === editingSetupId);
      if (setupToEdit) {
        setFormData({
          symbol: setupToEdit.symbol,
          direction: setupToEdit.direction.toLowerCase() as 'long' | 'short',
          targetPrice: setupToEdit.targetPrice,
          stopPrice: setupToEdit.stopPrice,
          totalAllocation: setupToEdit.totalAllocation,
          setupName: setupToEdit.name,
          setupPriority: setupToEdit.priority,
          setupStatus: setupToEdit.status,
          setupTags: setupToEdit.tags.join(', ')
        });
        setCheckedFactors(setupToEdit.factors || []);
        setDcaEntries(setupToEdit.dcaEntries || Array(4).fill(null).map(() => ({
          price: 0,
          amount: 0,
          status: 'planned' as const
        })));
      }
    }
  }, [editingSetupId, setups]);

  // Calculate everything when data changes
  useEffect(() => {
    calculateMetrics();
  }, [checkedFactors, formData, dcaEntries]);

  const calculateMetrics = () => {
    const patternFactors = checkedFactors.filter(f => 
      ['head-shoulders', 'double-top-bottom', 'triple-top-bottom', 'overextension', 'bull-bear-flag', 'wedge'].includes(f)
    ).length;
    
    const supportFactors = checkedFactors.filter(f => 
      ['major-level', 'multi-hit', 'time-healed', 'trendline', 'ma-200', 'fib-level'].includes(f)
    ).length;
    
    const confluenceFactors = checkedFactors.filter(f => 
      ['rsi-divergence', 'volume-spike', 'time-count', 'topping-tail', 'expert-confirmation', 'engulfing'].includes(f)
    ).length;

    const totalFactors = patternFactors + supportFactors + confluenceFactors;

    // Calculate probability
    let probability = 0;
    if (totalFactors === 1) probability = 20;
    else if (totalFactors === 2) probability = 45;
    else if (totalFactors >= 3) {
      probability = 70 + ((totalFactors - 3) * 7);
      probability = Math.min(probability, 95);
    }

    // Calculate DCA metrics
    const executedEntries = dcaEntries.filter(entry => entry.status === 'executed' && entry.price > 0 && entry.amount > 0);
    const totalDeployed = executedEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const weightedSum = executedEntries.reduce((sum, entry) => sum + (entry.price * entry.amount), 0);
    const averageEntry = totalDeployed > 0 ? weightedSum / totalDeployed : 0;

    // Calculate profit scenarios
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

    setCalculations({
      probability,
      totalFactors,
      averageEntry,
      totalDeployed,
      potentialProfit,
      potentialLoss,
      riskReward
    });
  };

  const handleSave = () => {
    const setupData: TradingSetup = {
      id: editingSetupId || Date.now().toString(),
      name: formData.setupName || `${formData.symbol} ${formData.direction}`,
      symbol: formData.symbol.toUpperCase(),
      direction: formData.direction.toUpperCase() as 'LONG' | 'SHORT',
      targetPrice: formData.targetPrice,
      stopPrice: formData.stopPrice,
      totalAllocation: formData.totalAllocation,
      probability: calculations.probability,
      totalFactors: calculations.totalFactors,
      priority: formData.setupPriority,
      status: formData.setupStatus,
      tags: formData.setupTags.split(',').map(tag => tag.trim()).filter(Boolean),
      createdDate: editingSetupId ? setups.find(s => s.id === editingSetupId)?.createdDate || new Date().toISOString() : new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      factors: checkedFactors,
      dcaEntries: dcaEntries
    };

    // Check for executed entries
    const executedEntries = dcaEntries.filter(entry => entry.status === 'executed' && entry.price > 0 && entry.amount > 0);
    
    let portfolioEntry = undefined;
    if (executedEntries.length > 0 && calculations.totalDeployed > 0) {
      portfolioEntry = {
        id: 'pos_' + setupData.id,
        setupId: setupData.id,
        symbol: setupData.symbol,
        direction: setupData.direction,
        entryPrice: calculations.averageEntry,
        currentPrice: calculations.averageEntry,
        targetPrice: setupData.targetPrice,
        stopPrice: setupData.stopPrice,
        size: calculations.totalDeployed,
        openDate: new Date().toISOString(),
        status: 'open' as const
      };
    }

    saveSetup(setupData, portfolioEntry);
    handleClear();
    
    // Show success message
    alert(`Setup ${editingSetupId ? 'updated' : 'saved'} successfully!` + (executedEntries.length > 0 ? ' Executed entries added to portfolio.' : ''));
  };

  const handleClear = () => {
    setFormData({
      symbol: '',
      direction: 'long',
      targetPrice: 0,
      stopPrice: 0,
      totalAllocation: 0,
      setupName: '',
      setupPriority: 'medium',
      setupStatus: 'monitoring',
      setupTags: ''
    });
    setCheckedFactors([]);
    setDcaEntries(Array(4).fill(null).map(() => ({
      price: 0,
      amount: 0,
      status: 'planned' as const
    })));
    if (onClearEdit) {
      onClearEdit();
    }
  };

  const canSave = formData.symbol && formData.targetPrice > 0 && formData.stopPrice > 0;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Main Calculator */}
      <div className="xl:col-span-2 space-y-6">
        {editingSetupId && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-blue-400 font-medium">Editing Setup</h3>
              <button
                onClick={handleClear}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Cancel Edit
              </button>
            </div>
          </div>
        )}
        <TradeForm formData={formData} setFormData={setFormData} />
        <DCAPlanner 
          entries={dcaEntries} 
          setEntries={setDcaEntries}
          portfolioValue={portfolioValue}
          calculations={calculations}
        />
        <FactorAnalysis 
          checkedFactors={checkedFactors}
          setCheckedFactors={setCheckedFactors}
        />
      </div>

      {/* Live Analysis Sidebar */}
      <div className="xl:col-span-1">
        <LiveAnalysis 
          calculations={calculations}
          portfolioValue={portfolioValue}
          formData={formData}
          canSave={canSave}
          onSave={handleSave}
          onClear={handleClear}
          dcaEntries={dcaEntries}
          isEditing={!!editingSetupId}
        />
      </div>
    </div>
  );
};
