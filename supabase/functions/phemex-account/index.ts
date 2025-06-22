
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
    // Use correct USD-M Perpetual wallet endpoint
    const path = '/g-accounts/walletList';
    const queryString = '?currency=USDT';
    const expiry = timestamp + 60000; // 1 minute expiry
    
    // Correct USD-M Perpetual signature format: path + queryString + expiry
    const message = path + queryString + expiry.toString();
    
    console.log('USD-M Account API Call Details:');
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

    // Extract account information from wallet response
    let account = {
      accountID: 0,
      currency: 'USDT',
      totalEquity: 0,
      availableBalance: 0,
      unrealisedPnl: 0
    };

    if (data.data && data.data.wallets && data.data.wallets.length > 0) {
      // Find USDT wallet
      const usdtWallet = data.data.wallets.find((wallet: any) => wallet.currency === 'USDT');
      if (usdtWallet) {
        account = {
          accountID: data.data.accountId || 0,
          currency: 'USDT',
          totalEquity: (usdtWallet.totalBalanceEv || 0) / 100000000,
          availableBalance: (usdtWallet.availableBalanceEv || 0) / 100000000,
          unrealisedPnl: (usdtWallet.totalUnrealisedPnlEv || 0) / 100000000
        };
      }
    }

    console.log('Final Account Object:', JSON.stringify(account, null, 2));
    
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
