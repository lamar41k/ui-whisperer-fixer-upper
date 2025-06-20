
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradeFormProps {
  formData: any;
  setFormData: (data: any) => void;
}

export const TradeForm: React.FC<TradeFormProps> = ({ formData, setFormData }) => {
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-6 border border-cyan-500/30">
      <h3 className="text-lg font-semibold text-cyan-400 mb-4">Trade Setup</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="symbol" className="text-gray-300">Symbol</Label>
          <Input
            id="symbol"
            value={formData.symbol}
            onChange={(e) => updateField('symbol', e.target.value.toUpperCase())}
            placeholder="BTC, ETH, etc."
            className="bg-gray-600/50 border-gray-500 text-white"
          />
        </div>
        
        <div>
          <Label htmlFor="direction" className="text-gray-300">Direction</Label>
          <Select value={formData.direction} onValueChange={(value) => updateField('direction', value)}>
            <SelectTrigger className="bg-gray-600/50 border-gray-500 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="targetPrice" className="text-gray-300">Target Price</Label>
          <Input
            id="targetPrice"
            type="number"
            step="0.0001"
            value={formData.targetPrice || ''}
            onChange={(e) => updateField('targetPrice', parseFloat(e.target.value) || 0)}
            className="bg-gray-600/50 border-gray-500 text-white"
          />
        </div>
        
        <div>
          <Label htmlFor="stopPrice" className="text-gray-300">Stop Price</Label>
          <Input
            id="stopPrice"
            type="number"
            step="0.0001"
            value={formData.stopPrice || ''}
            onChange={(e) => updateField('stopPrice', parseFloat(e.target.value) || 0)}
            className="bg-gray-600/50 border-gray-500 text-white"
          />
        </div>
        
        <div>
          <Label htmlFor="totalAllocation" className="text-gray-300">Total Allocation ($)</Label>
          <Input
            id="totalAllocation"
            type="number"
            value={formData.totalAllocation || ''}
            onChange={(e) => updateField('totalAllocation', parseFloat(e.target.value) || 0)}
            className="bg-gray-600/50 border-gray-500 text-white"
          />
        </div>
        
        <div>
          <Label htmlFor="setupPriority" className="text-gray-300">Priority</Label>
          <Select value={formData.setupPriority} onValueChange={(value) => updateField('setupPriority', value)}>
            <SelectTrigger className="bg-gray-600/50 border-gray-500 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
