
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

  // Process coin-margined futures account data
  if (data.data && data.data.account) {
    const acc = data.data.account;
    console.log('Found coin futures account:', JSON.stringify(acc, null, 2));
    
    // Coin-margined uses different scaling - typically 8 decimal places for USDT values
    const scaleFactor = 100000000;
    
    account = {
      accountID: acc.accountId || acc.userID || 0,
      currency: 'USDT',
      totalEquity: (parseInt(acc.accountBalanceEv || '0') + parseInt(acc.totalUnrealisedPnlEv || '0')) / scaleFactor,
      availableBalance: parseInt(acc.accountBalanceEv || '0') / scaleFactor,
      unrealisedPnl: parseInt(acc.totalUnrealisedPnlEv || '0') / scaleFactor
    };
  } else if (data.data && Array.isArray(data.data.accounts)) {
    // Handle multiple accounts format
    const usdtAccount = data.data.accounts.find((acc: any) => acc.currency === 'USDT' || acc.currency === 'USD');
    
    if (usdtAccount) {
      console.log('Found USDT account in accounts array:', JSON.stringify(usdtAccount, null, 2));
      
      // Use correct scaling factor for USDT
      const scaleFactor = 100000000;
      
      account = {
        accountID: usdtAccount.accountId || usdtAccount.id || 0,
        currency: usdtAccount.currency || 'USDT',
        totalEquity: (parseInt(usdtAccount.accountBalanceEv || '0') + parseInt(usdtAccount.totalUnrealisedPnlEv || '0')) / scaleFactor,
        availableBalance: parseInt(usdtAccount.accountBalanceEv || '0') / scaleFactor,
        unrealisedPnl: parseInt(usdtAccount.totalUnrealisedPnlEv || '0') / scaleFactor
      };
    }
  }

  return account;
}
