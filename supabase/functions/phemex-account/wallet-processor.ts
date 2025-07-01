
import { cryptoPriceEstimates } from './crypto-prices.ts';
import { PhemexAccount, PhemexWallet } from './types.ts';

export function processSpotWallets(wallets: PhemexWallet[]): PhemexAccount {
  let totalEquityUSD = 0;
  let availableBalanceUSD = 0;
  
  console.log('Processing wallets...');
  
  wallets.forEach((wallet) => {
    const balanceEvInt = parseInt(wallet.balanceEv || '0');
    const lockedEvInt = parseInt(wallet.lockedTradingBalanceEv || '0');
    
    if (balanceEvInt > 0 || lockedEvInt > 0) {
      console.log(`Processing ${wallet.currency} wallet: balanceEv=${wallet.balanceEv}, lockedEv=${wallet.lockedTradingBalanceEv}`);
      
      // Convert from Phemex's scaled format (8 decimal places)
      const scaleFactor = 100000000;
      const balance = balanceEvInt / scaleFactor;
      const locked = lockedEvInt / scaleFactor;
      const totalBalance = balance + locked;
      
      // Get USD price estimate for this currency
      const usdPrice = cryptoPriceEstimates[wallet.currency] || 0;
      const balanceUSD = totalBalance * usdPrice;
      const availableUSD = balance * usdPrice;
      
      console.log(`${wallet.currency}: ${totalBalance.toFixed(8)} tokens * $${usdPrice} = $${balanceUSD.toFixed(2)} USD`);
      
      totalEquityUSD += balanceUSD;
      availableBalanceUSD += availableUSD;
    }
  });
  
  console.log(`Total calculated USD value: $${totalEquityUSD.toFixed(2)}`);
  
  return {
    accountID: 0,
    currency: 'USDT',
    totalEquity: Math.round(totalEquityUSD * 100) / 100,
    availableBalance: Math.round(availableBalanceUSD * 100) / 100,
    unrealisedPnl: 0
  };
}

export function processAccountPositions(data: any): PhemexAccount {
  let account: PhemexAccount = {
    accountID: 0,
    currency: 'USDT',
    totalEquity: 0,
    availableBalance: 0,
    unrealisedPnl: 0
  };

  // Try to extract balance from accounts array
  if (data.data && data.data.accounts && Array.isArray(data.data.accounts)) {
    const usdtAccount = data.data.accounts.find((acc: any) => acc.currency === 'USDT' || acc.currency === 'USD');
    
    if (usdtAccount) {
      console.log('Found USDT account:', JSON.stringify(usdtAccount, null, 2));
      
      // Handle different balance field names and scaling
      const totalBalance = usdtAccount.totalBalance || usdtAccount.balance || 0;
      const availableBalance = usdtAccount.availableBalance || usdtAccount.available || 0;
      const unrealisedPnl = usdtAccount.unrealizedPnl || usdtAccount.unrealisedPnl || 0;
      
      // Convert from Phemex's integer format (scale factor 1000000 for USDT)
      account = {
        accountID: usdtAccount.accountId || usdtAccount.id || 0,
        currency: usdtAccount.currency || 'USDT',
        totalEquity: totalBalance / 1000000,
        availableBalance: availableBalance / 1000000,
        unrealisedPnl: unrealisedPnl / 1000000
      };
    }
  }

  return account;
}
