import { birdEyeWalletRequests } from './utils/http_request/birdeye/birdeye_wallet.request'

async function test() {
  console.log(
    'Fetching portfolio for AM96Xpr1gYTGVaycDa4YDXoEF2iF4npe94NTXKJcCFM3...',
  )
  const res = await birdEyeWalletRequests.getWalletPortfolio(
    'AM96Xpr1gYTGVaycDa4YDXoEF2iF4npe94NTXKJcCFM3',
  )
  console.log('Result:', JSON.stringify(res, null, 2))
}

test().catch(console.error)
