
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

    console.log('Fetching Phemex orders...');

    // Use perpetual orders endpoint
    const path = '/g-orders/activeList';
    const queryString = '?currency=USDT';
    const body = '';
    
    console.log('Phemex Orders API Call Details:');
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

    // Extract orders from perpetual orders response
    let orders = [];
    if (data.data && data.data.rows) {
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
