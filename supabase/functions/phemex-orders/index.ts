
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

    // For USD-M Perpetual orders
    const timestamp = Date.now();
    const path = '/g-orders/activeList';
    const queryString = '?currency=USDT';
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Generate signature according to Phemex USD-M Perpetual documentation
    // The message format should be: path + queryString + expiry (as string)
    const message = path + queryString + expiry.toString();
    console.log('USD-M Orders signature message:', message);
    console.log('USD-M Orders timestamp:', timestamp);
    console.log('USD-M Orders expiry:', expiry);
    console.log('USD-M Orders API Key (first 10 chars):', apiKey.substring(0, 10));
    
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
    console.log('Making request to Phemex USD-M Orders API:', apiUrl, 'with expiry:', expiry);
    console.log('USD-M Orders signature:', signatureHex);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureHex,
        'x-phemex-request-expiry': expiry.toString(),
      },
    });

    const responseText = await response.text();
    console.log('Phemex USD-M Orders API response status:', response.status);
    console.log('Phemex USD-M Orders API raw response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Phemex USD-M Orders API parsed data:', JSON.stringify(data, null, 2));

    // Extract orders from USD-M Perpetual response
    let orders = [];
    if (data.data && data.data.rows) {
      orders = data.data.rows.map((order: any) => ({
        orderID: order.orderID,
        symbol: order.symbol,
        side: order.side,
        ordType: order.ordType,
        price: (order.priceEv || 0) / 100000000, // Convert from Ev
        orderQty: (order.orderQtyEv || 0) / 100000000,
        cumQty: (order.cumQtyEv || 0) / 100000000,
        ordStatus: order.ordStatus,
        transactTime: order.transactTimeNs ? parseInt(order.transactTimeNs) / 1000000 : Date.now()
      }));
    }

    console.log('Final orders array:', JSON.stringify(orders, null, 2));
    
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
