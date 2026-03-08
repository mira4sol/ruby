export interface JupiterOrderRequest {
  inputMint: string
  outputMint: string
  amount: string | number
  taker: string
  referralAccount?: string
  referralFee?: number
}

interface SwapInfo {
  ammKey: string
  label: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  feeAmount: string
  feeMint: string
}

interface RoutePlan {
  swapInfo: SwapInfo
  percent: number
  bps: number
}

interface DynamicSlippageReport {
  slippageBps: number
  otherAmount: null
  simulatedIncurredSlippageBps: null
  amplificationRatio: null
  categoryName: string
  heuristicMaxSlippageBps: number
  rtseSlippageBps: number
  failedTxnEstSlippage: number
  emaEstSlippage: number
  useIncurredSlippageForQuoting: null
}

interface PlatformFee {
  amount: string
  feeBps: number
}

export interface JupiterQuoteOrderResponse {
  mode?: string
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  inUsdValue?: number
  outUsdValue?: number
  priceImpact?: number
  swapUsdValue?: number
  priceImpactPct: string
  routePlan: RoutePlan[]
  feeMint?: string
  feeBps: number
  signatureFeeLamports?: number
  prioritizationFeeLamports?: number
  rentFeeLamports?: number
  swapType: string
  router?: 'aggregator' | string
  transaction: string
  gasless: boolean
  requestId: string
  totalTime: number
  taker: string
  quoteId?: string
  maker?: string
  expireAt?: string
  platformFee?: PlatformFee
  errorCode?: number
  errorMessage?: string
  // Legacy fields (may be deprecated)
  prioritizationType?: string
  dynamicSlippageReport?: DynamicSlippageReport
}

interface SwapEvent {
  inputMint: string
  inputAmount: string
  outputMint: string
  outputAmount: string
}

export interface JupiterExecuteOrderResponse {
  status: string
  signature: string
  slot: string
  code: number
  inputAmountResult: string
  outputAmountResult: string
  swapEvents: SwapEvent[]
}
