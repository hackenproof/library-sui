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

export enum MARKET_SYMBOLS {
    BTC = "BTC-PERP",
    ETH = "ETH-PERP",
    DOT = "DOT-PERP",
    GLMR = "GLMR-PERP",
    MOVR = "MOVR-PERP",
    SOL = "SOL-PERP"
}
export enum ORDER_STATUS {
    PENDING = "PENDING",
    OPEN = "OPEN",
    PARTIAL_FILLED = "PARTIAL_FILLED",
    FILLED = "FILLED",
    CANCELLING = "CANCELLING",
    CANCELLED = "CANCELLED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED",
    STAND_BY_PENDING = "STAND_BY_PENDING",
    STAND_BY = "STAND_BY"
}

export enum CANCEL_REASON {
    UNDERCOLLATERALIZED = "UNDERCOLLATERALIZED",
    INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
    USER_CANCELLED = "USER_CANCELLED",
    EXCEEDS_MARKET_BOUND = "EXCEEDS_MARKET_BOUND",
    COULD_NOT_FILL = "COULD_NOT_FILL",
    EXPIRED = "EXPIRED",
    USER_CANCELLED_ON_CHAIN = "USER_CANCELLED_ON_CHAIN",
    SYSTEM_CANCELLED = "SYSTEM_CANCELLED",
    SELF_TRADE = "SELF_TRADE",
    POST_ONLY_FAIL = "POST_ONLY_FAIL",
    FAILED = "FAILED",
    NETWORK_DOWN = "NETWORK_DOWN"
}

export enum NETWORK_NAME {
    sui = "sui"
}

export enum MARKET_STATUS {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    TRADES_INACTIVE = "TRADES_INACTIVE"
}
export enum SOCKET_EVENTS {
    GET_LAST_KLINE_WITH_INTERVAL = "{symbol}@kline@{interval}",
    GLOBAL_UPDATES_ROOM = "globalUpdates",
    ORDERBOOK_DEPTH_STREAM_ROOM = "orderbookDepthStream",
    GlobalUpdatesRoom = "globalUpdates",
    MarketDataUpdateKey = "MarketDataUpdate",
    RecentTradesKey = "RecentTrades",
    OrderbookUpdateKey = "OrderbookUpdate",
    OrderbookDepthUpdateKey = "OrderbookDepthUpdate",
    AdjustMarginKey = "AdjustMargin",
    MarketHealthKey = "MarketHealth",
    ExchangeHealthKey = "ExchangeHealth",
    TickerUpdate = "TickerUpdate",
    OraclePriceUpdate = "OraclePriceUpdate",
    MarketStateUpdate = "MarketStateUpdate",
    MarketStatusUpdate = "MarketStatusUpdate",
    Market24hrChangeUpdate = "Market24hrChangeUpdate",
    FundingRateUpdated = "FundingRateUpdated",
    NetworkGasFeeUpdate = "NetworkGasFeeUpdate",
    UserUpdatesRoom = "userUpdates",
    OrderUpdateKey = "OrderUpdate",
    OrderCancelledKey = "OrderCancelled",
    PositionUpdateKey = "PositionUpdate",
    UserTradeKey = "UserTrade",
    UserTransaction = "UserTransaction",
    AccountDataUpdateKey = "AccountDataUpdate",
    UserFundingUpdate = "UserFundingUpdate",
    UserTransferUpdate = "UserTransferUpdate",
    AccountPermissionUpdate = "AccountPermissionUpdate",
    RpcUrlResolved = "RpcUrlResolved",
    OrderSentForSettlementUpdate = "OrderSettlementUpdate",
    OrderRequeueUpdate = "OrderRequeueUpdate",
    OrderCancelledOnReversionUpdate = "OrderCancelledOnReversionUpdate"
}
export enum ADJUST_MARGIN {
    Add = "Add",
    Remove = "Remove"
}

export enum SIGNER_TYPES {
    KP_SECP256 = "0",
    KP_ED25519 = "1",
    UI_ED25519 = "2"
}
