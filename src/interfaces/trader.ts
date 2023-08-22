import BigNumber from "bignumber.js";
import { Order } from "./order";

export interface TradeData {
    makerOrder: Order;
    makerSignature: string;
    makerPublicKey: string;
    takerOrder: Order;
    takerSignature: string;
    takerPublicKey: string;
    fillQuantity: BigNumber;
    fillPrice: BigNumber;
}
