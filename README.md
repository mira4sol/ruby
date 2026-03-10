# Ruby (Agentic Wallet)

Ruby is an intelligent, agent-driven hardware wallet system built for the Solana blockchain. It provides a comprehensive platform for creating and managing AI agents that operate non-custodial wallets via Privy. The application consists of a robust Node.js backend and a modern React frontend dashboard.

## 🌟 Features

- **Agent Management**: Create, view, and manage multiple AI agents.
- **Wallet Operations**: Agents are equipped with purposeful wallets (Trading, Savings, Gas, General) backed by Privy.
- **Solana Integration**: Native SOL and SPL token transfers, swaps via Jupiter Aggregator, and portfolio tracking via BirdEye.
- **Advanced Trading**: Support for trigger (limit) orders and recurring (DCA) orders through Jupiter.
- **Security & Policies**: Granular control over wallet operations through Privy server-wallet policies.
- **AI Chat Interface**: Embedded conversational interface powered by xAI (`grok-2`) that can perform on-chain wallet operations.

## 🏗 Tech Stack

### Backend

- **Framework**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Web3 / Blockchain**: `@solana/web3.js`, `@privy-io/node`, Turnkey
- **AI & Integrations**: `ai` SDK, `@ai-sdk/xai` (`grok-2`), Jupiter API, BirdEye API
- **Language**: TypeScript

### Frontend (User Dashboard)

- **Framework**: React via Vite (`app/` directory)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI, Radix UI, Lucide Icons

## 📋 Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Privy Account (App ID and App Secret)
- Solana RPC URL
- xAI API Key

## 🚀 Getting Started

### 1. Setup Backend

```bash
# Install backend dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials, Privy keys, and Solana endpoints.

# Setup Database
npm run prisma:generate
npm run prisma:push

# Start the development server
npm run dev
```

### 2. Setup Frontend Dashboard

```bash
# Navigate to the frontend directory
cd app

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Start the frontend dev server
npm run dev
```

## 📖 Documentation

For detailed information on the backend API specifications, workflows, and integrations, see:

- [Dashboard API Integration Guide](./DASHBOARD_API_INTEGRATION_GUIDE.md)
- [DOCUMENTATION.md](./DOCUMENTATION.md) (Detailed project documentation)

## 📄 License

ISC
