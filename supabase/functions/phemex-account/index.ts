
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a UNIX timestamp ~1 min in the future
function getExpiry() {
  return Math.floor(Date.now() / 1000) + 60;
}

// Convert ArrayBuffer to hex string
function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// HMAC-SHA256 via Web Crypto API
async function hmacSHA256(secret: string, data: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );
  return toHex(signature);
}

// Build the signature per Phemex spec: HMAC_SHA256(path + query + expiry + body)
async function sign(path: string, queryString = '', body = '') {
  const apiSecret = Deno.env.get('PHEMEX_API_SECRET');
  if (!apiSecret) {
    throw new Error('PHEMEX_API_SECRET not configured');
  }

  const expiry = getExpiry();
  const payload = path + queryString + expiry + body;
  const signature = await hmacSHA256(apiSecret, payload);

  return { expiry, signature };
}

// Currency scaling factors for Phemex (how to convert balanceEv to actual balance)
const CURRENCY_SCALES = {
  'USDT': 1e8,
  'USD': 1e8,
  'BTC': 1e8,
  'ETH': 1e8,
  'XRP': 1e6,
  'LINK': 1e6,
  'ADA': 1e6,
  'DOT': 1e6,
  'SOL': 1e6,
  'MATIC': 1e6,
  'AVAX': 1e6,
  'NEAR': 1e6,
  'SUI': 1e6,
  'TON': 1e6,
  'TRX': 1e6,
  'MKR': 1e6,
  'IMX': 1e6,
  'INJ': 1e6,
  'HNT': 1e6,
  'WIF': 1e6,
  'JUP': 1e6,
  'BLAST': 1e6,
  'POL': 1e6,
  'USDC': 1e8
};

// Simple price estimates (you might want to fetch real prices from an API)
const APPROXIMATE_USD_PRICES = {
  'USDT': 1,
  'USD': 1,
  'USDC': 1,
  'BTC': 43000,
  'ETH': 2300,
  'XRP': 0.6,
  'LINK': 14,
  'ADA': 0.4,
  'DOT': 7,
  'SOL': 60,
  'MATIC': 0.8,
  'AVAX': 25,
  'NEAR': 2,
  'SUI': 1.8,
  'TON': 2.2,
  'TRX': 0.1,
  'MKR': 1500,
  'IMX': 1.2,
  'INJ': 20,
  'HNT': 3,
  'WIF': 2,
  'JUP': 0.8,
  'BLAST': 0.02,
  'POL': 0.4
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PHEMEX_API_KEY');
    const apiSecret = Deno.env.get('PHEMEX_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new Error('Phemex API credentials not configured');
    }

    // Use spot wallets endpoint for account balance
    const path = '/spot/wallets';
    const queryString = '';
    const body = '';
    
    console.log('Phemex Spot Wallets API Call Details:');
    console.log('- Path:', path);
    console.log('- Query String:', queryString);
    console.log('- Body:', body);
    console.log('- API Key (first 10 chars):', apiKey.substring(0, 10));
    
    const { expiry, signature } = await sign(path, queryString, body);
    
    console.log('- Expiry (UNIX):', expiry);
    console.log('- Signature Message:', path + queryString + expiry + body);
    console.log('- Generated Signature:', signature);

    const apiUrl = `https://api.phemex.com${path}${queryString}`;
    console.log('- Making request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signature,
        'x-phemex-request-expiry': expiry.toString(),
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Body:', responseText);

    if (!response.ok) {
      console.error(`Phemex HTTP ${response.status} on ${path}`, responseText);
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse JSON:', responseText);
      throw e;
    }

    console.log('Parsed Response:', JSON.stringify(data, null, 2));

    // Check for Phemex API error code
    if (data.code !== 0) {
      console.error(`Phemex API error ${data.code} on ${path}`, data);
      throw new Error(`Phemex API error ${data.code}: ${data.msg}`);
    }

    // Extract account information from spot wallets response
    let account = {
      accountID: 0,
      currency: 'USD',
      totalEquity: 0,
      availableBalance: 0,
      unrealisedPnl: 0
    };

    if (data.data && Array.isArray(data.data)) {
      let totalEquityUSD = 0;
      let usdtBalance = 0;
      const balanceDetails: any[] = [];
      
      for (const wallet of data.data) {
        const currency = wallet.currency;
        const balanceEv = parseFloat(wallet.balanceEv || '0');
        
        if (balanceEv > 0) {
          // Get the scaling factor for this currency
          const scale = CURRENCY_SCALES[currency] || 1e8;
          const actualBalance = balanceEv / scale;
          
          // Get approximate USD value
          const usdPrice = APPROXIMATE_USD_PRICES[currency] || 0;
          const usdValue = actualBalance * usdPrice;
          
          console.log(`${currency}: ${balanceEv} balanceEv -> ${actualBalance} ${currency} -> $${usdValue.toFixed(2)} USD`);
          
          totalEquityUSD += usdValue;
          
          if (currency === 'USDT') {
            usdtBalance = actualBalance;
          }
          
          balanceDetails.push({
            currency,
            balance: actualBalance,
            usdValue: usdValue
          });
        }
      }

      console.log('Balance Details:', balanceDetails);
      console.log('Total Equity USD:', totalEquityUSD);

      account = {
        accountID: data.data[0]?.userId || 0,
        currency: 'USD',
        totalEquity: totalEquityUSD,
        availableBalance: usdtBalance,
        unrealisedPnl: 0 // Spot doesn't have unrealized PnL
      };
    }

    console.log('Final Account Object:', JSON.stringify(account, null, 2));
    
    return new Response(
      JSON.stringify({ data: { account } }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
