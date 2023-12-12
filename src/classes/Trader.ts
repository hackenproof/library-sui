import BigNumber from "bignumber.js";
import { Order, TradeData } from "../interfaces";
import { Signer } from "@mysten/sui.js/cryptography";
import { OrderSigner } from "./OrderSigner";

export class Trader {
    static async setupNormalTrade(
        orderSigner: OrderSigner,
        maker: Signer,
        taker: Signer,
        makerOrder: Order,
        options?: {
            takerOrder?: Order;
            quantity?: BigNumber;
            price?: BigNumber;
        }
    ): Promise<TradeData> {
        const takerAddress = await taker.getPublicKey().toSuiAddress();

        const takerOrder = options?.takerOrder || {
            ...makerOrder,
            maker: takerAddress,
            isBuy: !makerOrder.isBuy,
            postOnly: false
        };

        const makerSigPK = await orderSigner.signOrder(makerOrder, maker);
        const takerSigPK = await orderSigner.signOrder(takerOrder, taker);

        return {
            makerOrder,
            makerSignature: makerSigPK.signature,
            makerPublicKey: makerSigPK.publicKey,
            takerOrder,
            takerSignature: takerSigPK.signature,
            takerPublicKey: takerSigPK.publicKey,
            fillQuantity:
                options?.quantity ||
                BigNumber.min(makerOrder.quantity, takerOrder.quantity),
            fillPrice: options?.price || makerOrder.price
        } as TradeData;
    }
}
