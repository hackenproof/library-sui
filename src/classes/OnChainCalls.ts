/* eslint-disable no-shadow-restricted-names */
import {
    DryRunTransactionBlockResponse,
    SuiClient,
    SuiObjectResponse,
    SuiTransactionBlockResponseOptions
} from "@mysten/sui.js/client";

import { fromB64, SUI_CLOCK_OBJECT_ID, toB64 } from "@mysten/sui.js/utils";

import { SuiTransactionBlockResponse } from "@mysten/sui.js/client";
import { IntentScope, SignatureWithBytes, Signer } from "@mysten/sui.js/cryptography";
import { sha256 } from "@noble/hashes/sha256";
import BigNumber from "bignumber.js";
import { SUI_NATIVE_BASE, USDC_BASE_DECIMALS } from "../constants";
import { DEFAULT } from "../defaults";
import {
    BankAccountDetails,
    DecodeJWT,
    ExtendedWalletContextState,
    Operator,
    Order,
    PerpCreationMarketDetails,
    UserPosition,
    ZkPayload
} from "../interfaces";
import {
    base64ToUint8,
    bigNumber,
    encodeOrderFlags,
    hexStrToUint8,
    hexToString,
    toBigNumber,
    toBigNumberStr,
    usdcToBaseNumber
} from "../library";
import {
    address,
    BigNumberable,
    Keypair,
    PartialZkLoginSignature,
    TransactionBlock
} from "../types";
import { createZkSignature, getSalt } from "../utils";
import { Transaction } from "./Transaction";

export class OnChainCalls {
    signer: Signer;
    settlementCap: string | undefined;
    deployment: any;
    private suiClient: SuiClient;
    private is_zkLogin: boolean;
    private maxEpoch?: number;
    private proof?: PartialZkLoginSignature;
    private decodedJWT?: DecodeJWT;
    private salt?: string;
    private walletAddress?: string;
    private is_wallet_extension: boolean;

    constructor(
        _signer: Signer,
        _deployment: any,
        suiClient: SuiClient,
        isZkLogin = false,
        zkPayload?: ZkPayload,
        walletAddress?: string,
        is_wallet_extension = false,
        settlementCap?: string
    ) {
        this.signer = _signer;
        this.deployment = _deployment;
        this.is_zkLogin = isZkLogin;
        if (isZkLogin && zkPayload) {
            this.maxEpoch = zkPayload.maxEpoch;
            this.proof = zkPayload.proof;
            this.decodedJWT = zkPayload.decodedJWT;
            this.salt = zkPayload.salt;
        }
        this.walletAddress = walletAddress || _signer.toSuiAddress();
        this.settlementCap = settlementCap;
        this.suiClient = suiClient;
        this.is_wallet_extension = is_wallet_extension;
    }

    public async setExchangeAdmin(
        args: {
            address: string;
            adminID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_exchange_admin",
            callArgs,
            "roles",
            args.gasBudget
        );
    }

    public async setExchangeGuardian(
        args: {
            address: string;
            adminID?: string;
            safeID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_exchange_guardian",
            callArgs,
            "roles",
            args.gasBudget
        );
    }

    public async setFundingRateOperator(
        args: {
            operator: string;
            adminID?: string;
            safeID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.operator);

        return this.signAndCall(
            caller,
            "set_funding_rate_operator_v2",
            callArgs,
            "roles",
            args.gasBudget
        );
    }

    public async createPerpetual(
        args: PerpCreationMarketDetails,
        signer?: Signer,
        gasBudget?: number
    ): Promise<SuiTransactionBlockResponse> {
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());

        callArgs.push(this.getBankID());

        callArgs.push(args.symbol || "ETH-PERP");

        callArgs.push(args.minOrderPrice || toBigNumberStr(0.1));
        callArgs.push(args.maxOrderPrice || toBigNumberStr(100000));
        callArgs.push(args.tickSize || toBigNumberStr(0.001));
        callArgs.push(args.minTradeQty || toBigNumberStr(0.1));

        callArgs.push(args.maxTradeQtyLimit || toBigNumberStr(100000));
        callArgs.push(args.maxTradeQtyMarket || toBigNumberStr(1000));
        callArgs.push(args.stepSize || toBigNumberStr(0.1));
        callArgs.push(args.mtbLong || toBigNumberStr(0.2));
        callArgs.push(args.mtbShort || toBigNumberStr(0.2));
        callArgs.push(
            args.maxAllowedOIOpen || [
                toBigNumberStr(1_000_000), //1x
                toBigNumberStr(1_000_000), //2x
                toBigNumberStr(500_000), //3x
                toBigNumberStr(500_000), //4x
                toBigNumberStr(250_000), //5x
                toBigNumberStr(250_000), //6x
                toBigNumberStr(250_000), //7x
                toBigNumberStr(250_000), //8x
                toBigNumberStr(100_000), //9x
                toBigNumberStr(100_000) //10x
            ]
        );
        callArgs.push(args.initialMarginReq || toBigNumberStr(0.1));
        callArgs.push(args.maintenanceMarginReq || toBigNumberStr(0.05));

        callArgs.push(args.defaultMakerFee || toBigNumberStr(0.001));
        callArgs.push(args.defaultTakerFee || toBigNumberStr(0.0045));

        callArgs.push(args.maxFundingRate || toBigNumberStr(0.001));

        callArgs.push(args.insurancePoolRatio || toBigNumberStr(0.3));

        callArgs.push(
            args.insurancePool ? args.insurancePool : DEFAULT.INSURANCE_POOL_ADDRESS
        );

        callArgs.push(args.feePool ? args.feePool : DEFAULT.FEE_POOL_ADDRESS);

        // time stamp in ms
        callArgs.push(args.tradingStartTime || Date.now());

        //Price Info Feed id converted from Hex String to just string
        callArgs.push(hexToString(args.priceInfoFeedId));

        const caller = signer || this.signer;

