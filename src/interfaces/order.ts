import BigNumber from "bignumber.js";
import { ORDER_TYPE, TIME_IN_FORCE } from "../enums";
import { PartialZkLoginSignature, SuiAddress } from "../types";

export interface Order {
    market: SuiAddress;
    maker: SuiAddress;
    isBuy: boolean;
    reduceOnly: boolean;
    postOnly: boolean;
    cancelOnRevert?: boolean;
    orderbookOnly: boolean;
    ioc: boolean;
    quantity: BigNumber;
    price: BigNumber;
    leverage: BigNumber;
    expiration: BigNumber;
    salt: BigNumber;
}

export interface StoredOrder {
    // identification
    hash: string;
    // needed by order matching engine
    orderType: ORDER_TYPE;
    isBuy: boolean;
    price: BigNumber;
    amount: BigNumber;
    amountLeft: BigNumber;
    triggerPrice: BigNumber;
    leverage: BigNumber;

    maker: string;
    expiration: number;
    salt: number;
    timeInForce: TIME_IN_FORCE;
    postOnly: boolean;
    reduceOnly: boolean;
    cancelOnRevert: boolean;
    // needed by settlement engine
    typedSignature: string;
    byteCode: string;
    groupId?: number;

    // flag indicating if the order was open at any
    // point in its lifetime on orderbook
    // undefined/false implies the order is never opened
    // on orderbook
    open?: boolean;
}

export interface OrderFlags {
    isBuy: boolean;
    reduceOnly: boolean;
    postOnly: boolean;
    orderbookOnly: boolean;
    ioc: boolean;
}

export interface SignedOrder extends Order {
    typedSignature: string;
}

export interface DecodeJWT {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    nonce: string;
    nbf: number;
    iat: number;
    exp: number;
    jti: string;
    email: string;
}

export interface ZkPayload {
    decodedJWT: DecodeJWT;
    salt: string;
    proof: PartialZkLoginSignature;
    maxEpoch: number;
}
