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
    deploymentPath : "./scripts/deployment.staging.json",
    deployerSeed: "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis"
  },
  SUI_MAINNET : {
    provider: "https://fullnode.mainnet.sui.io:443",
    deploymentPath : "./scripts/deployment.prod.json",
    deployerSeed: "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis"
  }
}

async function main() {
  const recepients = [
    "0x748c14178781e3ece2f0d8e243699873f963baba727c86f1b17e1a53fb59f1be",
  ]

  const deployment = readFile(Config.SUI_MAINNET.deploymentPath) as DeploymentConfig;
  const provider = getProvider(Config.SUI_MAINNET.provider);
  const ownerSigner = getSignerFromSeed(Config.SUI_MAINNET.deployerSeed, provider);
  const onChain = new OnChainCalls(ownerSigner, deployment);

  const usdcAmount = 1000000
  console.log("deployer usdc balance %o", await onChain.getUSDCBalance())
  console.log("deployer margin bank balance %o", bnToBaseStr(await onChain.getUserBankBalance()))

  const coinObj = await onChain.getUSDCoinHavingBalance({
    amount: usdcAmount
  })
  if(coinObj) {
    for(const recepientAddress of recepients) {
      console.log("before credit")
      console.log("recepient usdc balance %o", await onChain.getUSDCBalance({
        address: recepientAddress,
      }))
      console.log("recepient margin bank balance %o", bnToBaseStr(await onChain.getUserBankBalance(recepientAddress), USDC_BASE_DECIMALS))    

      const txResult = await onChain.depositToBank(
        {
            coinID: coinObj.coinObjectId,
            amount: toBigNumberStr(usdcAmount, USDC_BASE_DECIMALS),
            accountAddress: recepientAddress,
            gasBudget: 10000000,
        },
        ownerSigner
      );
      const bankBalanceUpdateEvent = Transaction.getEvents(
          txResult,
          "BankBalanceUpdate"
      )[0];
      if(!bankBalanceUpdateEvent) {
        console.error("transaction failed %o", txResult);
        process.exit(1);
      }
      console.log("tx result = %o", txResult)
      console.log("bank balance update event %o = ", bankBalanceUpdateEvent);

      console.log("after credit")
      console.log("recepient usdc balance %o", await onChain.getUSDCBalance({
        address: recepientAddress,
      }))
      console.log("recepient margin bank balance %o", bnToBaseStr(await onChain.getUserBankBalance(recepientAddress)))    
      }
  }
}

main()