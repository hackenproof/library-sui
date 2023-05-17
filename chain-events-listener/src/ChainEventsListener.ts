import { JsonRpcProvider, SuiEventFilter } from "@mysten/sui.js";

import { listenerCallback } from "./Types";

class ChainEventListener {
    readonly rpcURL: string;

    readonly provider: JsonRpcProvider;

    private listenerSubscriptionId: number | null = null;

    /**
     * @notice constructor to intialise the object of class
     * @param _rpcURL http address of the chain rpc node
     */
    constructor(_rpcURL: string) {
        // assign rpc url
        this.rpcURL = _rpcURL;

        // provider object
        this.provider = new JsonRpcProvider(_rpcURL);

        // allow 100 events to be received per sec
        // this.provider._maxFilterBlockRange = 100;
    }

    /**
     * @notice starts listeners for all the events for all the contracts which are not already running.
     */
    async startListeners(
        eventsFilter: SuiEventFilter,
        callback: listenerCallback
    ): Promise<boolean> {
        this.listenerSubscriptionId = await this.provider.subscribeEvent(
            eventsFilter,
            callback
        );
        return true;
    }

    /**
     * @notice closes all listeners on all the contracts
     */
    async closeAllListeners(): Promise<boolean> {
        if (!this.listenerSubscriptionId) {
            return false;
        }

        await this.provider.unsubscribeEvent(this.listenerSubscriptionId);
        this.listenerSubscriptionId = null;
        return true;
    }
}

export { ChainEventListener };
