
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

    console.log('Trying to fetch Phemex orders...');

    // Try multiple endpoints to find which one works with the current API key
    const endpoints = [
      { path: '/g-orders/activeList', query: '?currency=USDT', type: 'perpetual' },
      { path: '/orders/activeList', query: '?currency=USDT', type: 'futures' },
      { path: '/spot/orders/active', query: '', type: 'spot' }
    ];

    let orders = [];
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

        // Extract orders based on endpoint type and response structure
        if (data.data) {
          if (data.data.rows) {
            // Perpetual/futures format
            orders = data.data.rows.map((order: any) => ({
              orderID: order.orderID || order.clOrdID,
              symbol: order.symbol,
              side: order.side,
              ordType: order.ordType || order.orderType,
              price: parseFloat(order.priceEp ? (order.priceEp / 100000000).toString() : order.price || '0'),
              orderQty: parseFloat(order.orderQtyEq ? (order.orderQtyEq / 100000000).toString() : order.orderQty || '0'),
              cumQty: parseFloat(order.cumQtyEq ? (order.cumQtyEq / 100000000).toString() : order.cumQty || '0'),
              ordStatus: order.ordStatus || order.orderStatus,
              transactTime: order.transactTimeNs ? Math.floor(parseInt(order.transactTimeNs) / 1000000) : Date.now()
            }));
          } else if (Array.isArray(data.data)) {
            // Spot format
            orders = data.data.map((order: any) => ({
              orderID: order.orderID || order.id,
              symbol: order.symbol,
              side: order.side,
              ordType: order.type || order.ordType,
              price: parseFloat(order.price || '0'),
              orderQty: parseFloat(order.origQty || order.quantity || '0'),
              cumQty: parseFloat(order.executedQty || order.cumQty || '0'),
              ordStatus: order.status || order.ordStatus,
              transactTime: order.time || order.transactTime || Date.now()
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
    if (orders.length === 0 && lastError) {
      console.log('All order endpoints failed, returning fallback response');
      return new Response(
        JSON.stringify({ 
          data: { rows: [] },
          info: {
            message: 'No orders found. This may be because your API key only has spot trading permissions, not perpetual/futures permissions.',
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

    console.log('Final Orders Array:', JSON.stringify(orders, null, 2));
    
    return new Response(
      JSON.stringify({ data: { rows: orders } }),
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
          message: 'Unable to fetch orders. This may be due to API key permissions.',
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
