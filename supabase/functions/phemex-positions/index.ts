
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

    console.log('Trying to fetch Phemex positions...');

    // Try multiple endpoints to find which one works with the current API key
    const endpoints = [
      { path: '/g-accounts/accountPositions', query: '?currency=USDT', type: 'perpetual' },
      { path: '/accounts/accountPositions', query: '?currency=USDT', type: 'futures' },
      { path: '/api-data/futures/funding-fees', query: '', type: 'funding' }
    ];

    let positions = [];
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint.path}${endpoint.query}`);
        
        const { expiry, signature } = await sign(endpoint.path, endpoint.query, '');
        
        const apiUrl = `https://api.phemex.com${endpoint.path}${endpoint.query}`;
        console.log(`Making request to: ${apiUrl}`);
        
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
        console.log(`Response Status for ${endpoint.path}: ${response.status}`);
        console.log(`Response Body for ${endpoint.path}:`, responseText);

        if (!response.ok) {
          console.log(`Failed ${endpoint.path}: HTTP ${response.status}`);
          lastError = `HTTP ${response.status}: ${responseText}`;
          continue;
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.log(`Failed to parse JSON for ${endpoint.path}:`, responseText);
          lastError = 'Invalid JSON response';
          continue;
        }

        // Check for Phemex API error code
        if (data.code !== 0) {
          console.log(`Phemex API error ${data.code} for ${endpoint.path}:`, data);
          lastError = `Phemex API error ${data.code}: ${data.msg}`;
          continue;
        }

        // Successfully got data from this endpoint
        console.log(`Success with endpoint ${endpoint.path}:`, JSON.stringify(data, null, 2));

        // Extract positions based on endpoint type
        if (endpoint.type === 'perpetual' || endpoint.type === 'futures') {
          if (data.data && data.data.positions) {
            positions = data.data.positions
              .filter((pos: any) => parseFloat(pos.size || '0') !== 0)
              .map((pos: any) => ({
                symbol: pos.symbol,
                side: parseFloat(pos.size || '0') > 0 ? 'Buy' : 'Sell',
                size: Math.abs(parseFloat(pos.size || '0')),
                value: Math.abs(parseFloat(pos.value || '0')),
                entryPrice: parseFloat(pos.avgEntryPrice || '0'),
                markPrice: parseFloat(pos.markPrice || '0'),
                unrealisedPnl: parseFloat(pos.unrealisedPnl || '0'),
                unrealisedPnlPcnt: parseFloat(pos.unrealisedPnlPcnt || '0')
              }));
          }
        }

        // If we got here, we found a working endpoint
        break;

      } catch (error) {
        console.log(`Error with endpoint ${endpoint.path}:`, error);
        lastError = error.message;
      }
    }

    // If no endpoints worked, return helpful error message
    if (positions.length === 0 && lastError) {
      console.log('All position endpoints failed, returning fallback response');
      return new Response(
        JSON.stringify({ 
          data: { positions: [] },
          info: {
            message: 'No positions found. This may be because your API key only has spot trading permissions, not perpetual/futures permissions.',
            lastError: lastError,
            suggestion: 'Check your Phemex API key permissions in your account settings.'
          }
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log('Final Positions Array:', JSON.stringify(positions, null, 2));
    
    return new Response(
      JSON.stringify({ data: { positions } }),
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
      JSON.stringify({ 
        error: error.message,
        info: {
          message: 'Unable to fetch positions. This may be due to API key permissions.',
          suggestion: 'Ensure your Phemex API key has the necessary permissions for the endpoints you are trying to access.'
        }
      }),
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
