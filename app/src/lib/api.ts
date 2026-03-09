import type {
  AgentDetail,
  AgentListItem,
  ApiResponse,
  AuthSyncData,
  CreateAgentResponse,
  CreateWalletResponse,
  OrdersData,
  PrivyPolicy,
  RegenerateKeyResponse,
  SendResponse,
  TransactionsData,
  UpdatePolicyPayload,
  WalletBalanceData,
  WalletListItem,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL
// 'https://static.53.190.27.37.clients.your-server.de/ruby/api';

class ApiClient {
  private getToken: (() => string | null | undefined) | null = null

  /** Call once from the React tree to wire up the token getter */
  setTokenGetter(fn: () => string | null | undefined) {
    this.getToken = fn
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken?.()
    if (!token) {
      throw new Error('Not authenticated — identity token not available yet')
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
        ...(options.headers as Record<string, string> | undefined),
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(
        res.status,
        (body as any)?.message || res.statusText,
        body,
      )
    }

    return res.json() as Promise<T>
  }

  // ─── Auth ───────────────────────────────────────
  authSync() {
    return this.request<ApiResponse<AuthSyncData>>('/auth/sync', {
      method: 'POST',
    })
  }

  // ─── Agents ─────────────────────────────────────
  getAgents(page = 1, limit = 20) {
    return this.request<
      ApiResponse<{ agents: AgentListItem[]; total: number }>
    >(`/agents?page=${page}&limit=${limit}`)
  }

  getAgent(agentId: string) {
    return this.request<ApiResponse<AgentDetail>>(`/agents/${agentId}`)
  }

  createAgent(
    name: string,
    wallets?: Array<'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'>,
  ) {
    return this.request<ApiResponse<CreateAgentResponse>>('/agents', {
      method: 'POST',
      body: JSON.stringify({ name, wallets }),
    })
  }

  deleteAgent(agentId: string) {
    return this.request<ApiResponse<{ deleted: boolean }>>(
      `/agents/${agentId}`,
      {
        method: 'DELETE',
      },
    )
  }

  regenerateKey(agentId: string) {
    return this.request<ApiResponse<RegenerateKeyResponse>>(
      `/agents/${agentId}/regenerate-key`,
      { method: 'POST' },
    )
  }

  // ─── Wallets ────────────────────────────────────
  getWallets(agentId: string) {
    return this.request<ApiResponse<WalletListItem[]>>(
      `/agents/${agentId}/wallets`,
    )
  }

  createWallet(agentId: string, purpose: string, label?: string) {
    return this.request<ApiResponse<CreateWalletResponse>>(
      `/agents/${agentId}/wallets`,
      { method: 'POST', body: JSON.stringify({ purpose, label }) },
    )
  }

  getWalletBalance(agentId: string, walletId: string) {
    return this.request<ApiResponse<WalletBalanceData>>(
      `/agents/${agentId}/wallets/${walletId}/balance`,
    )
  }

  deleteWallet(agentId: string, walletId: string) {
    return this.request<ApiResponse<{ deleted: boolean }>>(
      `/agents/${agentId}/wallets/${walletId}`,
      { method: 'DELETE' },
    )
  }

  sendSol(
    agentId: string,
    walletId: string,
    toAddress: string,
    amount: number,
  ) {
    return this.request<ApiResponse<SendResponse>>(
      `/agents/${agentId}/wallets/${walletId}/send`,
      { method: 'POST', body: JSON.stringify({ toAddress, amount }) },
    )
  }

  sendSpl(
    agentId: string,
    walletId: string,
    toAddress: string,
    mint: string,
    amount: number,
  ) {
    return this.request<ApiResponse<SendResponse>>(
      `/agents/${agentId}/wallets/${walletId}/send-spl`,
      { method: 'POST', body: JSON.stringify({ toAddress, mint, amount }) },
    )
  }

  swap(
    agentId: string,
    walletId: string,
    inputMint: string,
    outputMint: string,
    amount: number,
  ) {
    return this.request<ApiResponse<SendResponse>>(
      `/agents/${agentId}/wallets/${walletId}/swap`,
      {
        method: 'POST',
        body: JSON.stringify({ inputMint, outputMint, amount }),
      },
    )
  }

  // ─── Policy ─────────────────────────────────────
  getPolicy(agentId: string, walletId: string) {
    return this.request<ApiResponse<PrivyPolicy | null>>(
      `/agents/${agentId}/wallets/${walletId}/policy`,
    )
  }

  updatePolicy(
    agentId: string,
    walletId: string,
    payload: UpdatePolicyPayload,
  ) {
    return this.request<ApiResponse<{ message: string }>>(
      `/agents/${agentId}/wallets/${walletId}/policy`,
      { method: 'PUT', body: JSON.stringify(payload) },
    )
  }

  deletePolicy(agentId: string, walletId: string) {
    return this.request<ApiResponse<{ message: string }>>(
      `/agents/${agentId}/wallets/${walletId}/policy`,
      { method: 'DELETE' },
    )
  }

  // ─── Transactions ──────────────────────────────
  getTransactions(agentId: string, walletId: string) {
    return this.request<ApiResponse<TransactionsData>>(
      `/agents/${agentId}/wallets/${walletId}/transactions`,
    )
  }

  // ─── Orders ────────────────────────────────────
  getOrders(
    agentId: string,
    walletId: string,
    orderStatus: 'active' | 'history' = 'active',
  ) {
    return this.request<ApiResponse<OrdersData>>(
      `/agents/${agentId}/wallets/${walletId}/orders?orderStatus=${orderStatus}`,
    )
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Singleton instance — call `api.setTokenGetter(fn)` once from a React provider */
export const api = new ApiClient()
