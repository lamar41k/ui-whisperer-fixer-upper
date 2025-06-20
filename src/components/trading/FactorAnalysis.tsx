
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

interface FactorAnalysisProps {
  checkedFactors: string[];
  setCheckedFactors: (factors: string[]) => void;
}

export const FactorAnalysis: React.FC<FactorAnalysisProps> = ({ checkedFactors, setCheckedFactors }) => {
  const toggleFactor = (factorId: string) => {
    setCheckedFactors(prev => 
      prev.includes(factorId) 
        ? prev.filter(f => f !== factorId)
        : [...prev, factorId]
    );
  };

  const patternFactors = [
    { id: 'head-shoulders', label: 'Head & Shoulders' },
    { id: 'double-top-bottom', label: 'Double Top/Bottom' },
    { id: 'triple-top-bottom', label: 'Triple Top/Bottom' },
    { id: 'overextension', label: 'Overextension Pattern' },
    { id: 'bull-bear-flag', label: 'Bull/Bear Flag' },
    { id: 'wedge', label: 'Wedge Pattern' }
  ];

  const supportFactors = [
    { id: 'major-level', label: 'Major Support/Resistance' },
    { id: 'multi-hit', label: 'Multi-Hit Level' },
    { id: 'time-healed', label: 'Time Healed (90+ days)' },
    { id: 'trendline', label: 'Major Trendline' },
    { id: 'ma-200', label: '200 SMA' },
    { id: 'fib-level', label: 'Fibonacci Level' }
  ];

  const confluenceFactors = [
    { id: 'rsi-divergence', label: 'RSI Divergence' },
    { id: 'volume-spike', label: 'Volume Spike' },
    { id: 'time-count', label: 'Time Count (7 candles)' },
    { id: 'topping-tail', label: 'Topping/Bottoming Tail' },
    { id: 'expert-confirmation', label: 'Expert Confirmation' },
    { id: 'engulfing', label: 'Engulfing Candle' }
  ];

  const FactorSection = ({ title, factors, count }: { title: string; factors: any[]; count: number }) => (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-cyan-500/30">
      <h4 className="text-md font-semibold text-cyan-400 mb-3">
        {title} <span className="text-sm text-gray-400">({count})</span>
      </h4>
      <div className="space-y-2">
        {factors.map(factor => (
          <div key={factor.id} className="flex items-center space-x-2">
            <Checkbox
              id={factor.id}
              checked={checkedFactors.includes(factor.id)}
              onCheckedChange={() => toggleFactor(factor.id)}
            />
            <label 
              htmlFor={factor.id} 
              className="text-sm text-gray-300 cursor-pointer select-none"
            >
              {factor.label}
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  const patternCount = checkedFactors.filter(f => patternFactors.some(pf => pf.id === f)).length;
  const supportCount = checkedFactors.filter(f => supportFactors.some(sf => sf.id === f)).length;
  const confluenceCount = checkedFactors.filter(f => confluenceFactors.some(cf => cf.id === f)).length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-cyan-400">Factor Analysis</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FactorSection 
          title="Factor 1: Pattern Recognition" 
          factors={patternFactors} 
          count={patternCount}
        />
        <FactorSection 
          title="Factor 2: Support/Resistance" 
          factors={supportFactors} 
          count={supportCount}
        />
        <FactorSection 
          title="Factor 3+: Confluence" 
          factors={confluenceFactors} 
          count={confluenceCount}
        />
      </div>
    </div>
  );
};