        return this.signAndCall(
            caller,
            "create_perpetual",
            callArgs,
            "exchange",
            gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async setMinPrice(
        args: {
            adminID?: string;
            market?: string;
            minPrice: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.minPrice));

        return this.signAndCall(
            caller,
            "set_min_price_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMaxPrice(
        args: {
            adminID?: string;
            market?: string;
            maxPrice: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.maxPrice));

        return this.signAndCall(
            caller,
            "set_max_price_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setStepSize(
        args: {
            adminID?: string;
            market?: string;
            stepSize: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.stepSize));

        return this.signAndCall(
            caller,
            "set_step_size_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setTickSize(
        args: {
            adminID?: string;
            market?: string;
            tickSize: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.tickSize));

        return this.signAndCall(
            caller,
            "set_tick_size_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMTBLong(
        args: {
            adminID?: string;
            market?: string;
            mtbLong: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.mtbLong));

        return this.signAndCall(
            caller,
            "set_mtb_long_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMTBShort(
        args: {
            adminID?: string;
            market?: string;
            mtbShort: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.mtbShort));

        return this.signAndCall(
            caller,
            "set_mtb_short_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMaxQtyLimit(
        args: {
            adminID?: string;
            market?: string;
            maxQtyLimit: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.maxQtyLimit));

        return this.signAndCall(
            caller,
            "set_max_qty_limit_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMaxQtyMarket(
        args: {
            adminID?: string;
            market?: string;
            maxQtyMarket: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.maxQtyMarket));

        return this.signAndCall(
            caller,
            "set_max_qty_market_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMinQty(
        args: {
            adminID?: string;
            market?: string;
            minQty: number;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.minQty));

        return this.signAndCall(
            caller,
            "set_min_qty_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMaxAllowedOIOpen(
        args: {
            adminID?: string;
            market?: string;
            maxLimit: string[];
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.maxLimit);

        return this.signAndCall(
            caller,
            "set_max_oi_open_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMaintenanceMarginRequired(
        args: {
            adminID?: string;
            market?: string;
            mmr: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.mmr);

        return this.signAndCall(
            caller,
            "set_maintenance_margin_required_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setInitialMarginRequired(
        args: {
            adminID?: string;
            market?: string;
            imr: string;
        },
        options?: {
            gasBudget?: number;
            signer?: Signer;
            multiSig?: address;
        }
    ): Promise<SuiTransactionBlockResponse | string> {
        const caller = options?.signer || this.signer;

        const txb = new TransactionBlock();
        const callArgs = [];

        callArgs.push(txb.object(args.adminID || this.getExchangeAdminCap()));
        callArgs.push(txb.object(this.getPerpetualID(args.market)));

        callArgs.push(txb.pure(args.imr));

        if (options?.gasBudget) txb.setGasBudget(options?.gasBudget);

        txb.moveCall({
            arguments: callArgs,
            target: `${this.getPackageID()}::perpetual::set_initial_margin_required_v2`
        });

        // if multi sig call return tx bytes
        if (options?.multiSig) {
            txb.setSender(options?.multiSig);
            return toB64(
                await txb.build({ client: this.suiClient, onlyTransactionKind: false })
            );
        } else {
            return this.executeTxBlock(txb, caller);
        }
    }

    public async createSettlementOperator(
        args: {
            operator: string;
            adminID?: string;
            safeID?: string;
            gasBudget?: number;
        },
        options?: {
            gasBudget?: number;
            signer?: Signer;
            multiSig?: address;
        }
    ) {
        const caller = options?.signer || this.signer;
        const callArgs = [];

        const txb = new TransactionBlock();

        callArgs.push(txb.object(args.adminID || this.getExchangeAdminCap()));
        callArgs.push(txb.object(args.safeID || this.getSafeID()));
        callArgs.push(txb.pure(args.operator));

        if (options?.gasBudget) txb.setGasBudget(options?.gasBudget);

        txb.moveCall({
            arguments: callArgs,
            target: `${this.getPackageID()}::roles::create_settlement_operator`
        });

        // if multi sig call return tx bytes
        if (options?.multiSig) {
            txb.setSender(options?.multiSig);
            return toB64(
                await txb.build({ client: this.suiClient, onlyTransactionKind: false })
            );
        } else {
            return this.executeTxBlock(txb, caller);
        }
    }

    public async removeSettlementOperator(
        args: {
            capID: string;
            adminID?: string;
            safeID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.capID);

        return this.signAndCall(
            caller,
            "remove_settlement_operator",
            callArgs,
            "roles",
            args.gasBudget
        );
    }

    public async setFeePoolAddress(
        args: {
            adminID?: string;
            market?: string;
            address: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_fee_pool_address_v2",
            callArgs,
            "perpetual",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async setInsurancePoolAddress(
        args: {
            adminID?: string;
            market?: string;
            address: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.address);

        return this.signAndCall(
            caller,
            "set_insurance_pool_address_v2",
            callArgs,
            "perpetual",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async setInsurancePoolPercentage(
        args: {
            adminID?: string;
            market?: string;
            percentage: number;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.percentage));

        return this.signAndCall(
            caller,
            "set_insurance_pool_percentage_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setMaxAllowedFundingRate(
        args: {
            adminID?: string;
            market?: string;
            maxFundingRate: number;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.maxFundingRate));

        return this.signAndCall(
            caller,
            "set_max_allowed_funding_rate_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async trade(
        args: {
            makerOrder: Order;
            makerSignature: string;
            makerPublicKey: string;
            takerOrder: Order;
            takerSignature: string;
            takerPublicKey: string;
            settlementCapID?: string;
            fillPrice?: BigNumber;
            fillQuantity?: BigNumber;
            perpID?: string;
            safeID?: string;
            bankID?: string;
            subAccountsMapID?: string;
            gasBudget?: number;
            market?: string;
            txHash?: string;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(SUI_CLOCK_OBJECT_ID);

        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(args.bankID || this.getBankID());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(this.getOrdersTableID());
        callArgs.push(this.getSequencer());

        callArgs.push(args.settlementCapID || this.settlementCap);
        callArgs.push(this.getPriceOracleObjectId(args.market));

        callArgs.push(encodeOrderFlags(args.makerOrder));
        callArgs.push(args.makerOrder.price.toFixed(0));
        callArgs.push(args.makerOrder.quantity.toFixed(0));
        callArgs.push(args.makerOrder.leverage.toFixed(0));
        callArgs.push(args.makerOrder.expiration.toFixed(0));
        callArgs.push(args.makerOrder.salt.toFixed(0));
        callArgs.push(args.makerOrder.maker);
        callArgs.push(Array.from(hexStrToUint8(args.makerSignature)));
        callArgs.push(Array.from(base64ToUint8(args.makerPublicKey)));

        callArgs.push(encodeOrderFlags(args.takerOrder));
        callArgs.push(args.takerOrder.price.toFixed(0));
        callArgs.push(args.takerOrder.quantity.toFixed(0));
        callArgs.push(args.takerOrder.leverage.toFixed(0));
        callArgs.push(args.takerOrder.expiration.toFixed(0));
        callArgs.push(args.takerOrder.salt.toFixed(0));
        callArgs.push(args.takerOrder.maker);
        callArgs.push(Array.from(hexStrToUint8(args.takerSignature)));
        callArgs.push(Array.from(base64ToUint8(args.takerPublicKey)));

        callArgs.push(
            args.fillQuantity
                ? args.fillQuantity.toFixed(0)
                : args.makerOrder.quantity.lte(args.takerOrder.quantity)
                ? args.makerOrder.quantity.toFixed(0)
                : args.takerOrder.quantity.toFixed(0)
        );

        callArgs.push(
            args.fillPrice ? args.fillPrice.toFixed(0) : args.makerOrder.price.toFixed(0)
        );

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "trade",
            callArgs,
            "exchange",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async batchTrade(
        args: {
            makerOrder: Order;
            makerSignature: string;
            makerPublicKey: string;
            takerOrder: Order;
            takerSignature: string;
            takerPublicKey: string;
            settlementCapID?: string;
            fillPrice?: BigNumber;
            fillQuantity?: BigNumber;
            perpID?: string;
            safeID?: string;
            bankID?: string;
            subAccountsMapID?: string;
            market?: string;
            txHash?: string;
        }[],
        options?: {
            gasBudget?: number;
            signer?: Signer;
            transactionBlock?: TransactionBlock;
        }
    ): Promise<SuiTransactionBlockResponse> {
        const caller = options?.signer || this.signer;

        let txBlock = options?.transactionBlock;

        if (!options?.transactionBlock) {
            txBlock = await this.buildBatchTradeTxBlock(args);
        }

        if (options?.gasBudget) txBlock.setGasBudget(options.gasBudget);

        return this.executeTxBlock(txBlock, caller);
    }

    public async buildBatchTradeTxBlock(
        args: {
            makerOrder: Order;
            makerSignature: string;
            makerPublicKey: string;
            takerOrder: Order;
            takerSignature: string;
            takerPublicKey: string;
            settlementCapID?: string;
            fillPrice?: BigNumber;
            fillQuantity?: BigNumber;
            perpID?: string;
            safeID?: string;
            bankID?: string;
            subAccountsMapID?: string;
            market?: string;
            txHash?: string;
        }[],
        gasBudget?: number
    ): Promise<TransactionBlock> {
        const txBlock = new TransactionBlock();

        for (const arg of args) {
            const callArgs = [
                txBlock.object(SUI_CLOCK_OBJECT_ID),
                txBlock.object(arg.perpID || this.getPerpetualID(arg.market)),
                txBlock.object(arg.bankID || this.getBankID()),
                txBlock.object(arg.safeID || this.getSafeID()),
                txBlock.object(arg.subAccountsMapID || this.getSubAccountsID()),
                txBlock.object(this.getOrdersTableID()),
                txBlock.object(this.getSequencer()),
                txBlock.object(arg.settlementCapID || this.settlementCap),

                txBlock.object(this.getPriceOracleObjectId(arg.market)),

                txBlock.pure(encodeOrderFlags(arg.makerOrder)),
                txBlock.pure(arg.makerOrder.price.toFixed(0)),
                txBlock.pure(arg.makerOrder.quantity.toFixed(0)),
                txBlock.pure(arg.makerOrder.leverage.toFixed(0)),
                txBlock.pure(arg.makerOrder.expiration.toFixed(0)),
                txBlock.pure(arg.makerOrder.salt.toFixed(0)),
                txBlock.pure(arg.makerOrder.maker),
                txBlock.pure(Array.from(hexStrToUint8(arg.makerSignature))),
                txBlock.pure(Array.from(base64ToUint8(arg.makerPublicKey))),
                txBlock.pure(encodeOrderFlags(arg.takerOrder)),
                txBlock.pure(arg.takerOrder.price.toFixed(0)),
                txBlock.pure(arg.takerOrder.quantity.toFixed(0)),
                txBlock.pure(arg.takerOrder.leverage.toFixed(0)),
                txBlock.pure(arg.takerOrder.expiration.toFixed(0)),
                txBlock.pure(arg.takerOrder.salt.toFixed(0)),
                txBlock.pure(arg.takerOrder.maker),
                txBlock.pure(Array.from(hexStrToUint8(arg.takerSignature))),
                txBlock.pure(Array.from(base64ToUint8(arg.takerPublicKey))),

                txBlock.pure(
                    arg.fillQuantity
                        ? arg.fillQuantity.toFixed(0)
                        : arg.makerOrder.quantity.lte(arg.takerOrder.quantity)
                        ? arg.makerOrder.quantity.toFixed(0)
                        : arg.takerOrder.quantity.toFixed(0)
                ),

                txBlock.pure(
                    arg.fillPrice
                        ? arg.fillPrice.toFixed(0)
                        : arg.makerOrder.price.toFixed(0)
                )
            ];

            callArgs.push(
                txBlock.pure(
                    arg.txHash ||
                        Buffer.from(
                            sha256(JSON.stringify([...callArgs, getSalt()]))
                        ).toString("hex")
                )
            );

            txBlock.moveCall({
                target: `${this.getPackageID()}::exchange::trade`,
                arguments: callArgs,
                typeArguments: [this.getCurrencyType()]
            });
        }

        if (gasBudget) txBlock.setGasBudget(gasBudget);

        return txBlock;
    }

    public async liquidate(
        args: {
            perpID?: string;
            liquidatee: string;
            quantity: string;
            leverage: string;
            liquidator?: string;
            allOrNothing?: boolean;
            subAccountsMapID?: string;
            gasBudget?: number;
            market?: string;
            txHash?: string;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(SUI_CLOCK_OBJECT_ID);
        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(this.getBankID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(this.getSequencer());
        callArgs.push(this.getPriceOracleObjectId(args.market));

        callArgs.push(args.liquidatee);
        callArgs.push(args.liquidator || caller.toSuiAddress());
        callArgs.push(args.quantity);
        callArgs.push(args.leverage);
        callArgs.push(args.allOrNothing == true);

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "liquidate",
            callArgs,
            "exchange",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async getBatchLiquidationTransactionBlock(
        args: {
            perpID?: string;
            liquidatee: string;
            quantity: string;
            leverage: string;
            liquidator?: string;
            allOrNothing?: boolean;
            subAccountsMapID?: string;
            gasBudget?: number;
            market?: string;
            txHash?: string;
        }[],
        gasBudget?: number,
        signer?: Signer
    ): Promise<TransactionBlock> {
        const caller = signer || this.signer;
        const txBlock = new TransactionBlock();
        for (const arg of args) {
            const callArgs = [
                txBlock.object(SUI_CLOCK_OBJECT_ID),
                txBlock.object(arg.perpID || this.getPerpetualID(arg.market)),
                txBlock.object(this.getBankID()),
                txBlock.object(arg.subAccountsMapID || this.getSubAccountsID()),
                txBlock.object(this.getSequencer()),
                txBlock.object(this.getPriceOracleObjectId(arg.market)),

                txBlock.pure(arg.liquidatee),
                txBlock.pure(arg.liquidator || caller.toSuiAddress()),
                txBlock.pure(arg.quantity),
                txBlock.pure(arg.leverage),
                txBlock.pure(arg.allOrNothing === true)
            ];

            callArgs.push(
                txBlock.pure(
                    arg.txHash ||
                        Buffer.from(
                            sha256(JSON.stringify([...callArgs, getSalt()]))
                        ).toString("hex")
                )
            );

            txBlock.moveCall({
                target: `${this.getPackageID()}::exchange::liquidate`,
                arguments: callArgs,
                typeArguments: [this.getCurrencyType()]
            });
        }
        if (gasBudget) txBlock.setGasBudget(gasBudget);
        return txBlock;
    }

    public async batchLiquidate(
        args: {
            perpID?: string;
            liquidatee: string;
            quantity: string;
            leverage: string;
            liquidator?: string;
            allOrNothing?: boolean;
            subAccountsMapID?: string;
            gasBudget?: number;
            market?: string;
        }[],
        gasBudget?: number,
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;
        const txBlock = await this.getBatchLiquidationTransactionBlock(
            args,
            gasBudget,
            signer
        );
        return this.executeTxBlock(txBlock, caller);
    }

    public async dryRun(
        txBlock: TransactionBlock,
        signer: Signer
    ): Promise<DryRunTransactionBlockResponse> {
        const caller = signer || this.signer;
        txBlock.setSenderIfNotSet(caller.toSuiAddress());
        const builtTransactionBlock = await txBlock.build({
            client: this.suiClient
        });
        return this.suiClient.dryRunTransactionBlock({
            transactionBlock: builtTransactionBlock
        });
    }

    public async deleverage(
        args: {
            maker: string;
            taker: string;
            quantity: string;
            allOrNothing?: boolean;
            perpID?: string;
            deleveragingCapID?: string;
            safeID?: string;
            gasBudget?: number;
            market?: string;
            txHash?: string;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(SUI_CLOCK_OBJECT_ID);
        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(this.getBankID());
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(this.getSequencer());

        callArgs.push(args.deleveragingCapID || this.getDeleveragingCapID());

        callArgs.push(this.getPriceOracleObjectId(args.market));

        callArgs.push(args.maker);
        callArgs.push(args.taker);
        callArgs.push(args.quantity);
        callArgs.push(args.allOrNothing == true);

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "deleverage",
            callArgs,
            "exchange",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async getBatchDeleveragingTransactionBlock(
        args: {
            maker: string;
            taker: string;
            quantity: string;
            allOrNothing?: boolean;
            perpID?: string;
            deleveragingCapID?: string;
            safeID?: string;
            gasBudget?: number;
            market?: string;
            txHash?: string;
        }[],
        gasBudget?: number,
        signer?: Signer
    ): Promise<TransactionBlock> {
        const caller = signer || this.signer;
        const txBlock = new TransactionBlock();
        for (const arg of args) {
            const callArgs = [
                txBlock.object(SUI_CLOCK_OBJECT_ID),
                txBlock.object(arg.perpID || this.getPerpetualID(arg.market)),
                txBlock.object(this.getBankID()),
                txBlock.object(arg.safeID || this.getSafeID()),
                txBlock.object(this.getSequencer()),

                txBlock.object(arg.deleveragingCapID || this.getDeleveragingCapID()),
                txBlock.object(this.getPriceOracleObjectId(arg.market)),

                txBlock.pure(arg.maker),
                txBlock.pure(arg.taker),
                txBlock.pure(arg.quantity),
                txBlock.pure(arg.allOrNothing === true)
            ];

            callArgs.push(
                txBlock.pure(
                    arg.txHash ||
                        Buffer.from(
                            sha256(JSON.stringify([...callArgs, getSalt()]))
                        ).toString("hex")
                )
            );

            txBlock.moveCall({
                target: `${this.getPackageID()}::exchange::deleverage`,
                arguments: callArgs,
                typeArguments: [this.getCurrencyType()]
            });
        }
        if (gasBudget) txBlock.setGasBudget(gasBudget);

        txBlock.setSenderIfNotSet(caller.toSuiAddress());
        return txBlock;
    }

    public async batchDeleverage(
        args: {
            maker: string;
            taker: string;
            quantity: string;
            allOrNothing?: boolean;
            perpID?: string;
            deleveragingCapID?: string;
            safeID?: string;
            gasBudget?: number;
            market?: string;
            txHash?: string;
        }[],
        gasBudget?: number,
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;
        const txBlock = await this.getBatchDeleveragingTransactionBlock(
            args,
            gasBudget,
            signer
        );
        return this.executeTxBlock(txBlock, caller);
    }

    public async addMargin(
        args: {
            amount: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
            market?: string;
            gasBudget?: number;
            txHash?: string;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(this.getBankID());

        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());

        callArgs.push(this.getSequencer());

        callArgs.push(this.getPriceOracleObjectId(args.market));

        callArgs.push(args.account || caller.toSuiAddress());
        callArgs.push(toBigNumberStr(args.amount));

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "add_margin",
            callArgs,
            "exchange",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async removeMargin(
        args: {
            amount: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
            market?: string;
            gasBudget?: number;
            txHash?: string;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(this.getBankID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(this.getSequencer());
        callArgs.push(this.getPriceOracleObjectId(args.market));

        callArgs.push(args.account || caller.toSuiAddress());
        callArgs.push(toBigNumberStr(args.amount));

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "remove_margin",
            callArgs,
            "exchange",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async adjustLeverage(
        args: {
            leverage: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
            market?: string;
            gasBudget?: number;
            txHash?: string;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(this.getBankID());
        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());

        callArgs.push(this.getSequencer());
        callArgs.push(this.getPriceOracleObjectId(args.market));

        callArgs.push(args.account || caller.toSuiAddress());
        callArgs.push(toBigNumberStr(args.leverage));

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "adjust_leverage",
            callArgs,
            "exchange",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async signAdjustLeverage(
        args: {
            leverage: number;
            account?: string;
            perpID?: string;
            subAccountsMapID?: string;
            market?: string;
            gasBudget?: number;
            txHash?: string;
        },
        signer?: Signer
    ): Promise<SignatureWithBytes> {
        const caller = signer || this.signer;

        const txb = new TransactionBlock();
        txb.setSender(caller.toSuiAddress());

        const callArgs = [];

        callArgs.push(txb.object(args.perpID || this.getPerpetualID(args.market)));
        callArgs.push(txb.object(this.getBankID()));
        callArgs.push(txb.object(args.subAccountsMapID || this.getSubAccountsID()));

        callArgs.push(txb.object(this.getSequencer()));
        callArgs.push(txb.object(this.getPriceOracleObjectId(args.market)));

        callArgs.push(txb.pure(args.account || caller.toSuiAddress()));
        callArgs.push(txb.pure(toBigNumberStr(args.leverage)));

        callArgs.push(
            txb.pure(
                args.txHash ||
                    Buffer.from(
                        sha256(JSON.stringify([...callArgs, getSalt()]))
                    ).toString("hex")
            )
        );

        txb.moveCall({
            arguments: callArgs,
            target: `${this.getPackageID()}::exchange::adjust_leverage`,
            typeArguments: [this.getCurrencyType()]
        });

        const bytes = toB64(
            await txb.build({ client: this.suiClient, onlyTransactionKind: false })
        );
        return caller.signWithIntent(fromB64(bytes), IntentScope.TransactionData);
    }

    /**
     * Create signed transaction for whitelisting/removing of the subaccounts on-chain
     */
    public async signUpsertSubAccount(
        args: {
            account?: string;
            accountsToRemove?: Array<string>;
            subAccountsMapID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SignatureWithBytes> {
        const caller = signer || this.signer;

        const txb = new TransactionBlock();
        txb.setSender(this.walletAddress ?? caller.toSuiAddress());
        if (args.gasBudget) txb.setGasBudget(args.gasBudget);

        if (args.account) {
            const callArgs = [];

            callArgs.push(txb.object(args.subAccountsMapID || this.getSubAccountsID()));
            callArgs.push(txb.pure(args.account));
            callArgs.push(txb.pure(true));

            txb.moveCall({
                arguments: callArgs,
                target: `${this.getPackageID()}::roles::set_sub_account`
            });
        }

        for (const accountToRemove of args.accountsToRemove) {
            const callArgs = [];
            callArgs.push(txb.object(args.subAccountsMapID || this.getSubAccountsID()));
            callArgs.push(txb.pure(accountToRemove));
            callArgs.push(txb.pure(false));

            txb.moveCall({
                arguments: callArgs,
                target: `${this.getPackageID()}::roles::set_sub_account`
            });
        }

        if (this.is_wallet_extension) {
            const response: { transactionBlockBytes: string; signature: string } = await (
                caller as unknown as ExtendedWalletContextState
            ).signTransactionBlock(txb);
            return {
                bytes: response.transactionBlockBytes,
                signature: response.signature
            };
        } else {
            const bytes = toB64(
                await txb.build({ client: this.suiClient, onlyTransactionKind: false })
            );
            return caller.signWithIntent(fromB64(bytes), IntentScope.TransactionData);
        }
    }

    public async cancelOrder(
        args: {
            order: Order;
            signature: string;
            publicKey: string;
            subAccountsMapID?: string;
            gasBudget?: number;
            txHash?: string;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(this.getSequencer()), callArgs.push(this.getOrdersTableID());

        callArgs.push(args.order.market);
        callArgs.push(encodeOrderFlags(args.order));
        callArgs.push(args.order.price.toFixed(0));
        callArgs.push(args.order.quantity.toFixed(0));
        callArgs.push(args.order.leverage.toFixed(0));
        callArgs.push(args.order.expiration.toFixed(0));
        callArgs.push(args.order.salt.toFixed(0));
        callArgs.push(args.order.maker);
        callArgs.push(Array.from(hexStrToUint8(args.signature)));
        callArgs.push(Array.from(base64ToUint8(args.publicKey)));

        callArgs.push(
            args.txHash ||
                Buffer.from(sha256(JSON.stringify([...callArgs, getSalt()]))).toString(
                    "hex"
                )
        );

        return this.signAndCall(
            caller,
            "cancel_order",
            callArgs,
            "order",
            args.gasBudget
        );
    }

    public async setFundingRate(
        args: {
            rate: BigNumber;
            safeID?: string;
            updateFRCapID?: string;
            perpID?: string;
            market?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(SUI_CLOCK_OBJECT_ID);
        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.updateFRCapID || this.getFROperatorCapID());
        callArgs.push(args.perpID || this.getPerpetualID(args.market));
        callArgs.push(args.rate.absoluteValue().toString());
        callArgs.push(args.rate.isPositive());
        callArgs.push(this.getPriceOracleObjectId(args.market));

        return this.signAndCall(
            caller,
            "set_funding_rate_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async setDeleveragingOperator(
        args: {
            operator: string;
            adminID?: string;
            safeID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(args.safeID || this.getSafeID());

        callArgs.push(args.operator);

        return this.signAndCall(
            caller,
            "set_deleveraging_operator",
            callArgs,
            "roles",
            args.gasBudget
        );
    }

    public async setSubAccount(
        args: {
            account: string;
            status: boolean;
            subAccountsMapID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.subAccountsMapID || this.getSubAccountsID());
        callArgs.push(args.account);
        callArgs.push(args.status);

        return this.signAndCall(
            caller,
            "set_sub_account",
            callArgs,
            "roles",
            args.gasBudget
        );
    }

    public async depositToBank(
        args: {
            coinID: string;
            amount: string;
            txHash?: string;
            accountAddress?: string;
            bankID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(this.getSequencer());

        // temporary txHash, works as salt to make hash unique
        callArgs.push(getSalt());

        callArgs.push(args.accountAddress || caller.toSuiAddress());
        callArgs.push(args.amount);
        callArgs.push(args.coinID);

        if (!args.txHash) {
            args.txHash = Buffer.from(sha256(JSON.stringify(callArgs))).toString("hex");
        }

        callArgs[2] = args.txHash;

        const typeArguments = [this.getCoinType()];

        return this.signAndCall(
            caller,
            "deposit_to_bank",
            callArgs,
            "margin_bank",
            args.gasBudget,
            undefined,
            typeArguments
        );
    }

    public async setBankWithdrawalStatus(
        args: {
            isAllowed: boolean;
            bankID?: string;
            safeID?: string;
            guardianCap?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.guardianCap || this.getGuardianCap());
        callArgs.push(args.bankID || this.getBankID());
        callArgs.push(args.isAllowed);

        return this.signAndCall(
            caller,
            "set_withdrawal_status",
            callArgs,
            "margin_bank",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async setPerpetualTradingPermit(
        args: {
            isPermitted: boolean;
            market?: string;
            safeID?: string;
            guardianCap?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.safeID || this.getSafeID());
        callArgs.push(args.guardianCap || this.getGuardianCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.isPermitted);

        return this.signAndCall(
            caller,
            "set_trading_permit_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async withdrawFromBank(
        args: {
            amount: string;
            accountAddress?: string;
            txHash?: string;
            bankID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.bankID ? args.bankID : this.getBankID());
        callArgs.push(this.getSequencer());

        // temporary txHash, works as salt to make hash unique
        callArgs.push(getSalt());

        callArgs.push(args.accountAddress || caller.toSuiAddress());
        callArgs.push(args.amount);

        if (!args.txHash) {
            args.txHash = Buffer.from(sha256(JSON.stringify(callArgs))).toString("hex");
        }

        callArgs[2] = args.txHash;

        return this.signAndCall(
            caller,
            "withdraw_from_bank",
            callArgs,
            "margin_bank",
            args.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async withdrawAllMarginFromBank(
        signer?: Signer,
        walletAddress?: string,
        gasBudget?: number,
        bankID?: string,
        txHash?: string
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(bankID || this.getBankID());
        callArgs.push(this.getSequencer());

        // temporary txHash, works as salt to make hash unique
        callArgs.push(getSalt());
        callArgs.push(walletAddress || caller.toSuiAddress());

        if (!txHash) {
            txHash = Buffer.from(sha256(JSON.stringify(callArgs))).toString("hex");
        }

        callArgs[2] = txHash;

        return this.signAndCall(
            caller,
            "withdraw_all_margin_from_bank",
            callArgs,
            "margin_bank",
            gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    public async delistPerpetual(
        args: {
            price: string;
            market?: string;
            adminID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args.adminID || this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.price);

        return this.signAndCall(
            caller,
            "delist_perpetual_v2",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    public async closePosition(
        args?: {
            bankID?: string;
            perpID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args?.perpID || this.getPerpetualID());
        callArgs.push(args?.bankID || this.getBankID());

        return this.signAndCall(
            caller,
            "close_position",
            callArgs,
            "exchange",
            args?.gasBudget,
            undefined,
            [this.getCurrencyType()]
        );
    }

    /*
     * Removes empty position objects from on-chain position table
     * @param market: name of the market for which positions are to be removed
     * @param users: user addresses whose position are to be removed
     */
    public async removeEmptyPositions(
        args: {
            market: string;
            users: string[];
            gasBudget?: number;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(this.getSafeID());
        callArgs.push(this.getGuardianCap());
        callArgs.push(SUI_CLOCK_OBJECT_ID);
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(args.users);

        return this.signAndCall(
            caller,
            "remove_empty_positions",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    /**
     * @notice Allows admin to update the default maker fee of a perpetual
     * @param args:
     *  market: name of the perpetual/market
     *  fee: the maker fee to be charged from user on each tx NOTE: should be in bps 1.5/2.5
     */
    public async setMakerFee(
        args: { market: string; fee: number; gasBudget?: number },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];
        callArgs.push(this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.fee, 14));

        return this.signAndCall(
            caller,
            "set_maker_fee",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    /**
     * @notice Allows admin to update the default taker fee of a perpetual
     * @param args:
     *  market: name of the perpetual/market
     *  fee: the taker fee to be charged from user on each tx NOTE: should be in bps 1.5/2.5
     */
    public async setTakerFee(
        args: { market: string; fee: number; gasBudget?: number },
        signer?: Signer
    ) {
        const caller = signer || this.signer;
        const callArgs = [];
        callArgs.push(this.getExchangeAdminCap());
        callArgs.push(this.getPerpetualID(args.market));
        callArgs.push(toBigNumberStr(args.fee, 14));

        return this.signAndCall(
            caller,
            "set_taker_fee",
            callArgs,
            "perpetual",
            args.gasBudget
        );
    }

    /*
     * @notice allows exchange admin to set a specific maker/taker tx fee for a user
     * @param args:
     *  marketName: (optional) Name of the perpetual (ETH-PERP, BTC-PERP etc..) for which to set special fee
     *              Default is ETH-PERP
     *  account: address of the user
     *  status: status indicating if the maker/taker fee are to be applied or not
     *  makerFee the maker fee to be charged from user on each tx NOTE: should be in bps 1.5/2.5
     *  takerFee the taker fee to be charged from user on each tx NOTE: should be in bps 1.5/2.5
     *  adminID: (optional) exchange ownership object id
     *  gasBudget: (optional) the gas limit to be paid for call
     * @param signer: (optional) the caller performing the call
     */
    public async setSpecialFee(
        args: {
            adminID?: string;
            marketName?: string;
            account: string;
            status: boolean;
            makerFee: number;
            takerFee: number;
            gasBudget?: number;
        },
        options?: {
            gasBudget?: number;
            signer?: Signer;
            multiSig?: address;
        }
    ): Promise<SuiTransactionBlockResponse | string> {
        const caller = options?.signer || this.signer;

        const callArgs = [];

        const txb = new TransactionBlock();

        callArgs.push(txb.object(args.adminID || this.getExchangeAdminCap()));
        callArgs.push(txb.object(this.getPerpetualID(args.marketName)));
        callArgs.push(txb.pure(args.account));
        callArgs.push(txb.pure(args.status));
        callArgs.push(txb.pure(toBigNumberStr(args.makerFee, 14)));
        callArgs.push(txb.pure(toBigNumberStr(args.takerFee, 14)));

        if (options?.gasBudget) txb.setGasBudget(options?.gasBudget);

        txb.moveCall({
            arguments: callArgs,
            target: `${this.getPackageID()}::perpetual::set_special_fee_v2`
        });

        // if multi sig call return tx bytes
        if (options?.multiSig) {
            txb.setSender(options?.multiSig);
            return toB64(
                await txb.build({ client: this.suiClient, onlyTransactionKind: false })
            );
        } else {
            return this.executeTxBlock(txb, caller);
        }
    }

    async executeTxBlock(
        transactionBlock: TransactionBlock,
        signer?: Signer,
        options: SuiTransactionBlockResponseOptions = {
            showObjectChanges: true,
            showEffects: true,
            showEvents: true,
            showInput: true
        }
    ) {
        const caller = signer || this.signer;
        transactionBlock.setSenderIfNotSet(caller.toSuiAddress());
        const builtTransactionBlock = await transactionBlock.build({
            client: this.suiClient
        });
        const transactionSignature = await caller.signTransactionBlock(
            builtTransactionBlock
        );
        return this.executeSignedTxBlock(
            builtTransactionBlock,
            transactionSignature.signature,
            options
        );
    }

    /**
     * Executes provided signed transaction block
     * @param blockBytes bytes of the tx block
     * @param signature signature of the block
     * @returns
     */
    public async executeSignedTxBlock(
        blockBytes: string | Uint8Array,
        signature: string,
        options: SuiTransactionBlockResponseOptions = {
            showObjectChanges: true,
            showEffects: true,
            showEvents: true,
            showInput: true
        }
    ) {
        return this.suiClient.executeTransactionBlock({
            transactionBlock: blockBytes,
            signature: signature,
            options
        });
    }

    /*
     * Note that this function will only work on Pyth fake contract
     * and can only be used for testing
     */
    public async createOracleObjects(signer?: Signer) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(SUI_CLOCK_OBJECT_ID);

        return this.signAndCall(caller, "create_price_obj", callArgs, "price_info");
    }

    /*
     * Creates the margin bank object
     * @param usdcAddress address of the coin supported by bank
     */
    public async createBank(usdcAddress: string, gasBudget?: number, signer?: Signer) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(this.getExchangeAdminCap());
        callArgs.push(usdcAddress);

        return this.signAndCall(
            caller,
            "create_bank",
            callArgs,
            "margin_bank",
            gasBudget,
            undefined,
            [`${usdcAddress}::coin::COIN`]
        );
    }

    /*
     * Creates the sequencer object
     */
    public async createSequencer(signer?: Signer) {
        const caller = signer || this.signer;

        const callArgs = [];
        callArgs.push(this.getExchangeAdminCap());

        return this.signAndCall(caller, "create_sequencer", callArgs, "roles");
    }

    /*
     * @dev updates oracle price on pyth contract.
     * Note that this function will only work on our own deployed Fake Pyth contract
     */
    public async setOraclePrice(
        args: {
            price: number;
            confidence?: string;
            market?: string;
        },
        signer?: Signer
    ) {
        const caller = signer || this.signer;

        const callArgs = [];
        const pythPkg = this.getPythPkgId(args.market);
        callArgs.push(this.getPriceOracleObjectId(args.market));
        callArgs.push(SUI_CLOCK_OBJECT_ID);
        callArgs.push(args.price * 1e6);
        callArgs.push(args.confidence || "10");
        callArgs.push(hexToString(this.getPriceOracleFeedId(args.market)));

        return this.signAndCall(
            caller,
            "update_price_info_object_for_test",
            callArgs,
            "price_info",
            undefined,
            pythPkg
        );
    }

    /**
     * Returns price of oracle
     * @param market name of the market for which oracle price is to be fetched
     * @returns oracle price in base number
     */
    public async getOraclePrice(market?: string): Promise<number> {
        const id = this.getPriceOracleObjectId(market);
        const obj = await this.getOnChainObject(id);
        const fields = (obj.data?.content as any).fields.price_info.fields.price_feed
            .fields.price.fields;

        return (
            Number(fields.price.fields.magnitude) /
            Math.pow(10, Number(fields.expo.fields.magnitude))
        );
    }

    public async mintUSDC(
        args?: {
            amount?: string;
            to?: string;
            treasuryCapID?: string;
            gasBudget?: number;
        },
        signer?: Signer
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const callArgs = [];

        callArgs.push(args?.treasuryCapID || this.getTreasuryCapID());

        callArgs.push(args?.amount || toBigNumberStr(1_000_000_000, USDC_BASE_DECIMALS));

        callArgs.push(args?.to || caller.toSuiAddress());

        return this.signAndCall(caller, "mint", callArgs, "coin");
    }

    public async getUSDCCoins(
        args?: {
            address?: string;
            currencyType?: string;
            limit?: number;
            cursor?: string;
        },
        signer?: Signer
    ): Promise<any> {
        const caller = signer || this.signer;
        const coins = await this.suiClient.getCoins({
            owner: args?.address || caller.toSuiAddress(),
            coinType: args?.currencyType || this.getCoinType(),
            cursor: args?.cursor ?? null,
            limit: args?.limit ?? null
        });

        return coins;
    }

    /**
     * Merges All USDC Coins to single coin
     * @param coinType [optional] coinType of USDC coin , if not provided will get from deployment json
     * @param signer the signer object of the wallet that owns USDC coins
     * @returns transaction result
     */

    async mergeAllUsdcCoins(coinType?: string, signer?: Signer | any, address?: string) {
        const caller = signer || (this.signer as any);
        const tx = new TransactionBlock();
        const coins = await this.suiClient.getCoins({
            coinType: coinType || this.getCoinType(),
            owner: address || caller.toSuiAddress()
        });

        if (coins.data.length <= 1) {
            throw new Error("User must have at least two coins to perform merge");
        }

        const destCoinId = tx.object(coins.data[0].coinObjectId);
        // Get all source coinIds other than First One (dest Coin)
        const srcCoinIds = coins.data.slice(1).map((coin: any) => {
            return tx.object(coin.coinObjectId);
        });
        tx.mergeCoins(destCoinId, srcCoinIds);

        if (this.is_zkLogin) {
            return this.executeZkTransaction({ tx, caller });
        } else if (this.is_wallet_extension) {
            return this.executeWalletTransaction({ tx, caller });
        } else {
            return this.executeTxBlock(tx, caller);
        }
    }

    /**
     * Transfers Sui Balance to given wallet address
     * @param args.to destination wallet address
     * @param args.balance sui balance in normal base to transfer to destination wallet address
     * @param signer the signer object of the wallet that owns sui to transfer
     * @returns transaction Result
     */
    async transferSuiBalance(args: { to: string; balance: number }, signer?: Signer) {
        const caller = signer || this.signer;
        const txb = new TransactionBlock();

        const transferAmount = toBigNumber(args.balance, SUI_NATIVE_BASE);
        const existingBalance = BigNumber(
            await this.getUserSuiBalance(caller.toSuiAddress())
        );

        if (existingBalance.lte(transferAmount)) {
            throw new Error("owner has not enough sui tokens to transfer");
        }

        // First, split the gas coin into multiple coins using gas coin:
        const coin = txb.splitCoins(txb.gas, [
            txb.pure(toBigNumberStr(args.balance, SUI_NATIVE_BASE))
        ]);
        txb.transferObjects([coin], txb.pure(args.to));
        return this.executeTxBlock(txb, caller);
    }

    public async getUSDCBalance(
        args?: {
            address?: string;
            currencyID?: string;
            limit?: number;
            cursor?: string;
        },
        signer?: Signer
    ): Promise<number> {
        const coins = await this.getUSDCCoins(args, signer);
        if (coins.data.length == 0) {
            return 0;
        } else {
            const bal = coins.data.reduce(
                (total: number, coin: any) => total + +coin.balance,
                0
            );
            return usdcToBaseNumber(bal);
        }
    }

    public async getUSDCoinHavingBalance(
        args: {
            amount: BigNumberable;
            address?: string;
            currencyID?: string;
            limit?: number;
            cursor?: string;
        },
        signer?: Signer
    ) {
        // get all usdc coins
        const coins = await this.getUSDCCoins(args, signer);

        for (const coin of coins.data) {
            if (
                bigNumber(coin.balance).gte(toBigNumber(args.amount, USDC_BASE_DECIMALS))
            ) {
                return coin;
            }
        }
        return undefined;
    }

    private executeZkTransaction = async ({
        tx,
        caller
    }: {
        tx: TransactionBlock;
        caller: Keypair;
    }) => {
        tx.setSender(this.walletAddress);
        const { bytes, signature: userSignature } = await tx.sign({
            client: this.suiClient,
            signer: caller
        });
        const zkSignature = createZkSignature({
            userSignature,
            zkPayload: this.getZkPayload()
        });
        return this.suiClient.executeTransactionBlock({
            transactionBlock: bytes,
            signature: zkSignature,
            options: {
                showObjectChanges: true,
                showEffects: true,
                showEvents: true,
                showInput: true
            }
        });
    };

    private executeWalletTransaction = ({
        caller,
        tx
    }: {
        caller: any;
        tx: TransactionBlock;
    }): Promise<SuiTransactionBlockResponse> => {
        return caller.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            options: {
                showObjectChanges: true,
                showEffects: true,
                showEvents: true,
                showInput: true
            }
        });
    };

    public async signAndCall(
        signer: Signer | any,
        method: string,
        callArgs: any[],
        moduleName: string,
        gasBudget?: number,
        packageId?: string,
        typeArguments?: string[]
    ): Promise<SuiTransactionBlockResponse> {
        const caller = signer || this.signer;

        const tx = new TransactionBlock();

        try {
            if (gasBudget) tx.setGasBudget(gasBudget);

            const params = callArgs.map(v => tx.pure(v));

            packageId = packageId || this.getPackageID();

            tx.moveCall({
                target: `${packageId}::${moduleName}::${method}`,
                arguments: params,
                typeArguments: typeArguments || []
            });

            if (this.is_zkLogin) {
                return this.executeZkTransaction({ caller, tx });
            } else if (this.is_wallet_extension) {
                return this.executeWalletTransaction({ caller, tx });
            } else {
                return this.executeTxBlock(tx, caller);
            }
        } catch (error) {
            console.log(Transaction.getDryRunError(String(error)));
            console.log(error, "error block in sign");
        }
    }

    // ===================================== //
    //          SETTER METHODS
    // ===================================== //

    setSettlementCap(id: string) {
        this.settlementCap = id;
    }

    // ===================================== //
    //          GETTER METHODS
    // ===================================== //

    /**
     * Get Sui Balance of given wallet address
     * @param user wallet address to get the sui balance of
     * @returns sui balance of user in base 9
     */

    async getUserSuiBalance(user?: string): Promise<string> {
        const address = user || this.signer.toSuiAddress();
        const suiCoin = await this.suiClient.getBalance({
            owner: address
        });
        return suiCoin?.totalBalance;
    }

    async getOnChainObject(id: string): Promise<SuiObjectResponse> {
        return this.suiClient.getObject({
            id,
            options: {
                showOwner: true,
                showContent: true,
                showType: true
            }
        });
    }

    async getOwnedObjects(objType: string, ownerAddr?: string): Promise<string[]> {
        const owner = ownerAddr || this.signer.toSuiAddress();
        const ownedObjIds: string[] = [];
        // get all owned object by the user, along with its type
        const objects = await this.suiClient.getOwnedObjects({
            owner,
            options: { showType: true }
        });

        for (const obj of objects.data) {
            // if the type matches, push the id of object
            if ((obj.data?.type as any).indexOf(objType) >= 0) {
                ownedObjIds.push(obj.data?.objectId as any as string);
            }
        }

        return ownedObjIds;
    }

    async getUserPosition(perpetual: string, user?: string): Promise<UserPosition> {
        const positionTable = this.getPositionsTableID(perpetual);
        const userPos = await this.suiClient.getDynamicFieldObject({
            parentId: positionTable,
            name: {
                type: "address",
                value: user || this.signer.toSuiAddress()
            }
        });

        if (userPos.error?.code == "dynamicFieldNotFound") {
            throw new Error("Given user has never opened on-chain position");
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (userPos?.data?.content as any).fields.value.fields;
    }

    async getUserPositionFromID(id: string): Promise<UserPosition> {
        const details = await this.getOnChainObject(id);
        return (details?.data?.content as any).fields.value.fields;
    }

    async getPerpDetails(id: string): Promise<any> {
        const details = await this.getOnChainObject(id);
        return (details?.data?.content as any).fields;
    }

    public async getBankAccountDetailsUsingID(
        id: string
    ): Promise<BankAccountDetails | undefined> {
        const obj = await this.getOnChainObject(id);
        if (obj) {
            if ((obj.data?.type as string).indexOf("BankAccount") > 0) {
                return this._parseAccountDetails(obj);
            } else {
                return undefined;
            }
        } else {
            throw `No object found with id: ${id}`;
        }
    }

    public async getUserBankBalance(user?: string, bankID?: string): Promise<BigNumber> {
        try {
            const userBalance = await this.suiClient.getDynamicFieldObject({
                parentId: bankID || this.getBankTableID(),
                name: {
                    type: "address",
                    value: user || this.signer.toSuiAddress()
                }
            });

            return new BigNumber(
                (userBalance.data as any).content.fields.value.fields.balance
            );
        } catch (e) {
            console.log(e);
            return new BigNumber(0);
        }
    }

    getPriceOracleObjectId(market = "ETH-PERP"): string {
        return this.deployment["markets"][market]["Objects"]["PriceOracle"]["id"];
    }

    getPriceOracleFeedId(market = "ETH-PERP"): string {
        return this.deployment["markets"][market]["Config"]["priceInfoFeedId"];
    }

    getPythPkgId(market = "ETH-PERP"): string {
        return this.deployment["markets"][market]["Objects"]["PriceOracle"][
            "dataType"
        ].split("::")[0];
    }

    getSettlementOperators(): Operator[] {
        return this.deployment["objects"]["settlementOperators"] || [];
    }

    getBankID(): string {
        return this.deployment["objects"]["Bank"].id;
    }

    getUpgradeCapID(): string {
        return this.deployment["objects"]["UpgradeCap"].id;
    }

    getSafeID(): string {
        return this.deployment["objects"]["CapabilitiesSafe"].id as string;
    }

    getGuardianCap(): string {
        return this.deployment["objects"]["ExchangeGuardianCap"].id as string;
    }

    getFROperatorCapID(): string {
        return this.deployment["objects"]["FundingRateCap"].id as string;
    }

    getDeleveragingCapID(): string {
        return this.deployment["objects"]["DeleveragingCap"].id as string;
    }

    getSettlementOperatorTable(): string {
        return this.deployment["objects"]["Table<address, bool>"].id as string;
    }

    getPackageID(): string {
        return this.deployment["objects"]["package"].id as string;
    }

    getExchangeAdminCap(): string {
        return this.deployment["objects"]["ExchangeAdminCap"].id as string;
    }

    getSubAccountsID(): string {
        return this.deployment["objects"]["SubAccounts"].id as string;
    }

    getPriceOracleOperatorCap(): string {
        return this.deployment["objects"]["PriceOracleOperatorCap"].id as string;
    }

    getPublicSettlementCap(): string {
        return this.deployment["objects"]["SettlementCap"].id as string;
    }

    // by default returns the perpetual id of 1st market
    getPerpetualID(market = "ETH-PERP"): string {
        return this.deployment["markets"][market]["Objects"]["Perpetual"].id as string;
    }

    getOrdersTableID(): string {
        return this.deployment["objects"]["OrderStatus"].id as string;
    }

    getPositionsTableID(market = "ETH-PERP"): string {
        return this.deployment["markets"][market]["Objects"]["PositionsTable"]
            .id as string;
    }

    getBankTableID(): string {
        return this.deployment["objects"]["BankTable"].id as string;
    }

    getDeployerAddress(): string {
        return this.deployment["deployer"] as string;
    }

    getCurrencyID(): string {
        return this.deployment["objects"]["Currency"].id as string;
    }

    getCoinType(): string {
        return this.deployment["objects"]["Currency"].dataType as string;
    }

    getBankType(): string {
        return this.deployment["objects"]["Bank"]["dataType"];
    }

    getCurrencyType(): string {
        return this.deployment["objects"]["Currency"]["dataType"] as string;
    }

    getTreasuryCapID(): string {
        return this.deployment["objects"]["TreasuryCap"].id as string;
    }

    getSequencer(): string {
        return this.deployment["objects"]["Sequencer"].id as string;
    }

    // ===================================== //
    //          HELPER METHODS
    // ===================================== //

    _parseAccountDetails(obj: any): BankAccountDetails {
        return {
            address: obj.data.content.fields.value.fields.owner,
            balance: bigNumber(obj.data.content.fields.value.fields.balance)
        } as BankAccountDetails;
    }

    getZkPayload = (): ZkPayload => {
        return {
            decodedJWT: this.decodedJWT,
            proof: this.proof,
            salt: this.salt,
            maxEpoch: this.maxEpoch
        };
    };
}
