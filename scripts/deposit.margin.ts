import { 
  OnChainCalls,
  readFile, 
  getSignerFromSeed, 
  getProvider, 
  DeploymentConfig, 
  Transaction,
  toBigNumberStr, 
  bnToBaseStr,
  USDC_BASE_DECIMALS
} from "../src";


const Config = {
  SUI_TESTNET : {
    provider: "https://api.shinami.com/node/v1//sui_testnet_0d359e0ce3682c1f5d0cab31de9d151b",
    deploymentPath : "./scripts/deployment.staging.json"
  },
  SUI_MAINNET : {
    provider: "https://fullnode.mainnet.sui.io:443",
    deploymentPath : "./scripts/deployment.prod.json"
  }
}

async function main() {

  const recepients = [
    "0xb88a385c92c90f2d2e525b74adf64ebed61cb0c29016e995c4758b7cf7b4efc5",
    "0x22d6456c2ec3ebdcdc513dd5ccc50f1ef197549aab81d03c7a5dba91e9a26a02",
    "0x28c7e39a04d281d5f0a5e15ce50b54d3f0ee8b7dcab556dc709ede22d1704ed8",
    "0xadefbe39c57912cd7d3a156e4b0b88599c5c91a8b13fcb52226f2d2f3dfe7ede",
  ]

  const deployment = readFile(Config.SUI_MAINNET.deploymentPath) as DeploymentConfig;
  const provider = getProvider(Config.SUI_MAINNET.provider);
  const deployerSeed = "royal reopen journey royal enlist vote core cluster shield slush hill sample"
  const ownerSigner = getSignerFromSeed(deployerSeed, provider);
  const onChain = new OnChainCalls(ownerSigner, deployment);

  const usdcAmount = 1000000

  console.log("usdc balance of the deployer %o", await onChain.getUSDCBalance())
  console.log("bank balance of the deployer %o", bnToBaseStr(await onChain.getUserBankBalance()))

  const coinObj = await onChain.getUSDCoinHavingBalance({
    amount: usdcAmount
  })
  if(coinObj) {
    for(const recepientAddress of recepients) {
      const txResult = await onChain.depositToBank(
        {
            coinID: coinObj.coinObjectId,
            amount: toBigNumberStr(usdcAmount, USDC_BASE_DECIMALS),
            accountAddress: recepientAddress,
        },
        ownerSigner
      );
      console.log("tx result = %o", txResult)
      const bankBalanceUpdateEvent = Transaction.getEvents(
          txResult,
          "BankBalanceUpdate"
      )[0];
      console.log("bank balance update event %o = ", bankBalanceUpdateEvent);
      }
  }
}

main()