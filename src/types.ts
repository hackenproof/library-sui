/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import BigNumber from "bignumber.js";
import { Secp256k1Keypair, Secp256k1PublicKey } from "@mysten/sui.js/keypairs/secp256k1";
import { Ed25519Keypair, Ed25519PublicKey } from "@mysten/sui.js/keypairs/ed25519";
import { Secp256r1Keypair, Secp256r1PublicKey } from "@mysten/sui.js/keypairs/secp256r1";
import { WalletContextState, SuiProvider } from "@suiet/wallet-kit";

import { TransactionBlock } from "@mysten/sui.js/transactions";

import {
    SuiTransactionBlockResponse,
    DryRunTransactionBlockResponse,
    OwnedObjectRef
} from "@mysten/sui.js/client";

import { Keypair } from "@mysten/sui.js/cryptography";

import { SuiClient } from "@mysten/sui.js/client";
import { SignatureScheme } from "@mysten/sui.js/cryptography";
import { Socket } from "socket.io-client";

import { DefaultEventsMap } from "@socket.io/component-emitter";
import { getZkLoginSignature } from "@mysten/zklogin";

export type BigNumberable = BigNumber | number | string;
export type SignedNumber = {
    sign: boolean;
    value: string;
};

export type SuiAddress = string;
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
    SuiClient,
    Keypair,
    BigNumber,
    SuiTransactionBlockResponse,
    DryRunTransactionBlockResponse,
    TransactionBlock,
    OwnedObjectRef,
    Ed25519Keypair,
    Secp256k1Keypair,
    Secp256r1Keypair,
    Ed25519PublicKey,
    Secp256k1PublicKey,
    Secp256r1PublicKey,
    SignatureScheme,
    WalletContextState,
    SuiProvider
};

export type SigPK = {
    signature: string;
    publicKey?: string;
    publicAddress?: string;
};

export type PartialZkLoginSignature = Omit<
    Parameters<typeof getZkLoginSignature>["0"]["inputs"],
    "addressSeed"
>;
