
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const requestBody = await req.json();
    const { symbol, side, orderQty, price } = requestBody;

    const params = {
      symbol,
      side,
      orderQty,
      ordType: price ? 'Limit' : 'Market',
      ...(price && { priceEp: Math.round(price * 10000) })
    };

    const timestamp = Date.now();
    const path = '/orders';
    const queryString = '';
    const body = JSON.stringify(params);
    
    // Generate signature according to Phemex documentation
    const message = path + queryString + timestamp + body;
    console.log('Signature message:', message);
    console.log('Order params:', params);
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const messageData = encoder.encode(message);
    
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

    console.log('Making order request to Phemex API with timestamp:', timestamp);

    const response = await fetch('https://api.phemex.com/orders', {
      method: 'POST',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureHex,
        'x-phemex-request-timestamp': timestamp.toString(),
        'Content-Type': 'application/json',
      },
      body: body
    });

    const responseText = await response.text();
    console.log('Phemex place order API response status:', response.status);
    console.log('Phemex place order API response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    return new Response(
      JSON.stringify(data),
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
