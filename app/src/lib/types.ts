// === API Response wrapper ===
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// === Auth ===
export interface AuthSyncData {
  id: string;
  email: string;
}

// === Agent ===
export interface AgentListItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count: { wallets: number };
}

export interface AgentWalletSummary {
  id: string;
  walletAddress: string;
  purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL';
  label: string;
  isDefault?: boolean;
}

export interface AgentDetail {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  wallets: AgentWalletSummary[];
}

export interface CreateAgentResponse {
  id: string;
  name: string;
  apiKey: string;
  wallets: AgentWalletSummary[];
}

export interface RegenerateKeyResponse {
  apiKey: string;
}

// === Wallet ===
export interface WalletListItem {
  id: string;
  walletAddress: string;
  label: string;
  purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL';
  isDefault: boolean;
  createdAt: string;
}

export interface BirdEyeTokenItem {
  address: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  chainId: string;
  name?: string;
  symbol?: string;
  logoURI?: string;
  priceUsd?: number;
  valueUsd?: number;
  priceChange24h?: number;
  liquidity?: number;
}

export interface WalletBalanceData {
  wallet: string;
  totalUsd: number;
  items: BirdEyeTokenItem[];
}

export interface CreateWalletResponse {
  id: string;
  walletAddress: string;
  purpose: 'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL';
  label: string;
}

export interface SendResponse {
  txHash: string;
  logId: string;
}

// === Policy ===
export interface PolicyCondition {
  field_source: string;
  field: string;
  operator: string;
  value: string | string[];
}

export interface PolicyRule {
  id?: string;
  name: string;
  method: string;
  action: 'ALLOW' | 'DENY';
  conditions: PolicyCondition[];
}

export interface PrivyPolicy {
  id?: string;
  name: string;
  version: string;
  chain_type: string;
  rules: PolicyRule[];
  created_at?: string;
  updated_at?: string;
}

export interface UpdatePolicyPayload {
  name: string;
  rules: Array<{
    name: string;
    method: string;
    action: 'ALLOW' | 'DENY';
    conditions: Array<{
      fieldSource: string;
      field: string;
      operator: string;
      value: string | string[];
    }>;
  }>;
}

// === Transactions (BirdEye) ===
export interface BirdEyeBalanceChange {
  amount: number;
  symbol: string;
  name: string;
  decimals: number;
  address: string;
  logoURI: string;
}

export interface BirdEyeContractLabel {
  address: string;
  name: string;
  metadata: { icon: string };
}

export interface BirdEyeTransaction {
  txHash: string;
  blockNumber: number;
  blockTime: string;
  status: boolean;
  from: string;
  to: string;
  fee: number;
  mainAction: string;
  balanceChange: BirdEyeBalanceChange[];
  contractLabel: BirdEyeContractLabel;
}

export interface TransactionsData {
  solana: BirdEyeTransaction[];
}

// === Orders (Jupiter) ===
export interface TriggerOrder {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  remainingMakingAmount: string;
  remainingTakingAmount: string;
  rawMakingAmount: string;
  rawTakingAmount: string;
  rawRemainingMakingAmount: string;
  rawRemainingTakingAmount: string;
  slippageBps: string;
  slTakingAmount: string;
  rawSlTakingAmount: string;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  openTx: string;
  closeTx: string;
  programVersion: string;
  trades: Array<{
    orderKey: string;
    keeper: string;
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    feeMint: string;
    feeAmount: string;
    txId: string;
    confirmedAt: string;
  }>;
}

export interface RecurringOrder {
  userPubkey: string;
  orderKey: string;
  inputMint: string;
  outputMint: string;
  inDeposited: string;
  inWithdrawn: string;
  outReceived: string;
  cycleFrequency: number;
  inAmountPerCycle: string;
  inUsed: string;
  minOutAmount: string;
  maxOutAmount: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  openTx: string;
  closeTx: string;
  userClosed: boolean;
  trades: Array<{
    orderKey: string;
    keeper: string;
    inputMint: string;
    outputMint: string;
    inputAmount: string;
    outputAmount: string;
    feeMint: string;
    feeAmount: string;
    txId: string;
    confirmedAt: string;
  }>;
}

export interface OrdersData {
  trigger: TriggerOrder[];
  recurring: RecurringOrder[];
}
