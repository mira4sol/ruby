export interface BirdEyeTokenItem {
  address: string
  decimals: number
  balance: number
  uiAmount: number
  chainId: string
  name?: string
  symbol?: string
  logoURI?: string
  priceUsd?: number
  valueUsd?: number
  priceChange24h?: number
  liquidity?: number
}

export interface BirdEyeWalletPortfolio {
  wallet: string
  totalUsd: number
  items: BirdEyeTokenItem[]
}

export interface BirdEyeBalanceChange {
  amount: number
  symbol: string
  name: string
  decimals: number
  address: string
  logoURI: string
}

export interface BirdEyeContractLabel {
  address: string
  name: string
  metadata: {
    icon: string
  }
}

export interface BirdEyeTransaction {
  txHash: string
  blockNumber: number
  blockTime: string
  status: boolean
  from: string
  to: string
  fee: number
  mainAction: string
  balanceChange: BirdEyeBalanceChange[]
  contractLabel: BirdEyeContractLabel
}

export interface BirdEyeWalletTransactionHistory {
  solana: BirdEyeTransaction[]
}

export interface BirdEyeSearchTokenResult {
  name: string
  symbol: string
  address: string
  network: string
  decimals: number
  logo_uri: string
  verified: boolean
  fdv: number
  market_cap: number
  liquidity: number
  price: number
  price_change_24h_percent: number
  sell_24h: number
  sell_24h_change_percent: number
  buy_24h: number
  buy_24h_change_percent: number
  unique_wallet_24h: number
  unique_wallet_24h_change_percent: number
  trade_24h: number
  trade_24h_change_percent: number
  volume_24h_change_percent: number
  volume_24h_usd: number
  last_trade_unix_time: number
  last_trade_human_time: string
  supply: number
  updated_time: number
}

export interface BirdEyeSearchItem {
  type: string
  result: BirdEyeSearchTokenResult[]
}

export interface BirdEyeSearchResponse {
  items: BirdEyeSearchItem[]
}

export interface BirdEyeWalletBalanceChangeTokenInfo {
  address: string
  decimals: number
  symbol: string
  name: string
  logo_uri: string
}

export interface BirdEyeWalletBalanceChangeItem {
  time: string
  block_number: number
  block_unix_time: number
  address: string
  token_account: string
  tx_hash: string
  pre_balance: string
  post_balance: string
  amount: string
  token_info: BirdEyeWalletBalanceChangeTokenInfo
  type: number
  type_text: string
  change_type: number
  change_type_text: string
}

export interface BirdEyeWalletBalanceChangeResponse
  extends Array<BirdEyeWalletBalanceChangeItem> {}

export interface BirdEyePriceData {
  value: number
  updateUnixTime: number
  updateHumanTime: string
  priceInNative: number
  priceChange24h: number
  liquidity?: number
}

export interface BirdEyeMultiplePrice {
  [tokenMint: string]: BirdEyePriceData
}

export type BirdEyeTimePeriod =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1H'
  | '2H'
  | '4H'
  | '6H'
  | '8H'
  | '12H'
  | '1D'
  | '3D'
  | '1W'
  | '1M'
  | '1Y'

export interface BirdEyeOHLCVItem {
  o: number
  h: number
  l: number
  c: number
  v: number
  unixTime: number
  address: string
  type: string
  currency: string
}

export interface BirdEyeTokenOHLCV {
  items: BirdEyeOHLCVItem[]
}

export interface BirdEyeHistoricalPriceItem {
  unixTime: number
  value: number
}

export interface BirdEyeHistoricalPriceResponse {
  items: BirdEyeHistoricalPriceItem[]
}

