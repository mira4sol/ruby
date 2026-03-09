// Specifically ignore self-signed certs for localhost testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const API_KEY = '1d45d4ad6b171a4bcc4f26e29ed3da4f2b4d945cb55b5ba3'
const BASE_URL = 'http://localhost:5001/agent'

async function main() {
  const label = 'general' // Adjust as needed
  console.log(`Sending SPL token from wallet: ${label}...`)

  const payload = {
    toAddress: '5QDwYS1CtHzN1oJ2eij8Crka4D2eJcUavMcyuvwNRM9', // Replace with valid Solana destination pubkey
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // E.g., USDC mint
    amount: 0.9991, // Human-readable amount
  }

  try {
    const response = await fetch(`${BASE_URL}/wallets/${label}/send-spl`, {
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
    console.error('Error sending SPL token:', error)
  }
}

main()

export {}
