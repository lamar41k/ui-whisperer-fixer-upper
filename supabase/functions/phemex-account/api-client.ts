
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
    console.log(`Signature payload: ${path}${queryString}${expiry}`);
    
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

  async getAccountPositions(): Promise<Response> {
    const path = '/accounts/accountPositions';
    return this.makeRequest(path);
  }

  async getSpotWallets(): Promise<Response> {
    const path = '/spot/wallets';
    return this.makeRequest(path);
  }
}
