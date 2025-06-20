
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface DCAEntry {
  price: number;
  amount: number;
  status: 'planned' | 'executed';
}

interface DCAExit {
  price: number;
  percentage: number;
  status: 'planned' | 'executed';
}

interface DCAPlannerProps {
  entries: DCAEntry[];
  setEntries: (entries: DCAEntry[]) => void;
  exits: DCAExit[];
  setExits: (exits: DCAExit[]) => void;
  portfolioValue: number;
  calculations: any;
}

export const DCAPlanner: React.FC<DCAPlannerProps> = ({ 
  entries, 
  setEntries, 
  exits, 
  setExits, 
  portfolioValue, 
  calculations 
}) => {
  const [entryOpen, setEntryOpen] = React.useState(false);
  const [exitOpen, setExitOpen] = React.useState(false);

  const updateEntry = (index: number, field: keyof DCAEntry, value: any) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setEntries(newEntries);
  };

  const updateExit = (index: number, field: keyof DCAExit, value: any) => {
    const newExits = [...exits];
    newExits[index] = { ...newExits[index], [field]: value };
    setExits(newExits);
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-6 border border-cyan-500/30 space-y-6">
      {/* Entry Planning */}
      <Collapsible open={entryOpen} onOpenChange={setEntryOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <h3 className="text-lg font-semibold text-cyan-400">DCA Entry Planning</h3>
          <ChevronDown className={`h-4 w-4 transition-transform ${entryOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
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
            
            {/* Entry Summary */}
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
        </CollapsibleContent>
      </Collapsible>

      {/* Exit Planning */}
      <Collapsible open={exitOpen} onOpenChange={setExitOpen}>
        <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
          <h3 className="text-lg font-semibold text-cyan-400">DCA Exit Planning</h3>
          <ChevronDown className={`h-4 w-4 transition-transform ${exitOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="space-y-4">
            {exits.map((exit, index) => {
              const exitAmount = calculations.totalDeployed > 0 ? (calculations.totalDeployed * (exit.percentage / 100)).toFixed(0) : '0';
              
              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-600/30 rounded-lg">
                  <div>
                    <Label className="text-gray-300">Exit {index + 1} Price</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={exit.price || ''}
                      onChange={(e) => updateExit(index, 'price', parseFloat(e.target.value) || 0)}
                      className="bg-gray-600/50 border-gray-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Position %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={exit.percentage || ''}
                      onChange={(e) => updateExit(index, 'percentage', parseFloat(e.target.value) || 0)}
                      className="bg-gray-600/50 border-gray-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300">Status</Label>
                    <Select 
                      value={exit.status} 
                      onValueChange={(value) => updateExit(index, 'status', value)}
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
                      Amount: ${exitAmount}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Exit Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <div>
                <div className="text-sm text-gray-400">Total Exit %</div>
                <div className="text-lg font-semibold text-green-400">
                  {exits.reduce((sum, exit) => sum + exit.percentage, 0)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Executed Exits</div>
                <div className="text-lg font-semibold text-green-400">
                  {exits.filter(exit => exit.status === 'executed').length} / {exits.length}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Remaining Position</div>
                <div className="text-lg font-semibold text-green-400">
                  {100 - exits.filter(exit => exit.status === 'executed').reduce((sum, exit) => sum + exit.percentage, 0)}%
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
