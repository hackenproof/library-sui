import { SIGNER_TYPES, TIME_IN_FORCE } from "../src/enums";
import { StoredOrder, ZkPayload } from "../src/interfaces";
import { toBigNumber, bigNumber } from "./library";
import { Order } from "../src/interfaces";
import { DEFAULT } from "./defaults";
import { config } from "dotenv";
import { network } from "./DeploymentConfig";
import { publicKeyFromRawBytes } from "@mysten/sui.js/verify";
import { toB64, fromB64 } from "@mysten/bcs";

import { parseSerializedSignature } from "@mysten/sui.js/cryptography";
import fs from "fs";
import {
    Ed25519Keypair,
    Keypair,
    Secp256k1Keypair,
    SigPK,
    SignatureScheme,
    SuiClient
} from "./types";
import { SerializedSignature } from "@mysten/sui.js/cryptography";
import { getZkLoginSignature, genAddressSeed } from "@mysten/zklogin";

config({ path: ".env" });

export function writeFile(filePath: string, jsonData: any) {
    fs.writeFileSync(filePath, JSON.stringify(jsonData));
}

export function readFile(filePath: string): any {
    return fs.existsSync(filePath)
        ? JSON.parse(fs.readFileSync(filePath).toString())
        : {};
}

export function getProvider(rpcURL: string): SuiClient {
    return new SuiClient({ url: rpcURL });
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
        case "ZkLogin":
            return Ed25519Keypair.fromSecretKey(fromB64(key));
        default:
            throw new Error("Provided key is invalid");
    }
}

export function getSignerFromSeed(
    seed: string,
    scheme: SignatureScheme = "Secp256k1"
): Keypair {
    return getKeyPairFromSeed(seed, scheme);
}

export const verifyZkAddress = (signature, userAddress) => {
    const parsedSignature = parseSerializedSignature(signature);
    return parsedSignature.zkLogin.address === userAddress;
};

export const verifyZkPublicKey = ({ signature, publicKey }) => {
    const { zkLogin } = parseSerializedSignature(signature);
    const userSignature = toB64(zkLogin.userSignature as any);
    const { publicKey: signaturePublicKey, signatureScheme } =
        parseSerializedSignature(userSignature);
    return (
        publicKeyFromRawBytes(signatureScheme, signaturePublicKey).toBase64() ===
        publicKey
    );
};

export const decodeZkSignature = (decodedSignature: string) => {
    const PUBLIC_KEY_LENGTH = 44;
    const SCHEME_LENGTH = 1;
    const SIGNATURE_LENGTH = decodedSignature.length - PUBLIC_KEY_LENGTH - SCHEME_LENGTH;
    const signature = decodedSignature.slice(0, SIGNATURE_LENGTH);
    const scheme = decodedSignature.slice(
        SIGNATURE_LENGTH,
        SIGNATURE_LENGTH + SCHEME_LENGTH
    );
    const publicKey = decodedSignature.slice(-PUBLIC_KEY_LENGTH);
    return {
        zkSignature: Buffer.from(signature, "hex").toString("utf-8"),
        publicKey,
        scheme
    };
};

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

export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (min - max) + min); // The maximum is exclusive and the minimum is inclusive
}

export function getSalt(): number {
    return (
        Date.now() +
        getRandomInt(0, 1_000_000) +
        getRandomInt(0, 1_000_000) +
        getRandomInt(0, 1_000_000)
    );
}

export const createZkSignature = ({
    userSignature,
    zkPayload
}: {
    userSignature: string;
    zkPayload: ZkPayload;
}) => {
    const { salt, decodedJWT, proof, maxEpoch } = zkPayload;
    const addressSeed: string = genAddressSeed(
        BigInt(salt!),
        "sub",
        decodedJWT.sub,
        decodedJWT.aud
    ).toString();

    const zkLoginSignature: SerializedSignature = getZkLoginSignature({
        inputs: {
            ...proof,
            addressSeed
        },
        maxEpoch: maxEpoch,
        userSignature
    });

    return zkLoginSignature;
};

export const parseAndShapeSignedData = ({
    signature,
    isParsingRequired = true
}: {
    signature: string;
    isParsingRequired?: boolean;
}): SigPK => {
    let data: SigPK;
    const parsedSignature = parseSerializedSignature(signature);
    if (isParsingRequired && parsedSignature.signatureScheme === "ZkLogin") {
        //zk login signature
        const { userSignature } = parsedSignature.zkLogin;

        //convert user sig to b64
        const convertedUserSignature = toB64(userSignature as any);

        //reparse b64 converted user sig
        const parsedUserSignature = parseSerializedSignature(convertedUserSignature);

        data = {
            signature:
                Buffer.from(parsedSignature.serializedSignature).toString("hex") + "3",
            publicKey: publicKeyFromRawBytes(
                parsedUserSignature.signatureScheme,
                parsedUserSignature.publicKey
            ).toBase64()
        };
    } else {
        data = {
            signature:
                Buffer.from(parsedSignature.signature).toString("hex") +
                SIGNER_TYPES.UI_ED25519,
            publicKey: publicKeyFromRawBytes(
                parsedSignature.signatureScheme,
                parsedSignature.publicKey
            ).toBase64()
        };
    }

    return data;
};
