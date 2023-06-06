import { network } from "../DeploymentConfig";
import { USDC_BASE_DECIMALS } from "../constants";
import { toBigNumberStr } from "../library";
import { OnChainCalls } from "./OnChainCalls";
import { Transaction } from "./Transaction";

export class Faucet {
    /**
     * Requests SUI token from faucet running on Sui Node
     * @param address address of the account that will get the SUI tokens
     * @param faucetURL (optional) url of sui faucet, by default reads from deployment config
     * @returns false if not successful else response from faucet
     */
    static async requestSUI(address: string, faucetURL?: string) {
        const url = faucetURL || network.faucet;
        try {
            const data = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    FixedAmountRequest: {
                        recipient: address
                    }
                })
            });
            return data;
        } catch (e: any) {
            console.log("Error while requesting gas", e.message);
        }
        return false;
    }

    /**
     * Requests USDC tokens from faucet
     * @param address address of the USDC receiver
     * @param onChain onChainCalls class instance. The signer must own the treasury cap
     * @param amount The amount of USDC requested (must be in base form)
     * @returns {status, error} of transaction
     */
    static async requestUSDC(
        address: string,
        onChain: OnChainCalls,
        amount?: number | string
    ) {
        const tx = await onChain.mintUSDC({
            amount: toBigNumberStr(amount || 10_000, USDC_BASE_DECIMALS),
            to: address,
            gasBudget: 500000
        });
        const status = Transaction.getStatus(tx);
        const error = Transaction.getError(tx);
        return { status, error };
    }

    /**
     * Requests margin in margin bank of the provided address
     * @param address address of the margin receiver
     * @param onChain onChainCalls class instance. The signer must own the treasury cap
     * @param amount The amount of margin requested (must be in base form)
     * @returns
     */
    static async requestMargin(
        address: string,
        onChain: OnChainCalls,
        amount?: number | string
    ) {
        const amt = Number(amount) || 10_000;
        const ownerAddress = await onChain.signer.getAddress();

        let coin = undefined;
        // TODO figure out why `onChain.getUSDCCoins` calls returns no coin
        // until then use while
        while (coin == undefined) {
            // get USDC balance of owner
            const ownerBalance = await onChain.getUSDCBalance();

            // mint coins for owner
            if (amt > ownerBalance) {
                await onChain.mintUSDC({
                    amount: toBigNumberStr(1_000_000_000, USDC_BASE_DECIMALS)
                });
            }

            // TODO: implement a method to get the coin with balance > amt
            // assuming 0th index coin will have balance > amount
            const usdcCoins = await onChain.getUSDCCoins({ address: ownerAddress });
            coin = usdcCoins.data.pop();
        }

        // transferring from owners usdc coin to receiver
        const tx = await onChain.depositToBank({
            coinID: coin.coinObjectId,
            amount: toBigNumberStr(amt, USDC_BASE_DECIMALS),
            accountAddress: address
        });

        const status = Transaction.getStatus(tx);
        const error = Transaction.getError(tx);
        return { status, error };
    }
}
