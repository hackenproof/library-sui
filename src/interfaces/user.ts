import { SuiAddress } from "@mysten/sui.js";
import BigNumber from "bignumber.js";

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
    address: SuiAddress,
    phrase: string,
    privateKey:string,
    capID: SuiAddress
}