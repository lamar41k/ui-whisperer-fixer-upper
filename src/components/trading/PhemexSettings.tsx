
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { usePhemex } from '@/hooks/usePhemex';

interface PhemexSettingsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PhemexSettings: React.FC<PhemexSettingsProps> = ({ isOpen, onOpenChange }) => {
  const { isConnected, isLoading, error, account, lastUpdated, connect, disconnect, refreshData } = usePhemex();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    const success = await connect('', '');
    setIsConnecting(false);
  };

  const handleDisconnect = () => {
    disconnect();
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
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="text-blue-400 text-sm font-medium mb-1">Secure Connection</div>
                <div className="text-gray-300 text-xs">
                  Your API credentials are securely stored in Supabase Edge Functions. 
                  Click connect to test the connection with your configured credentials.
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                {isConnecting ? 'Testing Connection...' : 'Test Connection'}
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

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1">
              <AlertCircle size={16} />
              API Permissions Notice
            </div>
            <div className="text-gray-300 text-xs">
              If positions or orders show as empty, your API key may only have spot trading permissions. 
              Perpetual/futures trading requires additional permissions in your Phemex account settings.
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="text-green-400 text-sm font-medium mb-1">✅ Enhanced Error Handling</div>
            <div className="text-gray-300 text-xs">
              The system now tries multiple endpoints and provides helpful feedback when certain features aren't available.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
