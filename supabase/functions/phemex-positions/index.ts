
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

    console.log('Fetching Phemex positions...');

    // Try the positions endpoint with currency parameter first
    const path = '/g-accounts/accountPositions';
    const queryString = 'currency=USD';
    
    console.log(`Making request to: ${path}?${queryString}`);
    
    const { expiry, signature } = await sign(path, queryString, '');
    
    const apiUrl = `https://api.phemex.com${path}?${queryString}`;
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

    // If we get a 400 error about missing currency, try without it
    if (response.status === 400 && responseText.includes('currency')) {
      console.log('Currency parameter not supported, trying without it...');
      
      const pathNoQuery = '/g-accounts/accountPositions';
      const queryStringEmpty = '';
      
      const { expiry: expiry2, signature: signature2 } = await sign(pathNoQuery, queryStringEmpty, '');
      
      const apiUrl2 = `https://api.phemex.com${pathNoQuery}`;
      console.log(`Trying without currency - Full URL: ${apiUrl2}`);
      
      const response2 = await fetch(apiUrl2, {
        method: 'GET',
        headers: {
          'x-phemex-access-token': apiKey,
          'x-phemex-request-signature': signature2,
          'x-phemex-request-expiry': expiry2.toString(),
          'Content-Type': 'application/json',
        },
      });

      const responseText2 = await response2.text();
      console.log(`Second attempt - Response Status: ${response2.status}`);
      console.log(`Second attempt - Response Body:`, responseText2);

      if (!response2.ok) {
        console.error(`Second attempt failed: HTTP ${response2.status}`);
        // Return empty positions instead of throwing error
        console.log('No positions found or API not accessible, returning empty array');
        return new Response(
          JSON.stringify({ data: { positions: [] } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }

      // Process the second response
      let data2;
      try {
        data2 = JSON.parse(responseText2);
      } catch (e) {
        console.error(`Failed to parse JSON from second attempt:`, responseText2);
        return new Response(
          JSON.stringify({ data: { positions: [] } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }

      if (data2.code !== 0) {
        console.error(`Phemex API error ${data2.code}:`, data2);
        return new Response(
          JSON.stringify({ data: { positions: [] } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }

      // Process positions from second attempt
      let positions = [];
      if (data2.data && data2.data.positions && Array.isArray(data2.data.positions)) {
        positions = data2.data.positions
          .filter((pos: any) => pos.size && parseFloat(pos.size) !== 0)
          .map((pos: any) => ({
            symbol: pos.symbol,
            side: pos.side,
            size: parseFloat(pos.size || '0'),
            value: parseFloat(pos.value || '0'),
            entryPrice: parseFloat(pos.avgEntryPrice || pos.entryPrice || '0'),
            markPrice: parseFloat(pos.markPrice || '0'),
            unrealisedPnl: parseFloat(pos.unrealizedPnl || pos.unrealisedPnl || '0'),
            unrealisedPnlPcnt: parseFloat(pos.unrealizedPnlPcnt || pos.unrealisedPnlPcnt || '0')
          }));
      }

      console.log('Final Positions Array (second attempt):', JSON.stringify(positions, null, 2));
      
      return new Response(
        JSON.stringify({ data: { positions } }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    if (!response.ok) {
      console.error(`Failed: HTTP ${response.status}`);
      // Return empty positions instead of throwing error
      console.log('No positions found or API not accessible, returning empty array');
      return new Response(
        JSON.stringify({ data: { positions: [] } }),
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
      return new Response(
        JSON.stringify({ data: { positions: [] } }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Check for Phemex API error code
    if (data.code !== 0) {
      console.error(`Phemex API error ${data.code}:`, data);
      return new Response(
        JSON.stringify({ data: { positions: [] } }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log(`Success:`, JSON.stringify(data, null, 2));

    let positions = [];
    
    // Extract positions from response
    if (data.data && data.data.positions && Array.isArray(data.data.positions)) {
      positions = data.data.positions
        .filter((pos: any) => pos.size && parseFloat(pos.size) !== 0) // Only include positions with non-zero size
        .map((pos: any) => ({
          symbol: pos.symbol,
          side: pos.side,
          size: parseFloat(pos.size || '0'),
          value: parseFloat(pos.value || '0'),
          entryPrice: parseFloat(pos.avgEntryPrice || pos.entryPrice || '0'),
          markPrice: parseFloat(pos.markPrice || '0'),
          unrealisedPnl: parseFloat(pos.unrealizedPnl || pos.unrealisedPnl || '0'),
          unrealisedPnlPcnt: parseFloat(pos.unrealizedPnlPcnt || pos.unrealisedPnlPcnt || '0')
        }));
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
          message: 'Unable to fetch positions. Check API key permissions.',
          suggestion: 'Ensure your Phemex API key has the required permissions enabled.'
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
