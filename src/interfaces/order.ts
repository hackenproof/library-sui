import { SuiAddress } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

export interface Order {
    market: SuiAddress;
    maker: SuiAddress;
    isBuy: boolean;
    reduceOnly: boolean;
    postOnly: boolean;
    quantity: BigNumber;
    price: BigNumber;
    leverage: BigNumber;
    expiration: BigNumber;
    salt: BigNumber;
}

export interface SignedOrder extends Order {
    typedSignature: string;
}
export interface OrderQuantityRules {
    low: string;
    high: string;
    value: string;
}

// === used for `firefly-math` library functions ===
export interface PositionMathDTO {
    symbol: string;
    quantity: string;
    avgEntryPrice: string;
    margin: string;
    selectedLeverage: string;
    isPositionPositive: boolean;
}
// === used for `firefly-math` library functions ===
