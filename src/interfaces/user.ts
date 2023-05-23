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

export interface Coin {
    coinType: string;
    coinObjectId: string;
    version: string;
    digest: string;
    balance: number;
    lockedUntilEpoch: boolean;
    previousTransaction: string;
}
