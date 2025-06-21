
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
    // Use correct USD-M Perpetual positions endpoint
    const path = '/g-accounts/accountPositions';
    const queryString = '?currency=USDT';
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Generate signature according to Phemex USD-M Perpetual documentation
    // For USD-M Perpetual: method + path + queryString + expiry + body
    const method = 'GET';
    const body = '';
    const message = method + path + queryString + expiry.toString() + body;
    console.log('USD-M Positions signature message:', message);
    console.log('USD-M Positions method:', method);
    console.log('USD-M Positions path:', path);
    console.log('USD-M Positions queryString:', queryString);
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
    console.log('Phemex USD-M Positions API raw response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Phemex USD-M Positions API parsed data:', JSON.stringify(data, null, 2));

    // Extract positions from USD-M Perpetual response
    let positions = [];
    if (data.data && data.data.positions) {
      positions = data.data.positions.map((pos: any) => ({
        symbol: pos.symbol,
        side: pos.side,
        size: (pos.sizeEv || 0) / 100000000, // Convert from Ev
        value: (pos.valueEv || 0) / 100000000,
        entryPrice: (pos.avgEntryPriceEv || 0) / 100000000,
        markPrice: (pos.markPriceEv || 0) / 100000000,
        unrealisedPnl: (pos.unrealisedPnlEv || 0) / 100000000,
        unrealisedPnlPcnt: pos.unrealisedPnlPcnt || 0
      }));
    }

    console.log('Final positions array:', JSON.stringify(positions, null, 2));
    
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
