
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
  // For signature: path + queryString (without ?) + expiry + body
  const signatureQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  const payload = path + signatureQuery + expiry + body;
  const signature = await hmacSHA256(apiSecret, payload);

  return { expiry, signature };
}

// Approximate USD values for major cryptocurrencies (you'd want to fetch real prices in production)
const cryptoPriceEstimates: Record<string, number> = {
  'BTC': 45000,
  'ETH': 2500,
  'XRP': 0.6,
  'LINK': 15,
  'ADA': 0.5,
  'DOT': 7,
  'MKR': 2500,
  'SOL': 100,
  'MATIC': 0.8,
  'IMX': 1.5,
  'INJ': 25,
  'AVAX': 35,
  'NEAR': 4,
  'HNT': 6,
  'SUI': 2,
  'WIF': 2.5,
  'TON': 5,
  'JUP': 0.8,
  'BLAST': 0.02,
  'POL': 0.45,
  'TRX': 0.1,
  'USDT': 1,
  'USDC': 1,
  'USD': 1
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

    console.log('Fetching Phemex account balance...');

    // Try the wallet endpoint first - this should work for getting account balance
    const path = '/accounts/accountPositions';
    const queryString = ''; // Remove the problematic currency parameter
    
    console.log(`Making request to: ${path}${queryString}`);
    
    const { expiry, signature } = await sign(path, queryString, '');
    
    const apiUrl = `https://api.phemex.com${path}${queryString}`;
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
      // If this endpoint fails, try the spot wallet endpoint
      console.log('First endpoint failed, trying spot wallet endpoint...');
      
      const spotPath = '/spot/wallets';
      const spotQueryString = '';
      
      const { expiry: spotExpiry, signature: spotSignature } = await sign(spotPath, spotQueryString, '');
      
      const spotApiUrl = `https://api.phemex.com${spotPath}`;
      console.log(`Trying spot wallet URL: ${spotApiUrl}`);
      
      const spotResponse = await fetch(spotApiUrl, {
        method: 'GET',
        headers: {
          'x-phemex-access-token': apiKey,
          'x-phemex-request-signature': spotSignature,
          'x-phemex-request-expiry': spotExpiry.toString(),
          'Content-Type': 'application/json',
        },
      });

      const spotResponseText = await spotResponse.text();
      console.log(`Spot Response Status: ${spotResponse.status}`);
      console.log(`Spot Response Body:`, spotResponseText);

      if (!spotResponse.ok) {
        console.log('Both endpoints failed, returning basic account info...');
        
        // Return basic account info with zero balance
        const account = {
          accountID: 0,
          currency: 'USDT',
          totalEquity: 0,
          availableBalance: 0,
          unrealisedPnl: 0
        };

        console.log('Returning zero balance account:', JSON.stringify(account, null, 2));
        
        return new Response(
          JSON.stringify({ data: { account } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }

      // Process spot wallet response
      let spotData;
      try {
        spotData = JSON.parse(spotResponseText);
      } catch (e) {
        console.error(`Failed to parse spot JSON:`, spotResponseText);
        throw new Error('Invalid JSON response from spot wallet');
      }

      if (spotData.code !== 0) {
        console.error(`Phemex spot API error ${spotData.code}:`, spotData);
        throw new Error(`Phemex spot API error ${spotData.code}: ${spotData.msg}`);
      }

      console.log(`Spot Success:`, JSON.stringify(spotData, null, 2));

      // Extract account information from spot wallet response
      let account = {
        accountID: 0,
        currency: 'USDT',
        totalEquity: 0,
        availableBalance: 0,
        unrealisedPnl: 0
      };

      if (spotData.data && Array.isArray(spotData.data)) {
        // Calculate total portfolio value from all currencies
        let totalEquityUSD = 0;
        let availableBalanceUSD = 0;
        
        spotData.data.forEach((wallet: any) => {
          if (wallet.balanceEv && parseInt(wallet.balanceEv) > 0) {
            console.log(`Found ${wallet.currency} wallet with balance:`, wallet.balanceEv);
            
            // Convert from Phemex's scaled format (8 decimal places)
            const scaleFactor = 100000000;
            const balance = parseInt(wallet.balanceEv) / scaleFactor;
            const locked = parseInt(wallet.lockedTradingBalanceEv || '0') / scaleFactor;
            
            // Get USD price estimate for this currency
            const usdPrice = cryptoPriceEstimates[wallet.currency] || 0;
            const balanceUSD = (balance + locked) * usdPrice;
            const availableUSD = balance * usdPrice;
            
            console.log(`${wallet.currency}: ${balance + locked} tokens = $${balanceUSD.toFixed(2)} USD (price: $${usdPrice})`);
            
            totalEquityUSD += balanceUSD;
            availableBalanceUSD += availableUSD;
          }
        });
        
        account = {
          accountID: 0,
          currency: 'USDT',
          totalEquity: Math.round(totalEquityUSD * 100) / 100,
          availableBalance: Math.round(availableBalanceUSD * 100) / 100,
          unrealisedPnl: 0
        };
      }

      console.log('Final Spot Account Object:', JSON.stringify(account, null, 2));
      
      return new Response(
        JSON.stringify({ data: { account } }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
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
      currency: 'USDT',
      totalEquity: 0,
      availableBalance: 0,
      unrealisedPnl: 0
    };

    // Try to extract balance from accounts array
    if (data.data && data.data.accounts && Array.isArray(data.data.accounts)) {
      const usdtAccount = data.data.accounts.find((acc: any) => acc.currency === 'USDT' || acc.currency === 'USD');
      
      if (usdtAccount) {
        console.log('Found USDT account:', JSON.stringify(usdtAccount, null, 2));
        
        // Handle different balance field names and scaling
        const totalBalance = usdtAccount.totalBalance || usdtAccount.balance || 0;
        const availableBalance = usdtAccount.availableBalance || usdtAccount.available || 0;
        const unrealisedPnl = usdtAccount.unrealizedPnl || usdtAccount.unrealisedPnl || 0;
        
        // Convert from Phemex's integer format (scale factor 1000000 for USDT)
        account = {
          accountID: usdtAccount.accountId || usdtAccount.id || 0,
          currency: usdtAccount.currency || 'USDT',
          totalEquity: totalBalance / 1000000,
          availableBalance: availableBalance / 1000000,
          unrealisedPnl: unrealisedPnl / 1000000
        };
      }
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
