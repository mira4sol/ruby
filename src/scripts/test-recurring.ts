// Specifically ignore self-signed certs for localhost testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const API_KEY = '1d45d4ad6b171a4bcc4f26e29ed3da4f2b4d945cb55b5ba3'
const BASE_URL = 'http://localhost:5001/agent'

async function main() {
  const label = 'TRADING' // Adjust as needed
  console.log(`Creating DCA (recurring) order for wallet: ${label}...`)

  const payload = {
    inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    outputMint: 'So11111111111111111111111111111111111111112', // WSOL
    inAmount: '10000000', // 10 USDC TOTAL
    numberOfOrders: 10, // Buy 10 times in chunks
    intervalSeconds: 3600, // 1 hour intervals
  }

  try {
    const response = await fetch(`${BASE_URL}/wallets/${label}/recurring`, {
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
    console.error('Error creating DCA/recurring order:', error)
  }
}

main()

export {}
