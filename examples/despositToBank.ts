import { 
  OnChainCalls,
  readFile, 
  getSignerFromSeed, 
  getProvider, 
  DeploymentConfig, 
  Transaction,
  toBigNumberStr } from "../src";


async function main() {

  const recepients = [
    "0x4efb09f3b6d7fd7846065d0aaec68a9a2e9cc26d646bad07a27cbd4007f040bc",
    "0x81e70f6338aee7adaf76e4b91ebfb796c06a518c8f042f8e7f5f8df9fad310f7",
    "0x574dc40c65bedb89189b4fd0a28f36662b6907927a26e8f9edf4eae6317fb95e",
    "0x9b6dd05d876537f7aae91da4999e648f345f119ea354670a10cbd7719aaa8b65",
    "0x9e19dacca1adbe753d195e7a5b1318f87f244cabc907156dbdee33f41b2bafd5",
    "0x46590c3753c585d1ec14337ce20b79e0f1568c047695ea5984f0120c69268e9d",
    "0xd58fa2a3aca4d0083a17c4021a0b52cc42bd3b81389792dc088f1f2a61bd045f",
    "0x331ac99092385eef4b7b21119d7e7768b19f64bf64f046665c61719cedcb5b4b",
    "0x0adb709d5387a02378f40753c0f103551b79d6dda6a534bed984dad38373ad89",
    "0xa93cdb37766eafa62f547b0321f0860ae440b70c4c8bc9cab194c0e1b9ebb003",
    "0x56426d7a809c67b923086143f9412aecce09d34f23344d7bb9aa6cb76caafa83",
    "0xc43dfa921e11ad6a2692b972675e5add4d7297a7ad12df29d3e60205a511165f",
    "0x5e7d815c72df63888d6cae1c6e7955e95a4283bfea3d35b912f033b420c15f9d",
    "0x5d8cae539723b413177fcdb874b9029b1f0a23ea6a0e857286a796b610c6f325",
    "0xe837f46d52e616dc3e314a6db691e12514b4e9b9b5b3a9d1e4e3b98af09b9c20",
  ]

  const deployment = readFile("./examples/deployment.prod.json") as DeploymentConfig;
  const provider = getProvider(
    "https://api.shinami.com/node/v1/sui_mainnet_d09fb8dc5751e0428497b4a9e33dc268",
  );
  const deployerSeed = "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis"
  const ownerSigner = getSignerFromSeed(deployerSeed, provider);
  const onChain = new OnChainCalls(ownerSigner, deployment);
  // coin object holding tons of fake USDC
  const tusdcCoinID = "0x51fbd9e2ac987f0c9589c17e2b129442517d57b080dc6c1642f84efdb6d896ff"


  for(const recepientAddress of recepients) {
    const txResult = await onChain.depositToBank(
      {
          coinID: tusdcCoinID,
          amount: toBigNumberStr("1000", 6),
          accountAddress: recepientAddress
      },
      ownerSigner
    );
    const bankBalanceUpdateEvent = Transaction.getEvents(
        txResult,
        "BankBalanceUpdate"
    )[0];
    console.log(bankBalanceUpdateEvent);
  }
}

main()

