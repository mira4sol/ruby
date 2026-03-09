// Specifically ignore self-signed certs for localhost testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const API_KEY = '1d45d4ad6b171a4bcc4f26e29ed3da4f2b4d945cb55b5ba3'
const BASE_URL = 'http://localhost:5001/agent'

async function main() {
  const label = 'general' // Adjust as needed
  console.log(`Creating limit (trigger) order for wallet: ${label}...`)

  const payload = {
    inputMint: 'So11111111111111111111111111111111111111112', // WSOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    inAmount: '0.07', // 0.01 SOL
    targetPrice: 87, // Trigger when SOL hits $155
  }

  try {
    const response = await fetch(`${BASE_URL}/wallets/${label}/trigger`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    console.log('Response Status:', response.status)
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error creating trigger order:', error)
  }
}

main()

export {}
