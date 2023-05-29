export enum OBJECT_OWNERSHIP_STATUS {
    "IMMUTABLE" = "Immutable",
    "OWNED" = "Owned",
    "SHARED" = "Shared"
}


export enum ORDER_TYPE {
    LIMIT = "LIMIT",
    MARKET = "MARKET",
    STOP_LIMIT = "STOP_LIMIT",
    STOP_MARKET = "STOP_MARKET"
}

export enum ORDER_SIDE {
    BUY = "BUY",
    SELL = "SELL"
}

export enum TIME_IN_FORCE {
    IMMEDIATE_OR_CANCEL = "IOC",
    GOOD_TILL_TIME = "GTT"
}

export enum MARGIN_TYPE {
    ISOLATED = "ISOLATED",
    CROSS = "CROSS" // atm exchange only supports isolated margin
}
