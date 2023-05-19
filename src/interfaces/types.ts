import { JsonRpcProvider } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

import { Socket } from "socket.io-client";
import { DefaultEventsMap } from "@socket.io/component-emitter";

export type address = string;
export type TypedSignature = string;
export type Provider = JsonRpcProvider;
export type BigNumberable = BigNumber | number | string;
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
export type SignedNumber = {
    sign: boolean;
    value: string;
};
