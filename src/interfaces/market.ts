export interface MarketDetails {
    // perpetual naming details
    symbol?: string;
    quoteAssetSymbol?: string;
    quoteAssetName?: string;
    baseAssetSymbol?: string;
    baseAssetName?: string;

    // default user leverage
    defaultLeverage?: string;

    // min price at which asset can be traded
    minOrderPrice?: string;
    // max price at which asset can be traded
    maxOrderPrice?: string;
    // the smallest decimal unit supported by asset for price
    tickSize?: string;
    // minimum quantity of asset that can be traded
    minTradeQty?: string;
    // maximum quantity of asset that can be traded for limit order
    maxTradeQtyLimit?: string;
    // maximum quantity of asset that can be traded for market order
    maxTradeQtyMarket?: string;
    // the smallest decimal unit supported by asset for quantity
    stepSize?: string;
    //  market take bound for long side ( 10% == 100000000000000000)
    mtbLong?: string;
    //  market take bound for short side ( 10% == 100000000000000000)
    mtbShort?: string;
    // array of maxAllowed values for leverage (0 index will contain dummy value, later indexes will represent leverage)
    maxAllowedOIOpen?: string[];
    // imr: the initial margin collateralization percentage
    initialMarginReq?: string;
    // mmr: the minimum collateralization percentage
    maintenanceMarginReq?: string;
    // default maker order fee for this Perpetual
    defaultMakerFee?: string;
    // default taker order fee for this Perpetual
    defaultTakerFee?: string;
    // maximum allowed difference in consecutive Oracle Price updates
    maxAllowedPriceDiffInOP?: string;
    // max allowed funding rate
    maxFundingRate?: string;
    // portion of liquidation premium to be transferred to insurance pool
    insurancePoolRatio?: string;
    // address of insurance pool
    insurancePool?: string;
    // address of fee pool
    feePool?: string;
    // time at which trading will start on perpetual
    tradingStartTime?: number;
}

export interface PerpCreationMarketDetails extends MarketDetails {
    adminID?: string;
}
