import {
    bcs,
    fromSerializedSignature,
    IntentScope,
    Keypair,
    messageWithIntent
} from "@mysten/sui.js";
import { Order, SignedOrder } from "../interfaces/order";
import { base64ToUint8, bnToHex, encodeOrderFlags, hexToBuffer } from "../library";
import { sha256 } from "@noble/hashes/sha256";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";
import { WalletContextState } from "@suiet/wallet-kit";
import { blake2b } from "@noble/hashes/blake2b";
import { SigPK } from "../types";
import { SIGNER_TYPES } from "../enums";

export class OrderSigner {
    constructor(private keypair: Keypair) {}

    public getSignedOrder(order: Order, keyPair?: Keypair): SignedOrder {
        const typedSignature = this.signOrder(order, keyPair);
        return {
            ...order,
            typedSignature
        };
    }

    signOrder(order: Order, keyPair?: Keypair): string {
        const signer = keyPair || this.keypair;

        let signature: string;

        // serialize order
        const msgData = new TextEncoder().encode(OrderSigner.getSerializedOrder(order));
        // take sha256 hash of order
        const msgHash = sha256(msgData);

        const keyScheme = signer.getKeyScheme();
        if (keyScheme == "Secp256k1") {
            // sign the raw data
            signature =
                Buffer.from(signer.signData(msgData)).toString("hex") +
                SIGNER_TYPES.KP_SECP256;
        } else if (keyScheme == "ED25519") {
            // in case of ed25519 we sign the hashed msg
            signature =
                Buffer.from(signer.signData(msgHash)).toString("hex") +
                SIGNER_TYPES.KP_ED25519;
        } else {
            throw "Invalid wallet type";
        }

        return signature;
    }

    /**
     * Signs the order using the provided wallet context
     * @param order order to be signed
     * @param wallet wallet context
     * @returns signature and public key
     */
    static async signOrderUsingWallet(
        order: Order,
        wallet: WalletContextState
    ): Promise<SigPK> {
        // serialize order
        const msgData = new TextEncoder().encode(OrderSigner.getSerializedOrder(order));

        // take sha256 hash of order
        const msgHash = sha256(msgData);

        // sign data
        const sigOutput = await wallet.signMessage({ message: msgHash });

        // segregate public key from signature
        const sigPublicKey = fromSerializedSignature(sigOutput.signature);

        // return signature in hex - appending 2 at the end so that when verifying off-chain and on-chain
        // we know that this sig was generated using sui ui wallet
        return {
            signature:
                Buffer.from(sigPublicKey.signature).toString("hex") +
                SIGNER_TYPES.UI_ED25519,
            publicKey: sigPublicKey.pubKey.toString()
        };
    }

    /**
     * Verifies if the given signature is correct or not using the raw order
     * @param order the order used to create the signature
     * @param signature the generated signature in hex string
     * @param publicKey signer's public key in base64 str
     * @returns True if the signature is valid
     */
    public static verifySignatureUsingOrder(
        order: Order,
        signature: string,
        publicKey: string
    ) {
        const serializedOrder = OrderSigner.getSerializedOrder(order);
        const encodedOrder = new TextEncoder().encode(serializedOrder);
        const orderHash = sha256(encodedOrder);

        // if last index of string is zero, the signature is generated using secp wallet
        const char = signature.slice(-1);
        if (char == "0") {
            // remove last character/index from signture
            signature = signature.slice(0, -1);
            const sig_r_s = secp256k1.Signature.fromCompact(signature);
            const sig_r_s_b1 = sig_r_s.addRecoveryBit(0x1);
            const recovered_pk_1 = sig_r_s_b1
                .recoverPublicKey(orderHash)
                .toRawBytes(true)
                .toString();

            const sig_r_s_b0 = sig_r_s.addRecoveryBit(0x0);
            const recovered_pk_0 = sig_r_s_b0
                .recoverPublicKey(orderHash)
                .toRawBytes(true)
                .toString();

            const pkBytes = base64ToUint8(publicKey);
            return (
                pkBytes.toString() === recovered_pk_1 ||
                pkBytes.toString() === recovered_pk_0
            );
        }
        // last index 1 implies ed25519 wallet
        else if (char == "1") {
            // remove last character/index from signture
            signature = signature.slice(0, -1);
            const pkBytes = base64ToUint8(publicKey);
            return ed25519.verify(signature, orderHash, pkBytes);
        }

        // last index 1 implies ed25519 wallet
        else if (char == "2") {
            // remove last character/index from signture
            signature = signature.slice(0, -1);
            const pkBytes = base64ToUint8(publicKey);

            const intentMsg = messageWithIntent(
                IntentScope.PersonalMessage,
                bcs.ser(["vector", "u8"], orderHash).toBytes()
            );
            const signedData = blake2b(intentMsg, { dkLen: 32 });

            return ed25519.verify(signature, signedData, pkBytes);
        }
    }

    public static getSerializedOrder(order: Order): string {
        // encode order flags
        const orderFlags = encodeOrderFlags(order);

        const buffer = Buffer.alloc(144);
        buffer.set(hexToBuffer(bnToHex(order.price)), 0);
        buffer.set(hexToBuffer(bnToHex(order.quantity)), 16);
        buffer.set(hexToBuffer(bnToHex(order.leverage)), 32);
        buffer.set(hexToBuffer(bnToHex(order.salt)), 48);
        buffer.set(hexToBuffer(bnToHex(order.expiration, 16)), 64);
        buffer.set(hexToBuffer(order.maker), 72);
        buffer.set(hexToBuffer(order.market), 104);
        buffer.set(hexToBuffer(bnToHex(orderFlags, 2)), 136);
        buffer.set(Buffer.from("Bluefin", "utf8"), 137);

        return buffer.toString("hex");
    }

    public static getOrderHash(order: Order | string): string {
        // if serialized order is not provided
        if (typeof order !== "string") {
            order = OrderSigner.getSerializedOrder(order);
        }
        const hash = sha256(hexToBuffer(order));
        return Buffer.from(hash).toString("hex");
    }

    public getPublicKeyStr(keypair?: Keypair) {
        const signer = keypair || this.keypair;
        return signer.getPublicKey().toString();
    }
}
