import { JsonRpcProvider, Keypair, RawSigner } from "@mysten/sui.js";
import { wallet } from "./interfaces";
import { getKeyPairFromSeed, getSignerFromSeed } from "./utils";

export const TEST_WALLETS: wallet[] = [
    {
        phrase: "trim bicycle fit ticket penalty basket window tunnel insane orange virtual tennis",
        address: "0x80c3d285c2fe5ccacd1a2fbc1fc757cbeab5134f1ef1e97803fe653e041c88aa"
    },
    {
        phrase: "trim basket bicycle fit ticket penalty window tunnel insane orange virtual tennis",
        address: "0x2183df5aaf6366e5445c95fa238fc223dbbda54b7c363680578b435f657f1a29"
    },
    {
        phrase: "trim basket bicycle ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0xed2bb2ae1330a3abee7794e659add176b827e13532b31074ad01330df2d5c843"
    },
    {
        phrase: "trim basket bicycle ticket penalty window tunnel fit insane orange tennis virtual",
        address: "0x7f1c6310bb9224dc18e2e9943979b25250e38bf450b0c685e6242da4e083a657"
    },
    {
        phrase: "trim bicycle basket ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0x49387e35ea98b0866ca7eced5dca8d6ca47124a4eaf815f54c7083afcb3ea980"
    },
    {
        phrase: "bicycle trim basket ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0x01b51fb67313ae92f57418bc16aebd6134a6f39c388a77092cfdc4c639863d68"
    },
    {
        phrase: "basket trim bicycle ticket penalty window tunnel fit insane orange virtual tennis",
        address: "0xced4404d440912889b1e7484773fc10a8174d56baf260a6879eba29eb72df55a"
    },
    {
        phrase: "penalty bicycle basket ticket trim window tunnel fit insane orange virtual tennis",
        address: "0x8ca4d4d7d5adcbd77423852bc2c868c57893a470699e7a6e13aa45d15014fc2d"
    }
];

export interface Account {
    signer: RawSigner;
    keyPair: Keypair;
    address: string;
    bankAccountId?: string;
}

export interface MakerTakerAccounts {
    maker: Account;
    taker: Account;
}

export function getTestAccounts(provider: JsonRpcProvider): Account[] {
    const accounts: Account[] = [];

    for (const wallet of TEST_WALLETS) {
        accounts.push({
            signer: getSignerFromSeed(wallet.phrase, provider),
            keyPair: getKeyPairFromSeed(wallet.phrase),
            address: wallet.address
        });
    }
    return accounts;
}

export function processTradingStartTime(
    tradingStartTime: number | string,
    env: string
): number {
    const threshold = 180000; // threshold is set to 3 min as contracts take this much time to deploy
    const ms_in_an_hour = 3600 * 1000;

    if (env == "DEV") {
        return tradingStartTime == 0 || tradingStartTime == ""
            ? Math.floor(Date.now()) + threshold
            : Number(tradingStartTime);
    } else {
        if (tradingStartTime == 0 || tradingStartTime == "") {
            const nextPossibleHourTime =
                Math.floor(Math.floor(Date.now()) / ms_in_an_hour) * ms_in_an_hour +
                ms_in_an_hour;
            // check for corner cases
            if (nextPossibleHourTime - Math.floor(Date.now()) > threshold) {
                return nextPossibleHourTime;
            } else {
                return nextPossibleHourTime + 3600000;
            }
        } else {
            if (
                Number(tradingStartTime) % ms_in_an_hour == 0 &&
                Number(tradingStartTime) > Math.floor(Date.now())
            ) {
                return Number(tradingStartTime);
            } else {
                throw "tradingStartTime must be in hourly units/future time";
            }
        }
    }
}
