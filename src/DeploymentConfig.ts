import { config } from "dotenv";
import { toBigNumberStr } from "./library";
import * as Networks from "../networks.json";
import { Network, DeploymentConfig } from "./interfaces";
import { processTradingStartTime } from "./helpers";

config({ path: ".env" });
export const market = process.env.MARKET;

export const network = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(Networks as any)[process.env.DEPLOY_ON as any],
    name: process.env.DEPLOY_ON
} as Network;

export const packageName = "bluefin_foundation";


export const DeploymentConfigs: DeploymentConfig = {
    filePath: "./deployment.json", // Todo will create separate files for separate networks
    network: network,
    deployer: process.env.DEPLOYER_SEED || "",
    markets: [
        {
            symbol: "ETH-PERP",
            quoteAssetSymbol: "USDC",
            quoteAssetName: "Circle USD",
            baseAssetSymbol: "ETH",
            baseAssetName: "Ethereum",
            defaultLeverage: "3000000000",
            minOrderPrice: toBigNumberStr(0.1),
            maxOrderPrice: toBigNumberStr(100000),
            tickSize: toBigNumberStr(0.001),
            minTradeQty: toBigNumberStr(0.01),
            maxTradeQtyLimit: toBigNumberStr(100000),
            maxTradeQtyMarket: toBigNumberStr(1000),
            stepSize: toBigNumberStr(0.01),
            mtbLong: toBigNumberStr(0.2),
            mtbShort: toBigNumberStr(0.2),
            maxAllowedOIOpen: [
                toBigNumberStr(5000000),
                toBigNumberStr(5000000),
                toBigNumberStr(2500000),
                toBigNumberStr(2500000),
                toBigNumberStr(1000000),
                toBigNumberStr(1000000),
                toBigNumberStr(250000),
                toBigNumberStr(250000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000)
            ],
            initialMarginReq: toBigNumberStr(0.045),
            maintenanceMarginReq: toBigNumberStr(0.03),
            defaultMakerFee: toBigNumberStr(0.0015),
            defaultTakerFee: toBigNumberStr(0.0055),
            maxFundingRate: toBigNumberStr(0.001),
            maxAllowedPriceDiffInOP: toBigNumberStr(1),
            insurancePoolRatio: toBigNumberStr(0.3),
            insurancePool:
                "0x90c55f2a388a0e31ebca93cbf87fdd08e9716be082ca8a3c479bb14bcb5e1b88",
            feePool: "0x05ada716962dec8788b53ddad34827ffe46acfe16bfe9d7d064838fcda285073",
            tradingStartTime: processTradingStartTime(0, process.env.ENV)
        },
        {
            symbol: "BTC-PERP",
            quoteAssetSymbol: "USDC",
            quoteAssetName: "Circle USD",
            baseAssetSymbol: "BTC",
            baseAssetName: "Bitcoin",
            defaultLeverage: "3000000000",
            minOrderPrice: toBigNumberStr(0.1),
            maxOrderPrice: toBigNumberStr(100000),
            tickSize: toBigNumberStr(0.001),
            minTradeQty: toBigNumberStr(0.01),
            maxTradeQtyLimit: toBigNumberStr(100000),
            maxTradeQtyMarket: toBigNumberStr(1000),
            stepSize: toBigNumberStr(0.01),
            mtbLong: toBigNumberStr(0.2),
            mtbShort: toBigNumberStr(0.2),
            maxAllowedOIOpen: [
                toBigNumberStr(5000000),
                toBigNumberStr(5000000),
                toBigNumberStr(2500000),
                toBigNumberStr(2500000),
                toBigNumberStr(1000000),
                toBigNumberStr(1000000),
                toBigNumberStr(250000),
                toBigNumberStr(250000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000),
                toBigNumberStr(200000)
            ],
            initialMarginReq: toBigNumberStr(0.045),
            maintenanceMarginReq: toBigNumberStr(0.03),
            defaultMakerFee: toBigNumberStr(0.0015),
            defaultTakerFee: toBigNumberStr(0.0055),
            maxAllowedPriceDiffInOP: toBigNumberStr(1),
            maxFundingRate: toBigNumberStr(0.001),
            insurancePoolRatio: toBigNumberStr(0.3),
            insurancePool:
                "0x90c55f2a388a0e31ebca93cbf87fdd08e9716be082ca8a3c479bb14bcb5e1b88",
            feePool: "0x05ada716962dec8788b53ddad34827ffe46acfe16bfe9d7d064838fcda285073",
            tradingStartTime: processTradingStartTime(0, process.env.ENV)
        }
    ]
};
