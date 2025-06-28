
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

// Convert Phemex balance values (which are in integer format) to decimal
function convertPhemexBalance(balanceEv: number, currency: string): number {
  // Different currencies have different scaling factors
  const scalingFactors: { [key: string]: number } = {
    'USD': 10000,
    'USDT': 1000000,
    'BTC': 100000000,
    'ETH': 1000000000000000000,
    'XRP': 1000000,
    'LINK': 1000000,
    'ADA': 1000000,
    'DOT': 10000,
    'SOL': 1000000000,
    'AVAX': 1000000000,
    'NEAR': 1000000,
    'default': 1000000
  };
  
  const scaleFactor = scalingFactors[currency] || scalingFactors['default'];
  return balanceEv / scaleFactor;
}

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

    console.log('Fetching Phemex account info...');

    // Use the correct account info endpoint
    const path = '/phemex-user/users/children';
    const queryString = '';
    
    console.log(`Making request to: ${path}`);
    
    const { expiry, signature } = await sign(path, queryString, '');
    
    const apiUrl = `https://api.phemex.com${path}`;
    console.log(`Full URL: ${apiUrl}`);
    console.log(`Signature payload: ${path}${queryString}${expiry}`);
    
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
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body:`, responseText);

    if (!response.ok) {
      console.error(`Failed: HTTP ${response.status}`);
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`Failed to parse JSON:`, responseText);
      throw new Error('Invalid JSON response');
    }

    // Check for Phemex API error code
    if (data.code !== 0) {
      console.error(`Phemex API error ${data.code}:`, data);
      throw new Error(`Phemex API error ${data.code}: ${data.msg}`);
    }

    console.log(`Success:`, JSON.stringify(data, null, 2));

    // Extract account information from response
    let account = {
      accountID: 0,
      currency: 'USD',
      totalEquity: 0,
      availableBalance: 0,
      unrealisedPnl: 0
    };

    if (data.data && data.data.length > 0) {
      const userData = data.data[0];
      
      // Calculate total equity from all wallets
      let totalEquityUSD = 0;
      let availableBalanceUSD = 0;
      
      if (userData.wallets && Array.isArray(userData.wallets)) {
        userData.wallets.forEach((wallet: any) => {
          if (wallet.balanceEv && wallet.balanceEv > 0) {
            const balance = convertPhemexBalance(wallet.balanceEv, wallet.currency);
            console.log(`${wallet.currency} balance: ${balance} (raw: ${wallet.balanceEv})`);
            
            // For now, we'll just sum all balances as if they were USD equivalent
            // In a real implementation, you'd convert to USD using exchange rates
            if (wallet.currency === 'USD' || wallet.currency === 'USDT' || wallet.currency === 'USDC') {
              totalEquityUSD += balance;
              availableBalanceUSD += balance;
            } else {
              // For other currencies, we'll add a small representative value
              // This is simplified - in reality you'd need to convert to USD
              totalEquityUSD += balance * 0.1; // Placeholder conversion
              availableBalanceUSD += balance * 0.1;
            }
          }
        });
      }
      
      // Also check margin accounts
      if (userData.userMarginVo && Array.isArray(userData.userMarginVo)) {
        userData.userMarginVo.forEach((margin: any) => {
          if (margin.accountBalanceEv && margin.accountBalanceEv > 0) {
            const balance = convertPhemexBalance(margin.accountBalanceEv, margin.currency);
            console.log(`${margin.currency} margin balance: ${balance} (raw: ${margin.accountBalanceEv})`);
            
            if (margin.currency === 'USD' || margin.currency === 'USDT' || margin.currency === 'USDC') {
              totalEquityUSD += balance;
              availableBalanceUSD += balance;
            } else {
              totalEquityUSD += balance * 0.1; // Placeholder conversion
              availableBalanceUSD += balance * 0.1;
            }
          }
        });
      }

      account = {
        accountID: parseInt(userData.userId || '0'),
        currency: 'USD',
        totalEquity: totalEquityUSD,
        availableBalance: availableBalanceUSD,
        unrealisedPnl: 0 // This would need to be calculated from positions
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
