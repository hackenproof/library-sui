import { SuiAddress } from "@mysten/sui.js";
import BigNumber from "bignumber.js";
import { ORDER_TYPE, TIME_IN_FORCE } from "../enums";

export interface Order {
    market: SuiAddress;
    maker: SuiAddress;
    isBuy: boolean;
    reduceOnly: boolean;
    postOnly: boolean;
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
    maker: string;
    expiration: number;
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
