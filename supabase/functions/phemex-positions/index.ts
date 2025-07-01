
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

// Build the signature per Phemex spec
async function sign(path: string, queryString = '', body = '') {
  const apiSecret = Deno.env.get('PHEMEX_API_SECRET');
  if (!apiSecret) {
    throw new Error('PHEMEX_API_SECRET not configured');
  }

  const expiry = getExpiry();
  const signatureQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  const payload = path + signatureQuery + expiry + body;
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

    console.log('Fetching Phemex positions...');

    // Try USDT futures positions first
    const pathUsdt = '/g-accounts/accountPositions';
    const queryStringEmpty = '';
    
    console.log(`Making request to USDT futures: ${pathUsdt}`);
    
    const { expiry: expiryUsdt, signature: signatureUsdt } = await sign(pathUsdt, queryStringEmpty, '');
    
    const apiUrlUsdt = `https://api.phemex.com${pathUsdt}`;
    
    const responseUsdt = await fetch(apiUrlUsdt, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureUsdt,
        'x-phemex-request-expiry': expiryUsdt.toString(),
        'Content-Type': 'application/json',
      },
    });

    const responseTextUsdt = await responseUsdt.text();
    console.log(`USDT Response Status: ${responseUsdt.status}`);
    console.log(`USDT Response Body:`, responseTextUsdt);

    if (responseUsdt.ok) {
      let dataUsdt;
      try {
        dataUsdt = JSON.parse(responseTextUsdt);
      } catch (e) {
        console.error(`Failed to parse USDT JSON:`, responseTextUsdt);
      }

      if (dataUsdt && dataUsdt.code === 0) {
        console.log(`USDT Success:`, JSON.stringify(dataUsdt, null, 2));
        
        // Process USDT positions
        let positions = [];
        if (dataUsdt.data && dataUsdt.data.positions && Array.isArray(dataUsdt.data.positions)) {
          positions = dataUsdt.data.positions
            .filter((pos: any) => pos.size && Math.abs(parseFloat(pos.size)) > 0)
            .map((pos: any) => {
              // USDT positions use Ev suffix with 8 decimal places
              const scaleFactor = 100000000;
              const priceScale = 10000; // USDT pairs typically use 4 decimal places for price
              
              return {
                symbol: pos.symbol,
                side: pos.side || (parseFloat(pos.size) > 0 ? 'Buy' : 'Sell'),
                size: Math.abs(parseFloat(pos.size || '0')),
                value: parseInt(pos.valueEv || '0') / scaleFactor,
                entryPrice: parseInt(pos.avgEntryPriceEp || '0') / priceScale,
                markPrice: parseInt(pos.markPriceEp || '0') / priceScale,
                unrealisedPnl: parseInt(pos.unrealisedPnlEv || '0') / scaleFactor,
                unrealisedPnlPcnt: parseFloat(pos.unrealisedPnlRr || '0') * 100,
                leverage: parseFloat(pos.leverageRr || '1')
              };
            });
        }

        if (positions.length > 0) {
          console.log('Final USDT Positions:', JSON.stringify(positions, null, 2));
          
          return new Response(
            JSON.stringify({ data: { positions } }),
            { 
              headers: { 
                ...corsHeaders, 
                'Content-Type': 'application/json' 
              } 
            }
          );
        }
      }
    }

    // Try coin-margined futures if USDT fails or has no positions
    console.log('Trying coin-margined futures...');
    const pathCoin = '/accounts/accountPositions';
    
    const { expiry: expiryCoin, signature: signatureCoin } = await sign(pathCoin, queryStringEmpty, '');
    
    const apiUrlCoin = `https://api.phemex.com${pathCoin}`;
    
    const responseCoin = await fetch(apiUrlCoin, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureCoin,
        'x-phemex-request-expiry': expiryCoin.toString(),
        'Content-Type': 'application/json',
      },
    });

    const responseTextCoin = await responseCoin.text();
    console.log(`Coin Response Status: ${responseCoin.status}`);
    console.log(`Coin Response Body:`, responseTextCoin);

    if (responseCoin.ok) {
      let dataCoin;
      try {
        dataCoin = JSON.parse(responseTextCoin);
      } catch (e) {
        console.error(`Failed to parse coin JSON:`, responseTextCoin);
      }

      if (dataCoin && dataCoin.code === 0) {
        console.log(`Coin Success:`, JSON.stringify(dataCoin, null, 2));
        
        // Process coin-margined positions
        let positions = [];
        if (dataCoin.data && dataCoin.data.positions && Array.isArray(dataCoin.data.positions)) {
          positions = dataCoin.data.positions
            .filter((pos: any) => pos.size && Math.abs(parseFloat(pos.size)) > 0)
            .map((pos: any) => {
              // Coin-margined contracts use different scaling
              const priceScale = 10000; // 4 decimal places for price
              const valueScale = pos.currency === 'USD' ? 10000 : 100000000;
              
              return {
                symbol: pos.symbol,
                side: pos.side || (parseFloat(pos.size) > 0 ? 'Buy' : 'Sell'),
                size: Math.abs(parseFloat(pos.size || '0')),
                value: parseInt(pos.valueEv || pos.valueRv || '0') / valueScale,
                entryPrice: parseInt(pos.avgEntryPriceEp || pos.avgEntryPriceRp || '0') / priceScale,
                markPrice: parseInt(pos.markPriceEp || pos.markPriceRp || '0') / priceScale,
                unrealisedPnl: parseInt(pos.unrealisedPnlEv || pos.unrealisedPnlRv || '0') / valueScale,
                unrealisedPnlPcnt: parseFloat(pos.unrealisedPnlRr || '0') * 100,
                leverage: parseFloat(pos.leverageRr || '1')
              };
            });
        }

        console.log('Final Coin Positions:', JSON.stringify(positions, null, 2));
        
        return new Response(
          JSON.stringify({ data: { positions } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    // If all attempts fail, return empty positions
    console.log('No positions found on any endpoint');
    return new Response(
      JSON.stringify({ data: { positions: [] } }),
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
          message: 'Unable to fetch positions. Check API key permissions.',
          suggestion: 'Ensure your Phemex API key has futures trading permissions enabled.'
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
