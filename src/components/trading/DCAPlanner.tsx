
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DCAEntry {
  price: number;
  amount: number;
  status: 'planned' | 'executed';
}

interface DCAPlannerProps {
  entries: DCAEntry[];
  setEntries: (entries: DCAEntry[]) => void;
  portfolioValue: number;
  calculations: any;
}

export const DCAPlanner: React.FC<DCAPlannerProps> = ({ entries, setEntries, portfolioValue, calculations }) => {
  const updateEntry = (index: number, field: keyof DCAEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-6 border border-cyan-500/30">
      <h3 className="text-lg font-semibold text-cyan-400 mb-4">DCA Entry Planning</h3>
      
      <div className="space-y-4">
        {entries.map((entry, index) => {
          const entryPercent = entry.amount > 0 ? ((entry.amount / portfolioValue) * 100).toFixed(1) : '0';
          
          return (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-600/30 rounded-lg">
              <div>
                <Label className="text-gray-300">Entry {index + 1} Price</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={entry.price || ''}
                  onChange={(e) => updateEntry(index, 'price', parseFloat(e.target.value) || 0)}
                  className="bg-gray-600/50 border-gray-500 text-white"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Amount ($)</Label>
                <Input
                  type="number"
                  value={entry.amount || ''}
                  onChange={(e) => updateEntry(index, 'amount', parseFloat(e.target.value) || 0)}
                  className="bg-gray-600/50 border-gray-500 text-white"
                />
              </div>
              
              <div>
                <Label className="text-gray-300">Status</Label>
                <Select 
                  value={entry.status} 
                  onValueChange={(value) => updateEntry(index, 'status', value)}
                >
                  <SelectTrigger className="bg-gray-600/50 border-gray-500 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="executed">Executed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="text-sm text-gray-400">
                  Portfolio: {entryPercent}%
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
          <div>
            <div className="text-sm text-gray-400">Average Entry</div>
            <div className="text-lg font-semibold text-cyan-400">
              ${calculations.averageEntry.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Total Deployed</div>
            <div className="text-lg font-semibold text-cyan-400">
              ${calculations.totalDeployed.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Remaining Allocation</div>
            <div className="text-lg font-semibold text-cyan-400">
              ${(entries.reduce((sum, e) => sum + e.amount, 0) - calculations.totalDeployed).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
