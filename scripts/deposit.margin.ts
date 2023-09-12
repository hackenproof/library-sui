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
    provider: "https://api.shinami.com/node/v1//sui_testnet_0d359e0ce3682c1f5d0cab31de9d151b"
  },
  SUI_MAINNET : {
    provider: "https://fullnode.mainnet.sui.io:443"
  }
}

async function main() {

  const recepients = [
    "0x76eb4121b05bb58e66c121c85f6fbcb0f739169b14ecd92bcb6f39838f49582c",
    "0x45c1fde973e22a1f9386fcaf0ff1d11fb7eeec4a951c0b138d1d155332e3b765",
    "0x46590c3753c585d1ec14337ce20b79e0f1568c047695ea5984f0120c69268e9d"
  ]

  const deployment = readFile("./scripts/deployment.staging.json") as DeploymentConfig;
  const provider = getProvider(Config.SUI_TESTNET.provider);
  const deployerSeed = "royal reopen journey royal enlist vote core cluster shield slush hill sample"
  const ownerSigner = getSignerFromSeed(deployerSeed, provider);
  const onChain = new OnChainCalls(ownerSigner, deployment);

  console.log("usdc balance of the deployer %o", await onChain.getUSDCBalance())
  console.log("bank balance of the deployer %o", bnToBaseStr(await onChain.getUserBankBalance()))

  const usdcAmount = 10000
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

