
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Settings } from 'lucide-react';
import { usePhemex } from '@/hooks/usePhemex';
import { PhemexSettings } from './PhemexSettings';

export const PhemexIndicator: React.FC = () => {
  const { isConnected, account } = usePhemex();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Button
        onClick={() => setShowSettings(true)}
        className={`flex items-center gap-2 ${
          isConnected 
            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' 
            : 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-400'
        }`}
        size="sm"
      >
        {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span className="hidden sm:inline">
          {isConnected ? 'Phemex Connected' : 'Connect Phemex'}
        </span>
        {isConnected && account && (
          <span className="hidden md:inline text-xs">
            (${account.totalEquity?.toLocaleString()})
          </span>
        )}
        <Settings size={14} />
      </Button>

      <PhemexSettings 
        isOpen={showSettings} 
        onOpenChange={setShowSettings} 
      />
    </>
  );
};
