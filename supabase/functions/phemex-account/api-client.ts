
import { sign } from './crypto-utils.ts';
import { PhemexSpotResponse } from './types.ts';

export class PhemexApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async makeRequest(path: string, queryString = ''): Promise<Response> {
    const { expiry, signature } = await sign(path, queryString, '');
    
    const apiUrl = `https://api.phemex.com${path}${queryString}`;
    console.log(`Making request to: ${path}${queryString}`);
    console.log(`Full URL: ${apiUrl}`);
    console.log(`Signature payload: ${path}${queryString.startsWith('?') ? queryString.substring(1) : queryString}${expiry}`);
    
    return fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': this.apiKey,
        'x-phemex-request-signature': signature,
        'x-phemex-request-expiry': expiry.toString(),
        'Content-Type': 'application/json',
      },
    });
  }

  async getUsdtFuturesAccount(): Promise<Response> {
    // This is the correct endpoint for USDT futures account
    const path = '/g-accounts/accountPositions';
    return this.makeRequest(path);
  }

  async getCoinFuturesAccount(): Promise<Response> {
    // This is for coin-margined futures account
    const path = '/accounts/accountPositions';
    return this.makeRequest(path);
  }

  async getAccountPositions(): Promise<Response> {
    // Legacy method - now uses coin futures
    return this.getCoinFuturesAccount();
  }

  async getSpotWallets(): Promise<Response> {
    const path = '/spot/wallets';
    return this.makeRequest(path);
  }
}
