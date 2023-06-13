import { JsonRpcProvider, Keypair, RawSigner } from "@mysten/sui.js";
import { Client } from "./classes";
import { wallet } from "./interfaces";
import { getKeyPairFromSeed, getSignerFromSeed } from "./utils";

export let TEST_WALLETS: wallet[] = [];

async function loadWallets() {
    const value = await import("./accounts.json");
    TEST_WALLETS = value.default;
}

loadWallets().then(() => {
    console.log("test wallets loaded");
}).catch(console.error);

export interface Account {
    signer: RawSigner;
    keyPair: Keypair;
    address: string;
    bankAccountId?: string;
}

export interface MakerTakerAccounts {
    maker: Account;
    taker: Account;
}

export function getTestAccounts(provider: JsonRpcProvider): Account[] {
    const accounts: Account[] = [];

    for (const wallet of TEST_WALLETS) {
        accounts.push({
            signer: getSignerFromSeed(wallet.phrase, provider),
            keyPair: getKeyPairFromSeed(wallet.phrase),
            address: wallet.address
        });
    }
    return accounts;
}

export function getMakerTakerAccounts(
    provider: JsonRpcProvider,
    createNew = false
): MakerTakerAccounts {
    if (createNew) {
        return {
            maker: createAccount(provider),
            taker: createAccount(provider)
        };
    } else {
        return {
            maker: {
                signer: getSignerFromSeed(TEST_WALLETS[0].phrase, provider),
                keyPair: getKeyPairFromSeed(TEST_WALLETS[0].phrase),
                address: TEST_WALLETS[0].address
            },
            taker: {
                signer: getSignerFromSeed(TEST_WALLETS[1].phrase, provider),
                keyPair: getKeyPairFromSeed(TEST_WALLETS[1].phrase),
                address: TEST_WALLETS[1].address
            }
        };
    }
}

export function createAccount(provider: JsonRpcProvider): Account {
    const wallet = Client.createWallet();
    return {
        signer: getSignerFromSeed(wallet.phrase, provider),
        keyPair: getKeyPairFromSeed(wallet.phrase),
        address: wallet.address
    };
}
