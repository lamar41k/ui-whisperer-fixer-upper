
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

    const timestamp = Date.now();
    // Use USD-M Perpetual positions endpoint
    const path = '/accounts/accountPositions';
    const queryString = '?currency=USD';
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Generate signature according to Phemex documentation
    const message = path + queryString + expiry;
    console.log('USD-M Positions signature message:', message);
    console.log('USD-M Positions timestamp:', timestamp);
    console.log('USD-M Positions expiry:', expiry);
    console.log('USD-M Positions API Key (first 10 chars):', apiKey.substring(0, 10));
    
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

    console.log('Making request to Phemex USD-M Positions API with expiry:', expiry);
    console.log('USD-M Positions signature:', signatureHex);

    const response = await fetch(`https://api.phemex.com${path}${queryString}`, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureHex,
        'x-phemex-request-expiry': expiry.toString(),
      },
    });

    const responseText = await response.text();
    console.log('Phemex USD-M Positions API response status:', response.status);
    console.log('Phemex USD-M Positions API response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    return new Response(
      JSON.stringify({ data: { positions: data.data?.positions || [] } }),
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
