import { OnChainCalls, Order, OrderSigner } from "../src";
import { expect } from "./helpers";
import { KmsSigner, getSignerFromKmsId } from "../src/classes/KmsSigner";
import BigNumber from "bignumber.js";
import { SuiClient } from "../src/types";

// requires kms disabling it for ci
describe.skip("KMS Signer", () => {
    const kmsKeyId = "292068e1-c4df-4d21-9183-3907b10aa7c1";
    const client = new SuiClient({
        url: "http://127.0.0.1:9000"
    });

    const secpKP = new KmsSigner(kmsKeyId, {
        region: "us-east-1",
        accessKeyId: "test",
        secretAccessKey: "test"
    });

    const orderSigner = new OrderSigner(secpKP);

    const order: Order = {
        expiration: new BigNumber(Date.now()),
        ioc: true,
        market: "0xf170979b8de5be94eb9c3325ab111c782d9fef176b7e22a947abc789a03f4abd",
        maker: "0xf170979b8de5be94eb9c3325ab111c782d9fef176b7e22a947abc789a03f4abd",
        isBuy: true,
        reduceOnly: true,
        postOnly: false,
        cancelOnRevert: false,
        orderbookOnly: false,
        quantity: new BigNumber("0.02"),
        price: new BigNumber("0.02"),
        leverage: new BigNumber("0.02"),
        salt: new BigNumber("0.02")
    };

    it("should verify payload signature generated KMS wallet", async () => {
        await secpKP.init();

        const sign = await orderSigner.signOrder(order);

        expect(
            OrderSigner.verifySignatureUsingOrder(order, sign.signature, sign.publicKey)
        ).to.equal(true);
    });

    it("should be able to call move method via KMS signer", async () => {
        await secpKP.init();

        console.log("Public sui address", secpKP.getPublicKey().toSuiAddress());

        const signer = await getSignerFromKmsId(kmsKeyId, {
            region: "us-east-1",
            accessKeyId: "test",
            secretAccessKey: "test"
        });
        const caller = new OnChainCalls(
            signer,
            {
                objects: {
                    package: {
                        id: "0x741efa5acfa5f0f61fe42af5a828922e2025e5940be3af020e4a0f2665063596"
                    },
                    TreasuryCap: {
                        id: "0x445603b552c09fb6cdbd88d7c06002e9ecf20e8814842ae5aa6e1fc4e2fa1af1"
                    }
                }
            },
            client
        );
        const result = await caller.mintUSDC(
            {
                amount: "1",
                to: "0x8eee79102ce9bb0888eb385f20bc3298c61f8009a32117a68f73308e82a06726"
            },
            signer
        );
        expect(result).to.not.undefined;
    });
});
