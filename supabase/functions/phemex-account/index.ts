
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { PhemexApiClient } from './api-client.ts';
import { processSpotWallets, processAccountPositions } from './wallet-processor.ts';
import { PhemexAccount, PhemexSpotResponse } from './types.ts';

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

    console.log('Fetching Phemex account balance...');

    const client = new PhemexApiClient(apiKey);
    
    // Try USDT futures account first - this is where the main balance should be
    console.log('Trying USDT futures account...');
    const usdtResponse = await client.getUsdtFuturesAccount();
    const usdtResponseText = await usdtResponse.text();
    
    console.log(`USDT Futures Response Status: ${usdtResponse.status}`);
    console.log(`USDT Futures Response Body:`, usdtResponseText);

    if (usdtResponse.ok) {
      let usdtData;
      try {
        usdtData = JSON.parse(usdtResponseText);
      } catch (e) {
        console.error(`Failed to parse USDT futures JSON:`, usdtResponseText);
      }

      if (usdtData && usdtData.code === 0) {
        console.log(`USDT Futures Success:`, JSON.stringify(usdtData, null, 2));
        
        const account = processUsdtFuturesAccount(usdtData);
        console.log('Final USDT Futures Account Object:', JSON.stringify(account, null, 2));
        
        return new Response(
          JSON.stringify({ data: { account } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    // Try coin-margined futures if USDT futures fails
    console.log('USDT futures failed, trying coin-margined futures...');
    const coinResponse = await client.getCoinFuturesAccount();
    const coinResponseText = await coinResponse.text();
    
    console.log(`Coin Futures Response Status: ${coinResponse.status}`);
    console.log(`Coin Futures Response Body:`, coinResponseText);

    if (coinResponse.ok) {
      let coinData;
      try {
        coinData = JSON.parse(coinResponseText);
      } catch (e) {
        console.error(`Failed to parse coin futures JSON:`, coinResponseText);
      }

      if (coinData && coinData.code === 0) {
        console.log(`Coin Futures Success:`, JSON.stringify(coinData, null, 2));
        
        const account = processAccountPositions(coinData);
        console.log('Final Coin Futures Account Object:', JSON.stringify(account, null, 2));
        
        return new Response(
          JSON.stringify({ data: { account } }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    // Only fall back to spot wallets if both futures accounts fail completely
    console.log('Both futures endpoints failed, trying spot wallet endpoint...');
    
    const spotResponse = await client.getSpotWallets();
    const spotResponseText = await spotResponse.text();
    
    console.log(`Spot Response Status: ${spotResponse.status}`);
    console.log(`Spot Response Body:`, spotResponseText);

    if (!spotResponse.ok) {
      console.log('All endpoints failed, returning basic account info...');
      
      const account: PhemexAccount = {
        accountID: 0,
        currency: 'USDT',
        totalEquity: 0,
        availableBalance: 0,
        unrealisedPnl: 0
      };

      console.log('Returning zero balance account:', JSON.stringify(account, null, 2));
      
      return new Response(
        JSON.stringify({ data: { account } }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    let spotData: PhemexSpotResponse;
    try {
      spotData = JSON.parse(spotResponseText);
    } catch (e) {
      console.error(`Failed to parse spot JSON:`, spotResponseText);
      throw new Error('Invalid JSON response from spot wallet');
    }

    if (spotData.code !== 0) {
      console.error(`Phemex spot API error ${spotData.code}:`, spotData);
      throw new Error(`Phemex spot API error ${spotData.code}: ${spotData.msg}`);
    }

    console.log(`Spot Success:`, JSON.stringify(spotData, null, 2));

    const account = processSpotWallets(spotData.data);
    console.log('Final Spot Account Object:', JSON.stringify(account, null, 2));
    
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

// Process USDT futures account data with correct scaling
function processUsdtFuturesAccount(data: any): PhemexAccount {
  let account: PhemexAccount = {
    accountID: 0,
    currency: 'USDT',
    totalEquity: 0,
    availableBalance: 0,
    unrealisedPnl: 0
  };

  // Look for account data in the response
  if (data.data && data.data.account) {
    const acc = data.data.account;
    console.log('Found USDT futures account:', JSON.stringify(acc, null, 2));
    
    // USDT futures use 8 decimal places scaling (100000000)
    const scaleFactor = 100000000;
    
    account = {
      accountID: acc.accountId || acc.userID || 0,
      currency: 'USDT',
      totalEquity: (parseInt(acc.accountBalanceEv || '0') + parseInt(acc.totalUnrealisedPnlEv || '0')) / scaleFactor,
      availableBalance: parseInt(acc.accountBalanceEv || '0') / scaleFactor,
      unrealisedPnl: parseInt(acc.totalUnrealisedPnlEv || '0') / scaleFactor
    };
  } else if (data.data && Array.isArray(data.data.accounts)) {
    // Handle multiple accounts format - look for USDT account
    const usdtAccount = data.data.accounts.find((acc: any) => acc.currency === 'USDT');
    
    if (usdtAccount) {
      console.log('Found USDT account in accounts array:', JSON.stringify(usdtAccount, null, 2));
      
      const scaleFactor = 100000000; // USDT uses 8 decimal places
      
      account = {
        accountID: usdtAccount.accountId || usdtAccount.userID || 0,
        currency: 'USDT',
        totalEquity: (parseInt(usdtAccount.accountBalanceEv || '0') + parseInt(usdtAccount.totalUnrealisedPnlEv || '0')) / scaleFactor,
        availableBalance: parseInt(usdtAccount.accountBalanceEv || '0') / scaleFactor,
        unrealisedPnl: parseInt(usdtAccount.totalUnrealisedPnlEv || '0') / scaleFactor
      };
    }
  }

  return account;
}
