
interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  last_updated: string;
}

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

class CryptoService {
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private symbolMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'SOL': 'solana',
    'TRX': 'tron',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LTC': 'litecoin',
    'SHIB': 'shiba-inu',
    'AVAX': 'avalanche-2',
    'UNI': 'uniswap',
    'ATOM': 'cosmos',
    'LINK': 'chainlink',
    'XMR': 'monero',
    'ETC': 'ethereum-classic',
    'BCH': 'bitcoin-cash',
    'ALGO': 'algorand'
  };

  private getCoinId(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    return this.symbolMap[upperSymbol] || symbol.toLowerCase();
  }

  async fetchPrices(symbols: string[]): Promise<Record<string, PriceData>> {
    try {
      const coinIds = symbols.map(symbol => this.getCoinId(symbol)).join(',');
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const prices: Record<string, PriceData> = {};

      symbols.forEach(symbol => {
        const coinId = this.getCoinId(symbol);
        const priceInfo = data[coinId];
        
        if (priceInfo) {
          prices[symbol.toUpperCase()] = {
            symbol: symbol.toUpperCase(),
            price: priceInfo.usd,
            change24h: priceInfo.usd_24h_change || 0,
            lastUpdated: new Date().toISOString()
          };
        }
      });

      return prices;
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      throw error;
    }
  }

  async fetchSinglePrice(symbol: string): Promise<PriceData | null> {
    try {
      const prices = await this.fetchPrices([symbol]);
      return prices[symbol.toUpperCase()] || null;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }
}

export const cryptoService = new CryptoService();
export type { PriceData };
