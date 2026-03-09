// Specifically ignore self-signed certs for localhost testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const API_KEY = '1d45d4ad6b171a4bcc4f26e29ed3da4f2b4d945cb55b5ba3'
const BASE_URL = 'http://localhost:5001/agent'

async function main() {
  const label = 'general' // Adjust as needed
  console.log(`Creating DCA (recurring) order for wallet: ${label}...`)

  const payload = {
    inputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    outputMint: 'So11111111111111111111111111111111111111112', // WSOL
    params: {
      time: {
        inAmount: 1000, // 1000 USDC TOTAL (or whatever)
        numberOfOrders: 10,
        interval: 86400, // 1 day
        startAt: null,
      },
    },
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
