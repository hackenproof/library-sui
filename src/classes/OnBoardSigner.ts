import * as secp from "@noble/secp256k1";
import { RawSigner, Secp256k1PublicKey } from "@mysten/sui.js";
import { sha256 } from "@noble/hashes/sha256";
import { hexToBuffer } from "../library";

export class OnboardingSigner {
    /**
     * Creates hash of given message and signs it with given private key or web3 provider
     * @param message string to be sign
     * @param signer RawSigner
     * @returns signature
     */
    public static async createOnboardSignature(
        message: string,
        signer: RawSigner
    ): Promise<string> {
        if (!signer) {
            throw Error(`Invalid signer`);
        }
        const msgHash = sha256(hexToBuffer(message));
        const signedMsg = await signer.signMessage({ message: msgHash });
        return signedMsg.signature;
    }

    /**
     * Recovers user address from the signature and compares it with given public address
     * @param address public address of user
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
