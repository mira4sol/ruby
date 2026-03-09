import { xai } from '@ai-sdk/xai'
import { stepCountIs, streamText } from 'ai'
import { createHash } from 'crypto'
import { NextFunction, Request, Response } from 'express'
import { z } from 'zod'
import { jupiterService } from '../services/jupiterService'
import { prismaService } from '../services/prismaService'
import { transactionLogService } from '../services/transactionLogService'
import { walletService } from '../services/walletService'

export const AGENT_MODEL = 'grok-4-1-fast-reasoning'
// export const AGENT_MODEL = 'grok-4-1-fast-non-reasoning'

const SYSTEM_PROMPT = `
You are the intelligence layer of an Agentic Wallet on Solana.
You have the ability to execute on-chain transactions, swap assets, move funds, and manage the user's portfolio.

Your prime directive is to assist the user or developer interacting via this API securely and accurately.

## Output Rules
- Output ONLY your final response to the user. Never output reasoning, thoughts, plans, or internal monologue.
- Do not narrate what you are about to do. Just do it or ask.
- Do not explain your decision process. Respond with the result or a single clarifying question.
- Never output lines like "The user said...", "Rule says...", "Safest:", "Since it's API..." — these are internal thoughts and must never appear in output.

## Core Rules & Security Concerns
1. **Never guess token addresses or values.** If the user asks to swap "some SOL", ask for the exact amount.
2. **Be extremely concise.** You are interacting via API. Do not output markdown code blocks unless asked. Speak plainly.
3. **Execution implies consent.** When the user asks to "buy 1 SOL worth of USDC", execute it immediately if you have all necessary information.
4. **Assume the wallet label.** Default to the user's default wallet unless they specify otherwise.
5. **Always summarize your actions.** After executing a tool, state what you did, amounts, and transaction hash if available.

## Tool Usage
- \`list_wallets\`: List available wallets.
- \`get_balance\`: Check token balances of a wallet.
- \`send_sol\`: Transfer native SOL.
- \`send_spl\`: Transfer SPL tokens.
- \`swap\`: Execute a market swap via Jupiter.
- \`trigger_order\`: Create a limit order via Jupiter.
- \`recurring_order\`: Create a DCA order via Jupiter.
- \`get_history\`: View transaction history.
- \`get_orders\`: List active limit and DCA orders.

If a tool returns an error, inform the user plainly in one sentence. Do not leak internal errors.
`

