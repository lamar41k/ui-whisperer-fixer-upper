
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a UNIX timestamp ~1 min in the future
function getExpiry() {
  return Math.floor(Date.now() / 1000) + 60;
}

// Build the signature per Phemex spec: HMAC_SHA256(path + query + expiry + body)
async function sign(path: string, queryString = '', body = '') {
  const apiSecret = Deno.env.get('PHEMEX_API_SECRET');
  if (!apiSecret) {
    throw new Error('PHEMEX_API_SECRET not configured');
  }

  const expiry = getExpiry();
  const payload = path + queryString + expiry + body;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(apiSecret);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return { expiry, signature: signatureHex };
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
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Parsed Response:', JSON.stringify(data, null, 2));

    // Check for Phemex API error code
    if (data.code !== 0) {
      throw new Error(`Phemex API error ${data.code}: ${data.msg}`);
    }

    // Extract orders from USD-M Perpetual response
    let orders = [];
    if (data.data && data.data.rows) {
      orders = data.data.rows.map((order: any) => ({
        orderID: order.orderID,
        symbol: order.symbol,
        side: order.side,
        ordType: order.ordType,
        price: parseFloat(order.price || '0'),
        orderQty: parseFloat(order.orderQty || '0'),
        cumQty: parseFloat(order.cumQty || '0'),
        ordStatus: order.ordStatus,
        transactTime: order.transactTime ? parseInt(order.transactTime) : Date.now()
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
