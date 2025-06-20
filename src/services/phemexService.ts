
import CryptoJS from 'crypto-js';

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
  private baseUrl = 'https://api.phemex.com';
  private apiKey: string | null = null;
  private apiSecret: string | null = null;

  constructor() {
    this.loadCredentials();
  }

  private loadCredentials() {
    const saved = localStorage.getItem('phemex_credentials');
    if (saved) {
      try {
        const credentials = JSON.parse(saved);
        this.apiKey = credentials.apiKey;
        this.apiSecret = credentials.apiSecret;
      } catch (error) {
        console.error('Error loading Phemex credentials:', error);
      }
    }
  }

  saveCredentials(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    localStorage.setItem('phemex_credentials', JSON.stringify({ apiKey, apiSecret }));
  }

  clearCredentials() {
    this.apiKey = null;
    this.apiSecret = null;
    localStorage.removeItem('phemex_credentials');
  }

  isConnected(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  private generateSignature(method: string, path: string, queryString: string, body: string, timestamp: number): string {
    if (!this.apiSecret) throw new Error('API secret not configured');
    
    const message = method + path + queryString + timestamp + body;
    return CryptoJS.HmacSHA256(message, this.apiSecret).toString();
  }

  private async makeRequest(method: string, endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('Phemex API credentials not configured');
    }

    const timestamp = Date.now();
    const path = endpoint;
    const queryString = method === 'GET' ? new URLSearchParams(params).toString() : '';
    const body = method !== 'GET' ? JSON.stringify(params) : '';
    
    const signature = this.generateSignature(method, path, queryString, body, timestamp);

    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
    
    const headers: Record<string, string> = {
      'x-phemex-access-token': this.apiKey!,
      'x-phemex-request-signature': signature,
      'x-phemex-request-timestamp': timestamp.toString(),
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Phemex API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAccount();
      return true;
    } catch (error) {
      console.error('Phemex connection test failed:', error);
      return false;
    }
  }

  async getAccount(): Promise<PhemexAccount> {
    const response = await this.makeRequest('GET', '/accounts/accountPositions');
    return response.data.account;
  }

  async getPositions(): Promise<PhemexPosition[]> {
    const response = await this.makeRequest('GET', '/accounts/accountPositions');
    return response.data.positions || [];
  }

  async getOrders(symbol?: string): Promise<PhemexOrder[]> {
    const params = symbol ? { symbol } : {};
    const response = await this.makeRequest('GET', '/orders/activeList', params);
    return response.data.rows || [];
  }

  async getOrderHistory(symbol?: string, limit: number = 100): Promise<PhemexOrder[]> {
    const params = { limit, ...(symbol && { symbol }) };
    const response = await this.makeRequest('GET', '/exchange/order/list', params);
    return response.data.rows || [];
  }

  async placeOrder(symbol: string, side: 'Buy' | 'Sell', orderQty: number, price?: number): Promise<PhemexOrder> {
    const params = {
      symbol,
      side,
      orderQty,
      ordType: price ? 'Limit' : 'Market',
      ...(price && { priceEp: Math.round(price * 10000) }) // Phemex uses scaled prices
    };

    const response = await this.makeRequest('POST', '/orders', params);
    return response.data;
  }
}

export const phemexService = new PhemexService();
