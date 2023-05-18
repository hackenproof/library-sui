import { DeploymentConfigs } from "../src/DeploymentConfig";
import { readFile, getProvider, getSignerFromSeed, createOrder } from "../src/utils";
import { OnChainCalls } from "../src/classes/OnChainCalls";
import { getMakerTakerAccounts, getTestAccounts } from "../tests/helpers/accounts";
import { OrderSigner, Trader, Transaction } from "../src";
import { mintAndDeposit } from "../tests/helpers/utils";
import { toBigNumberStr } from "../src/library";
import { expectTxToSucceed } from "../tests/helpers/expect";

const deployment = readFile(DeploymentConfigs.filePath);

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);

const accounts = getMakerTakerAccounts(provider, true);

const ownerSigner = getSignerFromSeed(DeploymentConfigs.deployer, provider);

const onChain = new OnChainCalls(ownerSigner, deployment);

const signer = new OrderSigner(accounts.maker.keyPair);

async function main() {
    // Note: Assumes that the deployer is admin, as only admin can make a
    // settlement operator
    // make admin of the exchange settlement operator
    const tx1 = await onChain.createSettlementOperator({
        operator: await ownerSigner.getAddress()
    });
    const settlementCapID = Transaction.getCreatedObjectIDs(tx1)[0];

    // Note: Assuming deployer is already price oracle operator
    // make admin of the exchange price oracle operator
    // const tx2 = await onChain.setPriceOracleOperator({
    //     operator: await ownerSigner.getAddress()
    // });
    // const updateOPCapID = Transaction.getCreatedObjectIDs(tx2)[0];

    // mint and deposit USDC to test accounts
    await mintAndDeposit(onChain, accounts.maker.address);
    await mintAndDeposit(onChain, accounts.taker.address);

    // set specific price on oracle
    const tx3 = await onChain.updateOraclePrice({
        price: toBigNumberStr(1800)
    });
    expectTxToSucceed(tx3);

    // create an order for ETH market
    const order = createOrder({
        maker: accounts.maker.address,
        market: onChain.getPerpetualID("ETH-PERP"),
        isBuy: true,
        price: 1800,
        leverage: 1,
        quantity: 0.1
    });

    const tradeData = await Trader.setupNormalTrade(
        provider,
        signer,
        accounts.maker.keyPair,
        accounts.taker.keyPair,
        order
    );

    const tx = await onChain.trade({
        ...tradeData,
        settlementCapID,
        gasBudget: 400000000
    });

    const status = Transaction.getStatus(tx);
    console.log("Status:", status);

    if (status == "failure") {
        console.log("Error:", Transaction.getError(tx));
    }
}

main();
