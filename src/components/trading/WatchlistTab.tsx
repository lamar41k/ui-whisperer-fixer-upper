import React, { useState } from 'react';
import { Edit, Trash2, Target, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TradingSetup } from '@/hooks/useTradingData';

interface WatchlistTabProps {
  setups: TradingSetup[];
  deleteSetup: (id: string) => void;
  updateSetup: (setup: TradingSetup) => void;
  onEditSetup: (setupId: string) => void;
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({ 
  setups, 
  deleteSetup, 
  updateSetup,
  onEditSetup 
}) => {
  const [editingSetup, setEditingSetup] = useState<TradingSetup | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    targetPrice: 0,
    stopPrice: 0,
    priority: 'medium' as 'high' | 'medium' | 'low',
    status: 'monitoring' as 'monitoring' | 'active' | 'executed' | 'cancelled',
    tags: ''
  });

  const handleEditClick = (setup: TradingSetup) => {
    setEditingSetup(setup);
    setEditForm({
      name: setup.name,
      targetPrice: setup.targetPrice,
      stopPrice: setup.stopPrice,
      priority: setup.priority,
      status: setup.status,
      tags: setup.tags.join(', ')
    });
  };

  const handleSaveEdit = () => {
    if (!editingSetup) return;

    const updatedSetup: TradingSetup = {
      ...editingSetup,
      name: editForm.name,
      targetPrice: editForm.targetPrice,
      stopPrice: editForm.stopPrice,
      priority: editForm.priority,
      status: editForm.status,
      tags: editForm.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      lastUpdated: new Date().toISOString()
    };

    updateSetup(updatedSetup);
    setEditingSetup(null);
  };

  if (setups.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">No trading setups found</div>
        <div className="text-sm text-gray-500">Create your first setup in the Calculator tab</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-cyan-400">Watchlist</h2>
        <div className="text-sm text-gray-400">
          {setups.length} setup{setups.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grid gap-4">
        {setups.map((setup) => (
          <div key={setup.id} className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{setup.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    setup.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                    setup.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {setup.priority}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    setup.status === 'monitoring' ? 'bg-blue-500/20 text-blue-400' :
                    setup.status === 'active' ? 'bg-orange-500/20 text-orange-400' :
                    setup.status === 'executed' ? 'bg-green-500/20 text-green-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {setup.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <span className="flex items-center gap-1">
                    {setup.direction === 'LONG' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {setup.symbol}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={16} />
                    ${setup.targetPrice}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield size={16} />
                    ${setup.stopPrice}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEditSetup(setup.id)}
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteSetup(setup.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Probability</div>
                <div className="text-cyan-400 font-medium">{setup.probability}%</div>
              </div>
              <div>
                <div className="text-gray-400">Factors</div>
                <div className="text-cyan-400 font-medium">{setup.totalFactors}</div>
              </div>
              <div>
                <div className="text-gray-400">Allocation</div>
                <div className="text-cyan-400 font-medium">${setup.totalAllocation}</div>
              </div>
              <div>
                <div className="text-gray-400">Created</div>
                <div className="text-cyan-400 font-medium">
                  {new Date(setup.createdDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {setup.tags && setup.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {setup.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-600/50 text-gray-300 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSetup} onOpenChange={() => setEditingSetup(null)}>
        <DialogContent className="bg-gray-800 border-gray-600">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Setup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-gray-300">Setup Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-target" className="text-gray-300">Target Price</Label>
                <Input
                  id="edit-target"
                  type="number"
                  step="0.0001"
                  value={editForm.targetPrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, targetPrice: parseFloat(e.target.value) || 0 }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-stop" className="text-gray-300">Stop Price</Label>
                <Input
                  id="edit-stop"
                  type="number"
                  step="0.0001"
                  value={editForm.stopPrice}
                  onChange={(e) => setEditForm(prev => ({ ...prev, stopPrice: parseFloat(e.target.value) || 0 }))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-priority" className="text-gray-300">Priority</Label>
                <select
                  id="edit-priority"
                  value={editForm.priority}
                  onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as 'high' | 'medium' | 'low' }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-status" className="text-gray-300">Status</Label>
                <select
                  id="edit-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as 'monitoring' | 'active' | 'executed' | 'cancelled' }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="monitoring">Monitoring</option>
                  <option value="active">Active</option>
                  <option value="executed">Executed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-tags" className="text-gray-300">Tags (comma separated)</Label>
              <Input
                id="edit-tags"
                value={editForm.tags}
                onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleSaveEdit} className="flex-1 bg-cyan-500 hover:bg-cyan-600">
                Save Changes
              </Button>
              <Button onClick={() => setEditingSetup(null)} variant="outline" className="border-gray-600">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
