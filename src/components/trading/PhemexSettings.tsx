
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { usePhemex } from '@/hooks/usePhemex';

interface PhemexSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PhemexSettings: React.FC<PhemexSettingsProps> = ({ isOpen, onOpenChange }) => {
  const { isConnected, isLoading, error, account, lastUpdated, connect, disconnect, refreshData } = usePhemex();
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      return;
    }

    setIsConnecting(true);
    const success = await connect(apiKey.trim(), apiSecret.trim());
    
    if (success) {
      setApiKey('');
      setApiSecret('');
    }
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    disconnect();
    setApiKey('');
    setApiSecret('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border-gray-600 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 flex items-center gap-2">
            <Settings size={20} />
            Phemex API Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="text-green-400" size={20} />
                ) : (
                  <WifiOff className="text-red-400" size={20} />
                )}
                <span className={`font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {isConnected && (
                <Button
                  onClick={refreshData}
                  disabled={isLoading}
                  size="sm"
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
            
            {isConnected && account && (
              <div className="mt-2 text-sm text-gray-300">
                <div>Balance: ${account.totalEquity?.toLocaleString()}</div>
                <div>Available: ${account.availableBalance?.toLocaleString()}</div>
              </div>
            )}
            
            {lastUpdated && (
              <div className="mt-1 text-xs text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-red-400 text-sm">{error}</div>
            </div>
          )}

          {!isConnected ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="api-key" className="text-gray-300">API Key</Label>
                <Input
                  id="api-key"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Phemex API key"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="api-secret" className="text-gray-300">API Secret</Label>
                <Input
                  id="api-secret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your Phemex API secret"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting || !apiKey.trim() || !apiSecret.trim()}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {isConnecting ? 'Connecting...' : 'Connect to Phemex'}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleDisconnect}
              className="w-full bg-red-500 hover:bg-red-600"
            >
              Disconnect
            </Button>
          )}

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="text-blue-400 text-sm font-medium mb-1">Security Note</div>
            <div className="text-gray-300 text-xs">
              Your API credentials are stored locally in your browser. Make sure to use read/trade permissions only.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
