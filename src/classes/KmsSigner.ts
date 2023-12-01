import {
    GetPublicKeyCommand,
    KMSClient,
    MessageType,
    SignCommand,
    SigningAlgorithmSpec
} from "@aws-sdk/client-kms";
import { PublicKey, SignatureScheme } from "@mysten/sui.js/cryptography";
import EthCrypto from "eth-crypto";
import { secp256k1 } from "@noble/curves/secp256k1";
import * as asn1 from "asn1.js";
import { Secp256k1PublicKey } from "../types";
import { Signer } from "@mysten/sui.js/cryptography";

// Definition of EcdsaPubKey
const EcdsaPubKey = asn1.define("EcdsaPubKey", function (this: any) {
    // https://tools.ietf.org/html/rfc5480#section-2
    this.seq().obj(
        this.key("algo")
            .seq()
            .obj(this.key("algorithm").objid(), this.key("parameters").objid()),
        this.key("pubKey").bitstr()
    );
});

export class KmsSigner extends Signer {
    private KmsClient: KMSClient;
    private publicKey: Secp256k1PublicKey;
    private compressedPublicKey: Uint8Array;

    constructor(
        private kmsKeyId: string,
        options?: {
            region: string;
            accessKeyId?: string;
            sessionToken?: string;
            secretAccessKey?: string;
        }
    ) {
        super();
        const params: any = {};

        if (options?.region) {
            params.region = options?.region;
        }

        if (options?.accessKeyId || options?.secretAccessKey || options?.sessionToken) {
            params.credentials = {
                accessKeyId: options?.accessKeyId,
                secretAccessKey: options?.secretAccessKey,
                sessionToken: options?.sessionToken
            };
        }

        this.KmsClient = new KMSClient(params);
    }

    private async loadPublicKey() {
        if (this.publicKey) {
            return this.publicKey;
        }

        const params = {
            KeyId: this.kmsKeyId
        };
        const command = new GetPublicKeyCommand(params);
        const pkFullRaw = await this.KmsClient.send(command);
        const pkRaw = pkFullRaw.PublicKey!;
        const res = EcdsaPubKey.decode(Buffer.from(pkRaw), "der");
        const kmsPKCompressed = EthCrypto.publicKey.compress(res.pubKey.data);
        this.compressedPublicKey = new Uint8Array(Buffer.from(kmsPKCompressed, "hex"));
        this.publicKey = new Secp256k1PublicKey(this.compressedPublicKey);
        return this.getPublicKey;
    }

    async init() {
        await this.loadPublicKey();
    }

    assertInitialized(throwError = true) {
        if (this.publicKey) {
            return true;
        }
        if (throwError) {
            throw new Error(
                "KMS signer not initialized, call init() and wait for promise to resolve"
            );
        }
        return false;
    }

    getPublicKey(): PublicKey {
        this.assertInitialized();
        return this.publicKey;
    }

    signData(_: Uint8Array): Uint8Array {
        throw new Error(
            "KMS signer doesn't implement sync signData method, please use sign method"
        );
    }

    async sign(data: Uint8Array): Promise<Uint8Array> {
        await this.init();
        const input = {
            KeyId: this.kmsKeyId,
            Message: data,
            SigningAlgorithm: SigningAlgorithmSpec.ECDSA_SHA_256,
            MessageType: MessageType.RAW
        };
        const command = new SignCommand(input);
        const response = await this.KmsClient.send(command);
        const sigDER = response.Signature;
        const sigRS = secp256k1.Signature.fromDER(Buffer.from(sigDER).toString("hex"));
        const sig = sigRS.toCompactHex();
        return Uint8Array.from(Buffer.from(sig, "hex"));
    }

    getKeyScheme(): SignatureScheme {
        return "Secp256k1";
    }
}

export async function getSignerFromKmsId(
    kmsId: string,
    options?: {
        region: string;
        accessKeyId?: string;
        sessionToken?: string;
        secretAccessKey?: string;
    }
) {
    const signer = new KmsSigner(kmsId, options);
    await signer.init();
    return signer;
}
