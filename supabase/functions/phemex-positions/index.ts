
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

    console.log('Fetching Phemex futures positions...');

    // Use correct futures positions endpoint
    const path = '/accounts/positions';
    const queryString = '?currency=USD';
    
    console.log(`Making request to: ${path}${queryString}`);
    
    const { expiry, signature } = await sign(path, queryString, '');
    
    const apiUrl = `https://api.phemex.com${path}${queryString}`;
    console.log(`Full URL: ${apiUrl}`);
    
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

    let positions = [];
    
    // Extract positions from futures response
    if (data.data && data.data.positions && Array.isArray(data.data.positions)) {
      positions = data.data.positions
        .filter((pos: any) => parseFloat(pos.sizeEv || '0') !== 0) // Only active positions
        .map((pos: any) => {
          const sizeEv = parseFloat(pos.sizeEv || '0');
          const valueEv = parseFloat(pos.valueEv || '0');
          const avgEntryPriceEv = parseFloat(pos.avgEntryPriceEv || '0');
          const markPriceEv = parseFloat(pos.markPriceEv || '0');
          const unrealisedPnlEv = parseFloat(pos.unrealisedPnlEv || '0');
          
          return {
            symbol: pos.symbol,
            side: sizeEv > 0 ? 'Buy' : 'Sell',
            size: Math.abs(sizeEv / 1e8), // Convert from Ev scale
            value: Math.abs(valueEv / 1e8),
            entryPrice: avgEntryPriceEv / 1e8,
            markPrice: markPriceEv / 1e8,
            unrealisedPnl: unrealisedPnlEv / 1e8,
            unrealisedPnlPcnt: parseFloat(pos.unrealisedPnlPcnt || '0') / 1e6 // Percentage in basis points
          };
        });
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
          message: 'Unable to fetch futures positions. Check API key permissions.',
          suggestion: 'Ensure your Phemex API key has futures trading permissions enabled.'
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
