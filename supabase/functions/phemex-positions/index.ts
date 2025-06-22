
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
    
    // Correct USD-M Perpetual signature format: path + queryString + expiry
    const message = path + queryString + expiry.toString();
    
    console.log('USD-M Positions API Call Details:');
    console.log('- Path:', path);
    console.log('- Query String:', queryString);
    console.log('- Timestamp:', timestamp);
    console.log('- Expiry:', expiry);
    console.log('- Signature Message:', message);
    console.log('- API Key (first 10 chars):', apiKey.substring(0, 10));
    
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

    console.log('- Generated Signature:', signatureHex);

    const apiUrl = `https://api.phemex.com${path}${queryString}`;
    console.log('- Making request to:', apiUrl);

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
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('Response Body:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Parsed Response:', JSON.stringify(data, null, 2));

    // Extract positions from USD-M Perpetual response
    let positions = [];
    if (data.data && data.data.positions) {
      positions = data.data.positions
        .filter((pos: any) => (pos.sizeEv || 0) !== 0) // Only non-zero positions
        .map((pos: any) => ({
          symbol: pos.symbol,
          side: pos.side,
          size: Math.abs((pos.sizeEv || 0) / 100000000), // Convert from Ev and get absolute size
          value: Math.abs((pos.valueEv || 0) / 100000000),
          entryPrice: (pos.avgEntryPriceEv || 0) / 100000000,
          markPrice: (pos.markPriceEv || 0) / 100000000,
          unrealisedPnl: (pos.unrealisedPnlEv || 0) / 100000000,
          unrealisedPnlPcnt: pos.unrealisedPnlPcnt || 0
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
