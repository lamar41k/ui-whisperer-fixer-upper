
import { supabase } from '@/integrations/supabase/client';

export interface PhemexPosition {
  symbol: string;
  side: 'Buy' | 'Sell';
  size: number;
  value: number;
  entryPrice: number;
  markPrice: number;
  unrealisedPnl: number;
  unrealisedPnlPcnt: number;
}

export interface PhemexOrder {
  orderID: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  ordType: string;
  price: number;
  orderQty: number;
  cumQty: number;
  ordStatus: string;
  transactTime: number;
}

export interface PhemexAccount {
  accountID: number;
  currency: string;
  totalEquity: number;
  availableBalance: number;
  unrealisedPnl: number;
}

class PhemexService {
  private isCredentialsConfigured = false;

  constructor() {
    // Check if credentials are configured in Supabase
    this.checkCredentials();
  }

  private async checkCredentials() {
    try {
      // Test connection to see if credentials are working
      const { data } = await supabase.functions.invoke('phemex-account');
      this.isCredentialsConfigured = !data?.error;
    } catch (error) {
      this.isCredentialsConfigured = false;
    }
  }

  saveCredentials(apiKey: string, apiSecret: string) {
    // Credentials are now stored securely in Supabase secrets
    // This method is kept for compatibility but doesn't store locally
    console.log('Credentials configured in Supabase secrets');
    this.isCredentialsConfigured = true;
  }

  clearCredentials() {
    // Cannot clear Supabase secrets from frontend
    // This would need to be done through Supabase dashboard
    console.log('To clear credentials, remove them from Supabase Edge Functions secrets');
    this.isCredentialsConfigured = false;
  }

  isConnected(): boolean {
    return this.isCredentialsConfigured;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('phemex-account');
      if (error) {
        console.error('Phemex connection test failed:', error);
        return false;
      }
      this.isCredentialsConfigured = true;
      return true;
    } catch (error) {
      console.error('Phemex connection test failed:', error);
      this.isCredentialsConfigured = false;
      return false;
    }
  }

  async getAccount(): Promise<PhemexAccount> {
    const { data, error } = await supabase.functions.invoke('phemex-account');
    
    if (error) {
      throw new Error(`Failed to get account: ${error.message}`);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.data.account;
  }

  async getPositions(): Promise<PhemexPosition[]> {
    const { data, error } = await supabase.functions.invoke('phemex-positions');
    
    if (error) {
      throw new Error(`Failed to get positions: ${error.message}`);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.data.positions || [];
  }

  async getOrders(symbol?: string): Promise<PhemexOrder[]> {
    const params = symbol ? { symbol } : {};
    const { data, error } = await supabase.functions.invoke('phemex-orders', {
      body: params
    });
    
    if (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.data.rows || [];
  }

  async getOrderHistory(symbol?: string, limit: number = 100): Promise<PhemexOrder[]> {
    // This would need a separate edge function if needed
    // For now, returning empty array
    return [];
  }

  async placeOrder(symbol: string, side: 'Buy' | 'Sell', orderQty: number, price?: number): Promise<PhemexOrder> {
    const { data, error } = await supabase.functions.invoke('phemex-place-order', {
      body: { symbol, side, orderQty, price }
    });
    
    if (error) {
      throw new Error(`Failed to place order: ${error.message}`);
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.data;
  }
}

export const phemexService = new PhemexService();