export interface BirdEyeTokenOverview {
  address: string
  decimals: number
  symbol: string
  name: string
  marketCap: number
  fdv: number
  extensions: {
    twitter?: string
    website?: string
    description?: string
  }
  logoURI: string
  liquidity: number
  lastTradeUnixTime: number
  lastTradeHumanTime: string
  price: number
  history1mPrice: number
  priceChange1mPercent: number
  history5mPrice: number
  priceChange5mPercent: number
  history30mPrice: number
  priceChange30mPercent: number
  history1hPrice: number
  priceChange1hPercent: number
  history2hPrice: number
  priceChange2hPercent: number
  history4hPrice: number
  priceChange4hPercent: number
  history6hPrice: number
  priceChange6hPercent: number
  history8hPrice: number
  priceChange8hPercent: number
  history12hPrice: number
  priceChange12hPercent: number
  history24hPrice: number
  priceChange24hPercent: number
  uniqueWallet1m: number
  uniqueWalletHistory1m: number
  uniqueWallet1mChangePercent: number | null
  uniqueWallet5m: number
  uniqueWalletHistory5m: number
  uniqueWallet5mChangePercent: number
  uniqueWallet30m: number
  uniqueWalletHistory30m: number
  uniqueWallet30mChangePercent: number
  uniqueWallet1h: number
  uniqueWalletHistory1h: number
  uniqueWallet1hChangePercent: number
  uniqueWallet2h: number
  uniqueWalletHistory2h: number
  uniqueWallet2hChangePercent: number
  uniqueWallet4h: number
  uniqueWalletHistory4h: number
  uniqueWallet4hChangePercent: number
  uniqueWallet8h: number
  uniqueWalletHistory8h: number
  uniqueWallet8hChangePercent: number
  uniqueWallet24h: number
  uniqueWalletHistory24h: number
  uniqueWallet24hChangePercent: number | null
  totalSupply: number
  circulatingSupply: number
  holder: number
  trade1m: number
  tradeHistory1m: number
  trade1mChangePercent: number
  sell1m: number
  sellHistory1m: number
  sell1mChangePercent: number
  buy1m: number
  buyHistory1m: number
  buy1mChangePercent: number
  v1m: number
  v1mUSD: number
  vHistory1m: number
  vHistory1mUSD: number
  v1mChangePercent: number
  vBuy1m: number
  vBuy1mUSD: number
  vBuyHistory1m: number
  vBuyHistory1mUSD: number
  vBuy1mChangePercent: number
  vSell1m: number
  vSell1mUSD: number
  vSellHistory1m: number
  vSellHistory1mUSD: number
  vSell1mChangePercent: number
  trade5m: number
  tradeHistory5m: number
  trade5mChangePercent: number
  sell5m: number
  sellHistory5m: number
  sell5mChangePercent: number
  buy5m: number
  buyHistory5m: number
  buy5mChangePercent: number
  v5m: number
  v5mUSD: number
  vHistory5m: number
  vHistory5mUSD: number
  v5mChangePercent: number
  vBuy5m: number
  vBuy5mUSD: number
  vBuyHistory5m: number
  vBuyHistory5mUSD: number
  vBuy5mChangePercent: number
  vSell5m: number
  vSell5mUSD: number
  vSellHistory5m: number
  vSellHistory5mUSD: number
  vSell5mChangePercent: number
  trade30m: number
  tradeHistory30m: number
  trade30mChangePercent: number
  sell30m: number
  sellHistory30m: number
  sell30mChangePercent: number
  buy30m: number
  buyHistory30m: number
  buy30mChangePercent: number
  v30m: number
  v30mUSD: number
  vHistory30m: number
  vHistory30mUSD: number
  v30mChangePercent: number
  vBuy30m: number
  vBuy30mUSD: number
  vBuyHistory30m: number
  vBuyHistory30mUSD: number
  vBuy30mChangePercent: number
  vSell30m: number
  vSell30mUSD: number
  vSellHistory30m: number
  vSellHistory30mUSD: number
  vSell30mChangePercent: number
  trade1h: number
  tradeHistory1h: number
  trade1hChangePercent: number
  sell1h: number
  sellHistory1h: number
  sell1hChangePercent: number
  buy1h: number
  buyHistory1h: number
  buy1hChangePercent: number
  v1h: number
  v1hUSD: number
  vHistory1h: number
  vHistory1hUSD: number
  v1hChangePercent: number
  vBuy1h: number
  vBuy1hUSD: number
  vBuyHistory1h: number
  vBuyHistory1hUSD: number
  vBuy1hChangePercent: number
  vSell1h: number
  vSell1hUSD: number
  vSellHistory1h: number
  vSellHistory1hUSD: number
  vSell1hChangePercent: number
  trade2h: number
  tradeHistory2h: number
  trade2hChangePercent: number
  sell2h: number
  sellHistory2h: number
  sell2hChangePercent: number
  buy2h: number
  buyHistory2h: number
  buy2hChangePercent: number
  v2h: number
  v2hUSD: number
  vHistory2h: number
  vHistory2hUSD: number
  v2hChangePercent: number
  vBuy2h: number
  vBuy2hUSD: number
  vBuyHistory2h: number
  vBuyHistory2hUSD: number
  vBuy2hChangePercent: number
  vSell2h: number
  vSell2hUSD: number
  vSellHistory2h: number
  vSellHistory2hUSD: number
  vSell2hChangePercent: number
  trade4h: number
  tradeHistory4h: number
  trade4hChangePercent: number
  sell4h: number
  sellHistory4h: number
  sell4hChangePercent: number
  buy4h: number
  buyHistory4h: number
  buy4hChangePercent: number
  v4h: number
  v4hUSD: number
  vHistory4h: number
  vHistory4hUSD: number
  v4hChangePercent: number
  vBuy4h: number
  vBuy4hUSD: number
  vBuyHistory4h: number
  vBuyHistory4hUSD: number
  vBuy4hChangePercent: number
  vSell4h: number
  vSell4hUSD: number
  vSellHistory4h: number
  vSellHistory4hUSD: number
  vSell4hChangePercent: number
  trade8h: number
  tradeHistory8h: number
  trade8hChangePercent: number
  sell8h: number
  sellHistory8h: number
  sell8hChangePercent: number
  buy8h: number
  buyHistory8h: number
  buy8hChangePercent: number
  v8h: number
  v8hUSD: number
  vHistory8h: number
  vHistory8hUSD: number
  v8hChangePercent: number
  vBuy8h: number
  vBuy8hUSD: number
  vBuyHistory8h: number
  vBuyHistory8hUSD: number
  vBuy8hChangePercent: number
  vSell8h: number
  vSell8hUSD: number
  vSellHistory8h: number
  vSellHistory8hUSD: number
  vSell8hChangePercent: number
  trade24h: number
  tradeHistory24h: number
  trade24hChangePercent: number | null
  sell24h: number
  sellHistory24h: number
  sell24hChangePercent: number | null
  buy24h: number
  buyHistory24h: number
  buy24hChangePercent: number | null
  v24h: number
  v24hUSD: number
  vHistory24h: number
  vHistory24hUSD: number
  v24hChangePercent: number | null
  vBuy24h: number
  vBuy24hUSD: number
  vBuyHistory24h: number
  vBuyHistory24hUSD: number
  vBuy24hChangePercent: number | null
  vSell24h: number
  vSell24hUSD: number
  vSellHistory24h: number
  vSellHistory24hUSD: number
  vSell24hChangePercent: number | null
  numberMarkets: number
}

export interface BirdEyeTrendingTokenItem {
  address: string
  decimals: number
  liquidity: number
  logoURI: string
  name: string
  symbol: string
  volume24hUSD: number
  volume24hChangePercent: number | null
  fdv: number
  marketcap: number
  rank: number
  price: number
  price24hChangePercent: number
}

export interface BirdEyeTrendingTokens {
  updateUnixTime: number
  updateTime: string
  tokens: BirdEyeTrendingTokenItem[]
}

interface BirdEyeTokenPriceData {
  isScaledUiToken: boolean
  value: number
  updateUnixTime: number
  updateHumanTime: string
  priceChange24h: number
  priceInNative: number
}

export interface BirdEyeTokenPrice {
  data: BirdEyeTokenPriceData
  success: boolean
}