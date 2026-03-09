// Specifically ignore self-signed certs for localhost testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const API_KEY = '1d45d4ad6b171a4bcc4f26e29ed3da4f2b4d945cb55b5ba3'
const BASE_URL = 'http://localhost:5001/agent'

async function main() {
  const label = 'general' // Adjust as needed
  console.log(`Cancelling recurring order for wallet: ${label}...`)

  try {
    // 1. Fetch active orders
    const ordersRes = await fetch(
      `${BASE_URL}/wallets/${label}/orders?orderStatus=active`,
      {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      },
    )

    const ordersData = await ordersRes.json()
    if (!ordersData.success) {
      console.log('Failed to fetch orders:', ordersData)
      return
    }

    const openRecurring = ordersData.data.recurring
    if (!openRecurring || openRecurring.length === 0) {
      console.log('No open recurring orders to cancel for this wallet.')
      return
    }

    const orderToCancel = openRecurring[0].orderKey
    console.log(`Attempting to cancel recurring order: ${orderToCancel}`)

    // 2. Cancel the order
    const cancelRes = await fetch(
      `${BASE_URL}/wallets/${label}/recurring/${orderToCancel}/cancel`,
      {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
      },
    )

    const cancelData = await cancelRes.json()
    console.log('Response Status:', cancelRes.status)
    console.log(JSON.stringify(cancelData, null, 2))
  } catch (error) {
    console.error('Error cancelling recurring order:', error)
  }
}

main()

export {}
