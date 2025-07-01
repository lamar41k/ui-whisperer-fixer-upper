
export interface PhemexAccount {
  accountID: number;
  currency: string;
  totalEquity: number;
  availableBalance: number;
  unrealisedPnl: number;
}

export interface PhemexWallet {
  currency: string;
  balanceEv: string;
  lockedTradingBalanceEv: string;
  lockedWithdrawEv: string;
  lastUpdateTimeNs: number;
  walletVid: number;
}

export interface PhemexSpotResponse {
  code: number;
  msg: string;
  data: PhemexWallet[];
}
