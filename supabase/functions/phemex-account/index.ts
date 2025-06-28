
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

    console.log('Fetching Phemex futures account balance...');

    // Use the correct futures account endpoint
    const path = '/api/v1/accounts';
    const queryString = '?currency=USDT&accountType=SWAP';
    
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

    // Extract futures account information from response
    let account = {
      accountID: 0,
      currency: 'USDT',
      totalEquity: 0,
      availableBalance: 0,
      unrealisedPnl: 0
    };

    if (data.data && data.data.length > 0) {
      // Find the SWAP account in the response
      const swapAccount = data.data.find((acc: any) => acc.accountType === 'SWAP');
      
      if (swapAccount) {
        console.log('Found SWAP account:', JSON.stringify(swapAccount, null, 2));
        
        // Convert from Phemex's integer format to decimal (USDT uses 1000000 scale factor)
        const totalEquity = (swapAccount.totalBalance || 0) / 1000000;
        const availableBalance = (swapAccount.availableBalance || 0) / 1000000;
        const unrealisedPnl = (swapAccount.unrealisedPnl || 0) / 1000000;
        
        account = {
          accountID: swapAccount.accountId || 0,
          currency: swapAccount.currency || 'USDT',
          totalEquity: totalEquity,
          availableBalance: availableBalance,
          unrealisedPnl: unrealisedPnl
        };
        
        console.log('Converted account balance:', {
          totalEquity: `${totalEquity} USDT (raw: ${swapAccount.totalBalance})`,
          availableBalance: `${availableBalance} USDT (raw: ${swapAccount.availableBalance})`,
          unrealisedPnl: `${unrealisedPnl} USDT (raw: ${swapAccount.unrealisedPnl})`
        });
      } else {
        console.log('No SWAP account found in response. Available accounts:', 
          data.data.map((acc: any) => ({ accountType: acc.accountType, currency: acc.currency }))
        );
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
