import BigNumber from "bignumber.js";
import { BaseWallet, SuiAddress, SuiClient, TransactionBlock } from "../types";

export interface wallet {
    address: string;
    phrase: string;
}

export interface UserPosition {
    isPosPositive: boolean;
    qPos: string;
    margin: string;
    mro: string;
    oiOpen: string;
}

export interface UserPositionExtended extends UserPosition {
    perpID: string;
    user: string;
}

export interface BankAccountDetails {
    address: string;
    balance: BigNumber;
}

export interface Operator {
    address: SuiAddress;
    phrase: string;
    privateKey: string;
    capID: SuiAddress;
}

export interface ExtendedWalletContextState
extends Omit<BaseWallet, "signMessage"> 
{
    wallet: BaseWallet;
    provider: SuiClient;
    signData: (data: Uint8Array) => Promise<string>;
    getAddress: () => string | undefined;
    signMessage: (
    data: Uint8Array
    ) => Promise<{ messageBytes: string; signature: string }>;
    signTransactionBlock: (
        data: TransactionBlock
        ) => Promise<{ transactionBlockBytes: string; signature: string;}>;
}