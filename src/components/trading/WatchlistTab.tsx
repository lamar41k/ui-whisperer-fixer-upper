
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TradingSetup } from '@/hooks/useTradingData';

interface WatchlistTabProps {
  setups: TradingSetup[];
  deleteSetup: (id: string) => void;
  updateSetup?: (setup: TradingSetup) => void;
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({ setups, deleteSetup, updateSetup }) => {
  const [filter, setFilter] = useState<string>('all');
  const [editingSetup, setEditingSetup] = useState<TradingSetup | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredSetups = setups.filter(setup => 
    filter === 'all' || setup.status === filter
  );

  const handleDelete = (id: string) => {
    if (confirm('Delete this setup? This cannot be undone.')) {
      deleteSetup(id);
    }
  };

  const handleEdit = (setup: TradingSetup) => {
    setEditingSetup({ ...setup });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingSetup && updateSetup) {
      updateSetup({
        ...editingSetup,
        lastUpdated: new Date().toISOString()
      });
      setIsEditDialogOpen(false);
      setEditingSetup(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingSetup(null);
  };

  const updateEditField = (field: keyof TradingSetup, value: any) => {
    if (editingSetup) {
      setEditingSetup(prev => prev ? { ...prev, [field]: value } : null);
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
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => handleEdit(setup)}
                  >
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-cyan-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Setup</DialogTitle>
          </DialogHeader>
          
          {editingSetup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Symbol</Label>
                  <Input
                    value={editingSetup.symbol}
                    onChange={(e) => updateEditField('symbol', e.target.value.toUpperCase())}
                    className="bg-gray-600/50 border-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Direction</Label>
                  <Select value={editingSetup.direction} onValueChange={(value) => updateEditField('direction', value)}>
                    <SelectTrigger className="bg-gray-600/50 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LONG">Long</SelectItem>
                      <SelectItem value="SHORT">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Target Price</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={editingSetup.targetPrice}
                    onChange={(e) => updateEditField('targetPrice', parseFloat(e.target.value) || 0)}
                    className="bg-gray-600/50 border-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Stop Price</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={editingSetup.stopPrice}
                    onChange={(e) => updateEditField('stopPrice', parseFloat(e.target.value) || 0)}
                    className="bg-gray-600/50 border-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Total Allocation</Label>
                  <Input
                    type="number"
                    value={editingSetup.totalAllocation}
                    onChange={(e) => updateEditField('totalAllocation', parseFloat(e.target.value) || 0)}
                    className="bg-gray-600/50 border-gray-500"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Priority</Label>
                  <Select value={editingSetup.priority} onValueChange={(value) => updateEditField('priority', value)}>
                    <SelectTrigger className="bg-gray-600/50 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Status</Label>
                  <Select value={editingSetup.status} onValueChange={(value) => updateEditField('status', value)}>
                    <SelectTrigger className="bg-gray-600/50 border-gray-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="executed">Executed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Setup Name</Label>
                  <Input
                    value={editingSetup.name}
                    onChange={(e) => updateEditField('name', e.target.value)}
                    className="bg-gray-600/50 border-gray-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} className="bg-cyan-500 hover:bg-cyan-600">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
