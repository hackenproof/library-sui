import {
    RawSigner,
    Keypair,
    JsonRpcProvider,
    Secp256k1Keypair,
    SignatureScheme,
    Ed25519Keypair,
    Connection
} from "@mysten/sui.js";
import { TIME_IN_FORCE } from "../src/enums";
import { StoredOrder } from "../src/interfaces";
import { toBigNumber, bigNumber } from "./library";
import { Order } from "../src/interfaces";
import { DEFAULT } from "./defaults";
import { config } from "dotenv";
import { network } from "./DeploymentConfig";
import fs from "fs";
config({ path: ".env" });

export function writeFile(filePath: string, jsonData: any) {
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
}

export function readFile(filePath: string): any {
    return fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath).toString())
        : {};
}

export function getProvider(rpcURL: string, faucetURL?: string): JsonRpcProvider {
    return new JsonRpcProvider(new Connection({ fullnode: rpcURL, faucet: faucetURL }));
}

export function getKeyPairFromSeed(
    seed: string,
    scheme: SignatureScheme = "Secp256k1"
): Keypair {
    switch (scheme) {
        case "ED25519":
            return Ed25519Keypair.deriveKeypair(seed);
        case "Secp256k1":
            return Secp256k1Keypair.deriveKeypair(seed);
        default:
            throw new Error("Provided scheme is invalid");
    }
}

export function getKeyPairFromPvtKey(
    key: string,
    scheme: SignatureScheme = "Secp256k1"
): Keypair {
    if (key.startsWith("0x")) {
        key = key.substring(2); // Remove the first two characters (0x)
    }
    switch (scheme) {
        case "ED25519":
            return Ed25519Keypair.fromSecretKey(Buffer.from(key, "hex"));
        case "Secp256k1":
            return Secp256k1Keypair.fromSecretKey(Buffer.from(key, "hex"));
        default:
            throw new Error("Provided key is invalid");
    }
}

export function getSignerFromKeyPair(
    keypair: Keypair,
    provider: JsonRpcProvider
): RawSigner {
    return new RawSigner(keypair, provider);
}

export function getSignerFromSeed(
    seed: string,
    provider: JsonRpcProvider,
    scheme: SignatureScheme = "Secp256k1"
): RawSigner {
    return getSignerFromKeyPair(getKeyPairFromSeed(seed, scheme), provider);
}

export function createOrder(params?: {
    market?: string;
    maker?: string;
    isBuy?: boolean;
    price?: number;
    quantity?: number;
    leverage?: number;
    reduceOnly?: boolean;
    postOnly?: boolean;
    ioc?: boolean;
    orderbookOnly?: boolean;
    expiration?: number;
    salt?: number;
}): Order {
    return {
        market: params?.market || DEFAULT.ORDER.market,
        maker: params?.maker || DEFAULT.ORDER.maker,
        isBuy: params?.isBuy == true,
        reduceOnly: params?.reduceOnly == true,
        postOnly: params?.postOnly == true,
        orderbookOnly: params?.orderbookOnly == undefined ? true : params.orderbookOnly,
        ioc: params?.ioc == true,
        price: params?.price ? toBigNumber(params.price) : DEFAULT.ORDER.price,
        quantity: params?.quantity
            ? toBigNumber(params.quantity)
            : DEFAULT.ORDER.quantity,
        leverage: params?.leverage
            ? toBigNumber(params?.leverage)
            : DEFAULT.ORDER.leverage,
        expiration: params?.expiration
            ? bigNumber(params?.expiration)
            : DEFAULT.ORDER.expiration,
        salt: params?.salt ? bigNumber(params?.salt) : bigNumber(Date.now())
    } as Order;
}

export function printOrder(order: Order) {
    console.log(
        "\norder.maker:",
        order.maker,
        "\norder.market:",
        order.market,
        "\norder.isBuy:",
        order.isBuy,
        "\norder.reduceOnly:",
        order.reduceOnly,
        "\norder.postOnly:",
        order.postOnly,
        "\norder.orderbookOnly:",
        order.orderbookOnly,
        "\norder.ioc:",
        order.ioc,
        "\norder.price:",
        order.price.toFixed(0),
        "\norder.quantity:",
        order.quantity.toFixed(0),
        "\norder.leverage:",
        order.leverage.toFixed(0),
        "\norder.expiration:",
        order.expiration.toFixed(0),
        "\norder.salt:",
        order.salt.toFixed(0)
    );
}

/**
 * Consumes an order of type StoredOrder and returns a SuiOrder that can be sent to on-chain for settlement
 * @param order StoredOrder to be transformed
 * @param perpetualID market/perpetual address
 * @param orderbookOnly (optional) true by default as all orders going through our exchange have orderbook only true
 */
export function storedOrderToSui(
    order: StoredOrder,
    perpetualID: string,
    orderbookOnly = true
): Order {
    return {
        market: perpetualID,
        maker: order.maker,
        isBuy: order.isBuy,
        reduceOnly: order.reduceOnly,
        postOnly: order.postOnly,
        orderbookOnly,
        ioc: order.timeInForce == TIME_IN_FORCE.IMMEDIATE_OR_CANCEL,
        quantity: order.amount,
        price: order.price,
        leverage: order.leverage,
        expiration: bigNumber(order.expiration),
        salt: bigNumber(order.salt)
    };
}

export async function requestGas(address: string) {
    const url = network.faucet;
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
