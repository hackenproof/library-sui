/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import BigNumber from "bignumber.js";

import {
    JsonRpcProvider,
    Keypair,
    RawSigner,
    SuiTransactionBlockResponse,
    TransactionBlock,
    OwnedObjectRef,
    getSuiObjectData
} from "@mysten/sui.js";

import { Socket } from "socket.io-client";

import { DefaultEventsMap } from "@socket.io/component-emitter";

export type BigNumberable = BigNumber | number | string;
export type SignedNumber = {
    sign: boolean;
    value: string;
};

export type address = string;
export type TypedSignature = string;
export type MarketSymbol = string;
export type Interval =
    | "1m"
    | "3m"
    | "5m"
    | "15m"
    | "30m"
    | "1h"
    | "2h"
    | "4h"
    | "6h"
    | "8h"
    | "12h"
    | "1d"
    | "3d"
    | "1w"
    | "1M";

export type SocketInstance = Socket<DefaultEventsMap, DefaultEventsMap>;

export type MinifiedCandleStick = [
    number, // Open time
    string, // Open price
    string, // High price
    string, // Low price
    string, // Close price
    string, // Volume
    number, // Close time
    string, // Quote asset volume
    number, // Number of trades
    string, // Taker buy base asset volume
    string, // Taker buy quote asset volume
    string // Symbol
];

export type DAPIKlineResponse = Array<MinifiedCandleStick>;

export {
    JsonRpcProvider,
    Keypair,
    RawSigner,
    BigNumber,
    SuiTransactionBlockResponse,
    TransactionBlock,
    OwnedObjectRef,
    getSuiObjectData
};

export type SigPK = {
    signature: string;
    publicKey: string;
};



export type Coin = {
    coinObjectId: string;
    coinType: string;
    version: string;
    balance: string;
    previousTransaction: string;
    digest: string;
}