export const agentChatController = {
  /**
   * POST /api/chat
   */
  chat: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { messages, apiKey: bodyApiKey } = req.body
      const headerApiKey = req.headers['x-api-key'] as string

      const rawKey = bodyApiKey || req.body?.data?.apiKey || headerApiKey

      if (!rawKey) {
        // Stream back a request for the API key playfully
        const result = streamText({
          model: xai(AGENT_MODEL),
          messages: [
            {
              role: 'system',
              content:
                'You are an agentic wallet assistant. A user just tried to chat with you but did not provide their API Key. Ask them for it politely but firmly.',
            },
            ...messages,
          ],
        })
        result.pipeTextStreamToResponse(res)
        return
      }

      const hash = createHash('sha256').update(rawKey).digest('hex')

      const agent = await prismaService.prisma.agent.findUnique({
        where: { apiKeyHash: hash },
      })

      if (!agent || !agent.isActive || agent.deletedAt !== null) {
        // Stream back a rejection
        const result = streamText({
          model: xai(AGENT_MODEL),
          messages: [
            {
              role: 'system',
              content:
                'You are an agentic wallet assistant. A user just tried to chat with you but provided an invalid or inactive API Key. Inform them they cannot proceed.',
            },
            ...messages,
          ],
        })
        result.pipeTextStreamToResponse(res)
        return
      }

      // Valid agent — stream the actual chat with tools
      const aiTools: any = {
        list_wallets: {
          description: 'List all active wallets for this agent.',
          parameters: z.object({}),
          execute: async () => {
            const r = await walletService.listWallets(agent.id)
            if (!r.success) throw new Error(String(r.error))
            return r.data
          },
        },
        get_balance: {
          description: 'Get the full portfolio and USD balance of a wallet.',
          parameters: z.object({
            label: z
              .string()
              .describe('The label of the wallet (e.g., "trading")'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const balanceResult = await walletService.getBalance(
              walletResult.data.walletAddress,
            )
            if (!balanceResult.success)
              throw new Error(balanceResult.error.message)
            return balanceResult.data
          },
        },
        send_sol: {
          description: 'Send native SOL to an address.',
          parameters: z.object({
            label: z.string().describe('The label of the wallet to send from'),
            toAddress: z.string().describe('The destination Solana address'),
            amount: z.number().describe('Amount in SOL (not lamports)'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await walletService.sendSOL(
              walletResult.data.id,
              args.toAddress,
              args.amount,
              agent.id,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
        send_spl: {
          description: 'Send an SPL token to an address.',
          parameters: z.object({
            label: z.string().describe('The label of the wallet to send from'),
            mint: z.string().describe('The token mint address'),
            toAddress: z.string().describe('The destination Solana address'),
            amount: z.number().describe('Amount in human-readable token units'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await walletService.sendSPL(
              walletResult.data.id,
              args.mint,
              args.toAddress,
              args.amount,
              agent.id,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
        swap: {
          description: 'Swap tokens using Jupiter.',
          parameters: z.object({
            label: z.string().describe('The wallet to swap from'),
            inputMint: z
              .string()
              .describe('The token mint address to swap FROM'),
            outputMint: z
              .string()
              .describe('The token mint address to swap TO'),
            amount: z
              .number()
              .describe('Amount of input token in human-readable units'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await jupiterService.swap(
              walletResult.data.id,
              {
                inputMint: args.inputMint,
                outputMint: args.outputMint,
                amount: args.amount,
              },
              agent.id,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
        trigger_order: {
          description: 'Create a trigger (limit) order.',
          parameters: z.object({
            label: z.string().describe('The wallet to create the order for'),
            inputMint: z.string().describe('The token mint address to sell'),
            outputMint: z.string().describe('The token mint address to buy'),
            inAmount: z
              .string()
              .describe(
                'Amount of input token strictly in smallest raw units (string)',
              ),
            targetPrice: z.number().describe('The target price to trigger at'),
            expiredAt: z
              .string()
              .optional()
              .describe('ISO 8601 expiry for the order'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await jupiterService.createTriggerOrder(
              walletResult.data.id,
              {
                inputMint: args.inputMint,
                outputMint: args.outputMint,
                inAmount: args.inAmount,
                targetPrice: args.targetPrice,
                expiredAt: args.expiredAt,
              },
              agent.id,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
        recurring_order: {
          description: 'Create a recurring (DCA) order.',
          parameters: z.object({
            label: z.string().describe('The wallet to create the order for'),
            inputMint: z.string().describe('The token mint address to sell'),
            outputMint: z.string().describe('The token mint address to buy'),
            inAmount: z
              .string()
              .describe(
                'Total amount of input token strictly in smallest raw units (string)',
              ),
            numberOfOrders: z
              .number()
              .int()
              .describe('Total number of DCA orders'),
            intervalSeconds: z
              .number()
              .int()
              .describe('Seconds between each order'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await jupiterService.createRecurringOrder(
              walletResult.data.id,
              {
                inputMint: args.inputMint,
                outputMint: args.outputMint,
                inAmount: args.inAmount,
                numberOfOrders: args.numberOfOrders,
                intervalSeconds: args.intervalSeconds,
              },
              agent.id,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
        get_history: {
          description: 'Get the recent transaction history for a wallet.',
          parameters: z.object({
            label: z.string().describe('The wallet to query history for'),
            page: z.number().optional().describe('Page number'),
            limit: z.number().optional().describe('Items per page'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await transactionLogService.getHistory(
              agent.id,
              walletResult.data.id,
              args.page ?? 1,
              args.limit ?? 20,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
        get_orders: {
          description:
            'Get the active trigger and recurring orders for a wallet.',
          parameters: z.object({
            label: z.string().describe('The wallet to query orders for'),
          }),
          execute: async (args: any) => {
            const walletResult = await walletService.getWalletByLabel(
              agent.id,
              args.label,
            )
            if (!walletResult.success)
              throw new Error(walletResult.error.message)
            const r = await jupiterService.getOrders(
              walletResult.data.walletAddress,
            )
            if (!r.success) throw new Error(r.error.message)
            return r.data
          },
        },
      }

      const result = streamText({
        model: xai(AGENT_MODEL),
        system: SYSTEM_PROMPT,
        messages,
        tools: aiTools,
        stopWhen: stepCountIs(5),
      })

      pipeTextStreamToResponseWithErrorHandling(res, result, next)
    } catch (error) {
      console.error('[AgentChat] Error:', error)
      next(error)
    }
  },
}

/**
 * Pipe streamText result to Express res with error logging.
 * pipeTextStreamToResponse() can leave 200 + empty body on stream error; this logs the error.
 */
// function pipeTextStreamToResponseWithErrorHandling(
//   res: Response,
//   result: Awaited<ReturnType<typeof streamText>>,
//   next: NextFunction,
// ): void {
//   const encoder = new TextEncoder()
//   res.setHeader('Content-Type', 'text/plain; charset=utf-8')
//   res.setHeader('Transfer-Encoding', 'chunked')
//   res.writeHead(200)
//   const stream = result.textStream.pipeThrough(new TextEncoderStream())
//   const reader = stream.getReader()
//   const read = async () => {
//     try {
//       while (true) {
//         const { done, value } = await reader.read()
//         if (done) break
//         const canContinue = res.write(value)
//         if (!canContinue) {
//           await new Promise<void>((resolve) => res.once('drain', resolve))
//         }
//       }
//     } catch (err) {
//       console.error('[AgentChat] Stream error:', err)
//       next(err)
//     } finally {
//       try {
//         res.end()
//       } catch {
//         // ignore if already closed
//       }
//     }
//   }
//   read()
// }

function pipeTextStreamToResponseWithErrorHandling(
  res: Response,
  result: Awaited<ReturnType<typeof streamText>>,
  next: NextFunction,
): void {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Transfer-Encoding', 'chunked')
  res.writeHead(200)

  const reader = result.fullStream.getReader()

  const read = async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        switch (value.type) {
          case 'text-delta':
            // textDelta → text
            const canContinue = res.write(new TextEncoder().encode(value.text))
            if (!canContinue) {
              await new Promise<void>((resolve) => res.once('drain', resolve))
            }
            break

          case 'error':
            console.error('[AgentChat] LLM tool stream error:', value.error)
            break

          case 'tool-result':
            // result → output
            console.log(
              `[AgentChat] Tool "${value.toolName}" result:`,
              value.output,
            )
            break

          case 'tool-call':
            // args → input
            console.log(
              `[AgentChat] Tool call: "${value.toolName}"`,
              value.input,
            )
            break

          case 'finish':
            console.log(
              '[AgentChat] Stream finished. Stop reason:',
              value.finishReason,
              '| Usage:',
              value.totalUsage,
            )
            break
        }
      }
    } catch (err) {
      console.error('[AgentChat] Reader error:', err)
      next(err)
    } finally {
      try {
        res.end()
      } catch {
        // ignore if already closed
      }
    }
  }

  read()
}
