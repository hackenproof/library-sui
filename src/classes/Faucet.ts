import { network } from "../DeploymentConfig";
import { USDC_BASE_DECIMALS } from "../constants";
import { toBigNumberStr } from "../library";
import { OnChainCalls } from "./OnChainCalls";
import { Transaction } from "./Transaction";
import { address, Coin } from "../types";
import { getCoinWithAmount } from "../helpers";
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

        // get USDC balance of owner
        const ownerBalance = await onChain.getUSDCBalance();

        // mint coins for owner
        if (amt > ownerBalance) {
            await Faucet.mintUSDC(onChain, 1_000_000_000);
        }

        const  coins = await onChain.getUSDCCoins({ address: ownerAddress });

        const coin = getCoinWithAmount(coins.data, amt);

        // transferring from owners usdc coin to receiver in external bank
        await onChain.depositToExternalBank({
            coinID: coin?.coinObjectId,
            amount: toBigNumberStr(amt, USDC_BASE_DECIMALS),
            accountAddress: address,
            gasBudget: 5_000_000
        });
        
        // updating destination balance in internal bank
        await onChain.depositToInternalBank({
            amount:toBigNumberStr(amt), 
            srcAddress:ownerAddress,
            destAddress:address
        });

    }


    static async mintUSDC(onChain: OnChainCalls, amount:number, dest?:address): Promise<Coin[]>{

        const destination = dest || await onChain.signer.getAddress();
    
        let coins = { data: [] };
        while (coins.data.length == 0) {
            const tx = await onChain.mintUSDC({
                amount: toBigNumberStr(amount, USDC_BASE_DECIMALS),
                to: destination
            });

            if(Transaction.getStatus(tx) == "failure"){
                throw("Error minting USDC");
            }

            coins = await onChain.getUSDCCoins({ address: destination });
        }
    
        return coins.data as Coin[];
    }

}
