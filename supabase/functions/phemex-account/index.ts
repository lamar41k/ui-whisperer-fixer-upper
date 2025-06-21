
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
    // Use correct USD-M Perpetual account endpoint
    const path = '/g-accounts/accountPositions';
    const queryString = '?currency=USDT';
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Generate signature according to Phemex USD-M Perpetual documentation
    // The message format should be: path + queryString + expiry (as string)
    const message = path + queryString + expiry.toString();
    console.log('USD-M Account signature message:', message);
    console.log('USD-M Account timestamp:', timestamp);
    console.log('USD-M Account expiry:', expiry);
    console.log('USD-M Account API Key (first 10 chars):', apiKey.substring(0, 10));
    
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

    console.log('Making request to Phemex USD-M Account API with expiry:', expiry);
    console.log('USD-M Account signature:', signatureHex);

    const response = await fetch(`https://api.phemex.com${path}${queryString}`, {
      method: 'GET',
      headers: {
        'x-phemex-access-token': apiKey,
        'x-phemex-request-signature': signatureHex,
        'x-phemex-request-expiry': expiry.toString(),
      },
    });

    const responseText = await response.text();
    console.log('Phemex USD-M Account API response status:', response.status);
    console.log('Phemex USD-M Account API raw response:', responseText);

    if (!response.ok) {
      throw new Error(`Phemex API error: ${response.status} ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Phemex USD-M Account API parsed data:', JSON.stringify(data, null, 2));
    
    // Extract account information from USD-M Perpetual response
    let account = null;
    if (data.data && data.data.account) {
      // Direct account data
      const accountData = data.data.account;
      account = {
        accountID: accountData.accountId || 0,
        currency: 'USDT',
        totalEquity: (accountData.totalEquityEv || 0) / 100000000, // Convert from Ev to USDT
        availableBalance: (accountData.availableBalanceEv || 0) / 100000000,
        unrealisedPnl: (accountData.totalUnrealisedPnlEv || 0) / 100000000
      };
    } else if (data.data && data.data.positions && data.data.positions.length > 0) {
      // Extract from positions if account field not available
      const positions = data.data.positions;
      const totalEquity = positions.reduce((sum: number, pos: any) => sum + (pos.accountBalanceEv || 0), 0) / 100000000;
      const unrealisedPnl = positions.reduce((sum: number, pos: any) => sum + (pos.unrealisedPnlEv || 0), 0) / 100000000;
      
      account = {
        accountID: positions[0]?.accountId || 0,
        currency: 'USDT',
        totalEquity: totalEquity,
        availableBalance: totalEquity - unrealisedPnl,
        unrealisedPnl: unrealisedPnl
      };
    } else if (data.data && data.data.accounts && data.data.accounts.length > 0) {
      // Check for accounts array
      const accountData = data.data.accounts[0];
      account = {
        accountID: accountData.accountId || 0,
        currency: 'USDT',
        totalEquity: (accountData.totalEquityEv || 0) / 100000000,
        availableBalance: (accountData.availableBalanceEv || 0) / 100000000,
        unrealisedPnl: (accountData.totalUnrealisedPnlEv || 0) / 100000000
      };
    } else {
      // Create a default account structure if no data is available
      console.log('No account data found, creating default structure');
      account = {
        accountID: 0,
        currency: 'USDT',
        totalEquity: 0,
        availableBalance: 0,
        unrealisedPnl: 0
      };
    }

    console.log('Final account object:', JSON.stringify(account, null, 2));
    
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
