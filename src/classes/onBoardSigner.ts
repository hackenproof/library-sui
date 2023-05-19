import * as secp from "@noble/secp256k1";
import { Secp256k1PublicKey, RawSigner } from "@mysten/sui.js";
import { sha256 } from "@noble/hashes/sha256";
import { hexToBuffer } from "../library";

export class OnboardingSigner {
    /**
     * Creates hash of given message and signs it with given private key or web3 provider
     * @param message string to be sign
     * @param pKey user's private key
     * @param _provider provider HttpProvider | IpcProvider | WebsocketProvider | AbstractProvider | string
     * @returns signature
     */
    public static async createOnboardSignature(
        message: string,
        signer: RawSigner
    ): Promise<string> {
        const messagehash = sha256(hexToBuffer(message));
        const sign = await signer.signMessage({
            message: messagehash
        });
        return sign.signature;
    }

    /**
     * Recovers user address from the signature and compares it with given public address
     * @param signer public address of user
     * @param message message to be signed
     * @param signature
     * @returns
     */
    public static verifyOnboardSignature(
        address: string,
        message: string,
        signature: string
    ): boolean {
        const signatureWithR = hexToBuffer(signature);
        if (signatureWithR.length == 65) {
            const sig = signatureWithR.subarray(0, 64);
            const rByte = signatureWithR[64];
            const hash = hexToBuffer(message);

            const publicKey = secp.recoverPublicKey(hash, sig, rByte, true);

            const secp256k1PK = new Secp256k1PublicKey(publicKey);

            return secp256k1PK.toSuiAddress() === address;
        }
        return false;
    }
}
