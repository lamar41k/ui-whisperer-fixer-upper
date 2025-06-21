
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

    const url = new URL(req.url);
    const symbol = url.searchParams.get('symbol');
    const queryString = symbol ? `?symbol=${symbol}` : '';

    const timestamp = Date.now();
    const path = '/orders/activeList';
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Generate signature according to Phemex documentation
    const message = path + queryString + expiry;
    console.log('Orders signature message:', message);
    console.log('Orders timestamp:', timestamp);
    console.log('Orders expiry:', expiry);
    
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

    const apiUrl = `https://api.phemex.com${path}${queryString}`;
    console.log('Making request to Phemex orders API:', apiUrl, 'with expiry:', expiry);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureHex,
        'x-phemex-request-expiry': expiry.toString(),
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Phemex orders API response status:', response.status);
    console.log('Phemex orders API response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    return new Response(
      JSON.stringify({ data: { rows: data.data?.rows || [] } }),
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
