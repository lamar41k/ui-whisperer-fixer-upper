
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
    
    // Try the account positions endpoint first
    const response = await client.getAccountPositions();
    const responseText = await response.text();
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Response Body:`, responseText);

    if (!response.ok) {
      // If this endpoint fails, try the spot wallet endpoint
      console.log('First endpoint failed, trying spot wallet endpoint...');
      
      const spotResponse = await client.getSpotWallets();
      const spotResponseText = await spotResponse.text();
      
      console.log(`Spot Response Status: ${spotResponse.status}`);
      console.log(`Spot Response Body:`, spotResponseText);

      if (!spotResponse.ok) {
        console.log('Both endpoints failed, returning basic account info...');
        
        // Return basic account info with zero balance
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

      // Process spot wallet response
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

      // Process spot wallets and calculate total value
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
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`Failed to parse JSON:`, responseText);
      throw new Error('Invalid JSON response');
    }

    // Check for Phemex API error code
    if (data.code !== 0) {
      console.error(`Phemex API error ${data.code}:`, data);
      throw new Error(`Phemex API error ${data.code}: ${data.msg}`);
    }

    console.log(`Success:`, JSON.stringify(data, null, 2));

    // Extract account information from response
    const account = processAccountPositions(data);
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
