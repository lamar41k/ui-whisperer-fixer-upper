
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
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
    const path = '/g-accounts/accountPositions';
    const queryString = '?currency=USDT'; // Changed to USDT for USD-S perps
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Generate signature according to Phemex documentation
    // For GET requests: path + queryString + expiry
    const message = path + queryString + expiry;
    console.log('Signature message:', message);
    console.log('Timestamp:', timestamp);
    console.log('Expiry:', expiry);
    
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

    console.log('Making request to Phemex API with expiry:', expiry);
    console.log('Generated signature:', signatureHex);

    const response = await fetch(`https://api.phemex.com${path}${queryString}`, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureHex,
        'x-phemex-request-expiry': expiry.toString(),
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log('Phemex API response status:', response.status);
    console.log('Phemex API response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    // Extract account information from the response
    let account = null;
    if (data.data && data.data.account) {
      account = data.data.account;
    } else if (data.data && data.data.positions && data.data.positions.length > 0) {
      // If no account field, try to extract from positions data
      const firstPosition = data.data.positions[0];
      account = {
        accountID: firstPosition.accountId || 0,
        currency: 'USDT',
        totalEquity: firstPosition.accountBalance || 0,
        availableBalance: firstPosition.availableBalance || 0,
        unrealisedPnl: firstPosition.unrealisedPnl || 0
      };
    }
    
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
