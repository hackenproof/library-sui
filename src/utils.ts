import path from "path";

import {
    RawSigner,
    Keypair,
    JsonRpcProvider,
    getSuiObjectData,
    SuiTransactionBlockResponse,
    OwnedObjectRef,
    Secp256k1Keypair,
    SignatureScheme,
    Ed25519Keypair,
    Connection
} from "@mysten/sui.js";
import { OBJECT_OWNERSHIP_STATUS, TIME_IN_FORCE } from "../src/enums";
import {
    DeploymentData,
    DeploymentObjectMap,
    DeploymentObjects,
    MarketDeploymentData,
    StoredOrder
} from "../src/interfaces";
import { toBigNumber, bigNumber } from "./library";
import { Order } from "../src/interfaces";
import { DEFAULT } from "./defaults";
import { config } from "dotenv";
import { Client, OnChainCalls, Transaction } from "./classes";
import { network, packageName } from "./DeploymentConfig";
import { MarketDetails } from "./interfaces/market";

import { execSync } from "child_process";
import fs from "fs";
config({ path: ".env" });

export function execCommand(command: string) {
    return execSync(command, { encoding: "utf-8" });
}

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

export function getSignerFromKeyPair(
    keypair: Keypair,
    provider: JsonRpcProvider
): RawSigner {
    return new RawSigner(keypair, provider);
}

export function getSignerFromSeed(seed: string, provider: JsonRpcProvider): RawSigner {
    return getSignerFromKeyPair(getKeyPairFromSeed(seed), provider);
}

export async function getGenesisMap(
    provider: JsonRpcProvider,
    txResponse: SuiTransactionBlockResponse
): Promise<DeploymentObjectMap> {
    const map: DeploymentObjectMap = {};

    const createdObjects = (txResponse as any).effects.created as OwnedObjectRef[];

    // iterate over each object
    for (const itr in createdObjects) {
        const obj = createdObjects[itr];

        // get object id
        const id = obj.reference.objectId;

        const suiObjectResponse = await provider.getObject({
            id: obj.reference.objectId,
            options: { showType: true, showOwner: true, showContent: true }
        });

        const objDetails = getSuiObjectData(suiObjectResponse);

        // get object type
        const objectType = objDetails?.type as string;
        // get object owner
        const owner =
            objDetails?.owner == OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                ? OBJECT_OWNERSHIP_STATUS.IMMUTABLE
                : Object.keys(objDetails?.owner as any).indexOf("Shared") >= 0
                ? OBJECT_OWNERSHIP_STATUS.SHARED
                : OBJECT_OWNERSHIP_STATUS.OWNED;

        // get data type
        let dataType = "package";

        if (objectType.indexOf("TreasuryCap") > 0) {
            dataType = "TreasuryCap";
        } else if (objectType.indexOf("TUSDC") > 0) {
            dataType = "Currency";
        } else if (objectType.lastIndexOf("::") > 0) {
            dataType = objectType.slice(objectType.lastIndexOf("::") + 2);
        }

        if (dataType.endsWith(">") && dataType.indexOf("<") == -1) {
            dataType = dataType.slice(0, dataType.length - 1);
        }
        map[dataType] = {
            id,
            owner,
            dataType: dataType
        };
    }

    // if the test currency was deployed, update its data type
    if (map["Currency"]) {
        map["Currency"].dataType = map["package"].id + "::tusdc::TUSDC";
    }

    return map;
}

export async function publishPackage(
    usingCLI = false,
    deployer: RawSigner | undefined = undefined
): Promise<SuiTransactionBlockResponse> {
    const pkgPath = `"${path.join(process.cwd(), `/${packageName}`)}"`;
    if (usingCLI) {
        return Client.publishPackage(pkgPath);
    } else {
        return Client.publishPackageUsingSDK(deployer as RawSigner, pkgPath);
    }
}

export async function createMarket(
    deployment: DeploymentData,
    deployer: RawSigner,
    provider: JsonRpcProvider,
    marketConfig?: MarketDetails
): Promise<DeploymentObjectMap> {
    const onChain = new OnChainCalls(deployer, deployment);
    const txResult = await onChain.createPerpetual({ ...marketConfig });
    const error = Transaction.getError(txResult);
    if (error) {
        console.error(`Error while deploying market: ${error}`);
        process.exit(1);
    }

    const map = await getGenesisMap(provider, txResult);

    // getting positions table id
    const perpDetails = await provider.getObject({
        id: map["Perpetual"]["id"],
        options: {
            showContent: true
        }
    });

    map["PositionsTable"] = {
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        id: (perpDetails.data as any).content.fields.positions.fields.id.id,
        dataType: (perpDetails.data as any).content.fields.positions.type
    };

    return map;
}

export async function getBankTable(
    provider: JsonRpcProvider,
    objects: DeploymentObjectMap
): Promise<DeploymentObjects> {
    // get bank details
    const bankDetails = await provider.getObject({
        id: objects["Bank"]["id"],
        options: {
            showContent: true
        }
    });

    return {
        owner: OBJECT_OWNERSHIP_STATUS.SHARED,
        id: (bankDetails.data as any).content.fields.accounts.fields.id.id,
        dataType: (bankDetails.data as any).content.fields.accounts.type
    };
}

export function getPrivateKey(keypair: Keypair) {
    return (keypair as any).keypair.secretKey;
}

export function packDeploymentData(
    deployer: string,
    objects: DeploymentObjectMap,
    markets?: MarketDeploymentData
): DeploymentData {
    return {
        deployer,
        objects,
        markets: markets || ({} as any)
    };
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
