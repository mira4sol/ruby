-- CreateEnum
CREATE TYPE "WalletPurpose" AS ENUM ('TRADING', 'SAVINGS', 'GAS', 'GENERAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SEND_SOL', 'SEND_SPL', 'SWAP', 'TRIGGER_ORDER', 'RECURRING_ORDER', 'RECEIVE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "privy_user_id" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "api_key_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_wallets" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "privy_wallet_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "purpose" "WalletPurpose" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_policies" (
    "id" TEXT NOT NULL,
    "privy_policy_id" TEXT NOT NULL,
    "privy_wallet_id" TEXT NOT NULL,
    "policy_name" TEXT NOT NULL,
    "policy_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "tx_hash" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount_raw" TEXT,
    "token_mint" TEXT,
    "to_address" TEXT,
    "metadata" TEXT,
    "error_msg" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owners_privy_user_id_key" ON "owners"("privy_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "agents_api_key_hash_key" ON "agents"("api_key_hash");

-- CreateIndex
CREATE INDEX "agents_owner_id_idx" ON "agents"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_wallets_privy_wallet_id_key" ON "agent_wallets"("privy_wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_wallets_wallet_address_key" ON "agent_wallets"("wallet_address");

-- CreateIndex
CREATE INDEX "agent_wallets_agent_id_idx" ON "agent_wallets"("agent_id");

-- CreateIndex
CREATE INDEX "agent_wallets_wallet_address_idx" ON "agent_wallets"("wallet_address");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_policies_privy_policy_id_key" ON "wallet_policies"("privy_policy_id");

-- CreateIndex
CREATE INDEX "wallet_policies_privy_wallet_id_idx" ON "wallet_policies"("privy_wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_logs_tx_hash_key" ON "transaction_logs"("tx_hash");

-- CreateIndex
CREATE INDEX "transaction_logs_agent_id_idx" ON "transaction_logs"("agent_id");

-- CreateIndex
CREATE INDEX "transaction_logs_wallet_id_idx" ON "transaction_logs"("wallet_id");

-- CreateIndex
CREATE INDEX "transaction_logs_tx_hash_idx" ON "transaction_logs"("tx_hash");

-- CreateIndex
CREATE INDEX "transaction_logs_created_at_idx" ON "transaction_logs"("created_at");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_wallets" ADD CONSTRAINT "agent_wallets_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_policies" ADD CONSTRAINT "wallet_policies_privy_wallet_id_fkey" FOREIGN KEY ("privy_wallet_id") REFERENCES "agent_wallets"("privy_wallet_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "agent_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
