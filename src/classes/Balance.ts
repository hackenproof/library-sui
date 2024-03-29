import BigNumber from "bignumber.js";
import { UserPosition, UserPositionExtended } from "../interfaces";
import { toBaseNumber } from "../library";
import {
    BASE_DECIMALS_ON_CHAIN,
    BIGNUMBER_BASE,
    BIGNUMBER_BASE_ON_CHAIN
} from "../constants";
import { BigNumberable } from "../types";
export class Balance {
    public mro: BigNumber;

    public qPos: BigNumber;

    public margin: BigNumber;

    public oiOpen: BigNumber;

    public isPosPositive: boolean;

    constructor(
        mro: BigNumberable,
        qPos: BigNumberable,
        margin: BigNumberable,
        oiOpen: BigNumberable,
        isPosPositive: boolean
    ) {
        this.mro = new BigNumber(mro);
        this.qPos = new BigNumber(qPos);
        this.margin = new BigNumber(margin);
        this.oiOpen = new BigNumber(oiOpen);
        this.isPosPositive = isPosPositive;
    }
    public static fromPosition(position: UserPositionExtended | UserPosition) {
        return new Balance(
            position.mro,
            position.qPos,
            position.margin,
            position.oiOpen,
            position.isPosPositive
        );
    }

    public pPos(): BigNumber {
        return this.qPos.gt(0)
            ? this.oiOpen.multipliedBy(BIGNUMBER_BASE_ON_CHAIN).dividedBy(this.qPos)
            : new BigNumber("0");
    }

    public marginRatio(
        price: BigNumber,
        settlementAmount: BigNumber = BigNumber(0)
    ): BigNumber {
        // if no position, margin ratio is one
        if (this.qPos.isEqualTo(0)) return BIGNUMBER_BASE_ON_CHAIN;

        let marginRatio;
        const balance = price.times(this.qPos).dividedBy(BIGNUMBER_BASE_ON_CHAIN);

        if (this.isPosPositive) {
            // long position
            const debt = this.oiOpen.minus(this.margin).minus(settlementAmount);
            const debtRatio = debt.times(BIGNUMBER_BASE_ON_CHAIN).dividedBy(balance); // if this ratio exceeds 1 it means that the exchange is underwater.
            // It must be below 1 - maintenance ratio
            marginRatio = BIGNUMBER_BASE_ON_CHAIN.minus(debtRatio);
        } else {
            // short position
            const debt = this.oiOpen.plus(this.margin).plus(settlementAmount);
            const debtRatio = debt.times(BIGNUMBER_BASE_ON_CHAIN).dividedBy(balance);
            marginRatio = debtRatio.minus(BIGNUMBER_BASE_ON_CHAIN);
        }
        return marginRatio;
    }

    public printPosition() {
        console.log("isPosPositive:", this.isPosPositive);
        console.log("margin:", toBaseNumber(this.margin, 3, BASE_DECIMALS_ON_CHAIN));
        console.log("oiOpen:", toBaseNumber(this.oiOpen, 3, BASE_DECIMALS_ON_CHAIN));
        console.log("qPos:", toBaseNumber(this.qPos, 3, BASE_DECIMALS_ON_CHAIN));
        console.log("mro:", toBaseNumber(this.mro, 3, BASE_DECIMALS_ON_CHAIN));
    }
}
