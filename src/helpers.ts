import { randomInt } from "crypto";
import { USDC_BASE_DECIMALS } from "./constants";
import { toBigNumberStr } from "./library";
import { Coin } from "./types";

export function processTradingStartTime(
    tradingStartTime: number | string,
    env: string
): number {
    const threshold = 60000; // threshold is set to 1 min as contracts take this much time to deploy
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

export function getCoinWithAmount(coins:Coin[], amount:number): Coin | undefined{
    
    const amountBN = Number(toBigNumberStr(amount, USDC_BASE_DECIMALS));

    for(const coin of coins){
        if(Number(coin.balance) > amountBN){
            return coin;
        }
    }

    return undefined
}

export function randomString():string{
    return (Math.random() + 1).toString(36).substring(2)
}

export function randomSalt():number{
    return randomInt(1_000_000_000) + randomInt(1_000_000_000) + randomInt(1_000_000_000);
}

