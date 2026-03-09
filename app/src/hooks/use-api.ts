import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UpdatePolicyPayload } from '@/lib/types';

// ─── Keys ────────────────────────────────────────
export const queryKeys = {
  agents: ['agents'] as const,
  agent: (id: string) => ['agent', id] as const,
  wallets: (agentId: string) => ['wallets', agentId] as const,
  walletBalance: (agentId: string, walletId: string) => ['walletBalance', agentId, walletId] as const,
  policy: (agentId: string, walletId: string) => ['policy', agentId, walletId] as const,
  transactions: (agentId: string, walletId: string) => ['transactions', agentId, walletId] as const,
  orders: (agentId: string, walletId: string) => ['orders', agentId, walletId] as const,
};

// ─── Auth ────────────────────────────────────────
export const useAuthSync = () => {
  return useMutation({
    mutationFn: () => api.authSync(),
  });
};

// ─── Agents ──────────────────────────────────────
export const useAgents = (page = 1, limit = 20) =>
  useQuery({
    queryKey: [...queryKeys.agents, page, limit],
    queryFn: () => api.getAgents(page, limit),
  });

export const useAgent = (agentId: string) =>
  useQuery({
    queryKey: queryKeys.agent(agentId),
    queryFn: () => api.getAgent(agentId),
    enabled: !!agentId,
  });

export const useCreateAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, wallets }: { name: string; wallets?: Array<'TRADING' | 'SAVINGS' | 'GAS' | 'GENERAL'> }) =>
      api.createAgent(name, wallets),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents }),
  });
};

export const useDeleteAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (agentId: string) => api.deleteAgent(agentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.agents }),
  });
};

export const useRegenerateKey = () =>
  useMutation({
    mutationFn: (agentId: string) => api.regenerateKey(agentId),
  });

// ─── Wallets ─────────────────────────────────────
export const useWallets = (agentId: string) =>
  useQuery({
    queryKey: queryKeys.wallets(agentId),
    queryFn: () => api.getWallets(agentId),
    enabled: !!agentId,
  });

export const useWalletBalance = (agentId: string, walletId: string) =>
  useQuery({
    queryKey: queryKeys.walletBalance(agentId, walletId),
    queryFn: () => api.getWalletBalance(agentId, walletId),
    enabled: !!agentId && !!walletId,
  });

export const useCreateWallet = (agentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ purpose, label }: { purpose: string; label?: string }) =>
      api.createWallet(agentId, purpose, label),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets(agentId) });
      qc.invalidateQueries({ queryKey: queryKeys.agent(agentId) });
    },
  });
};

export const useDeleteWallet = (agentId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (walletId: string) => api.deleteWallet(agentId, walletId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.wallets(agentId) });
      qc.invalidateQueries({ queryKey: queryKeys.agent(agentId) });
    },
  });
};

export const useSendSol = (agentId: string, walletId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ toAddress, amount }: { toAddress: string; amount: number }) =>
      api.sendSol(agentId, walletId, toAddress, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.walletBalance(agentId, walletId) }),
  });
};

export const useSendSpl = (agentId: string, walletId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ toAddress, mint, amount }: { toAddress: string; mint: string; amount: number }) =>
      api.sendSpl(agentId, walletId, toAddress, mint, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.walletBalance(agentId, walletId) }),
  });
};

export const useSwap = (agentId: string, walletId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inputMint, outputMint, amount }: { inputMint: string; outputMint: string; amount: number }) =>
      api.swap(agentId, walletId, inputMint, outputMint, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.walletBalance(agentId, walletId) }),
  });
};

// ─── Policy ──────────────────────────────────────
export const usePolicy = (agentId: string, walletId: string) =>
  useQuery({
    queryKey: queryKeys.policy(agentId, walletId),
    queryFn: () => api.getPolicy(agentId, walletId),
    enabled: !!agentId && !!walletId,
  });

export const useUpdatePolicy = (agentId: string, walletId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdatePolicyPayload) => api.updatePolicy(agentId, walletId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.policy(agentId, walletId) }),
  });
};

export const useDeletePolicy = (agentId: string, walletId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.deletePolicy(agentId, walletId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.policy(agentId, walletId) }),
  });
};

// ─── Transactions ────────────────────────────────
export const useTransactions = (agentId: string, walletId: string) =>
  useQuery({
    queryKey: queryKeys.transactions(agentId, walletId),
    queryFn: () => api.getTransactions(agentId, walletId),
    enabled: !!agentId && !!walletId,
  });

// ─── Orders ──────────────────────────────────────
export const useOrders = (agentId: string, walletId: string, orderStatus: 'active' | 'history' = 'active') =>
  useQuery({
    queryKey: [...queryKeys.orders(agentId, walletId), orderStatus],
    queryFn: () => api.getOrders(agentId, walletId, orderStatus),
    enabled: !!agentId && !!walletId,
  });
