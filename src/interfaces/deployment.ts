import { OBJECT_OWNERSHIP_STATUS } from "../enums";
import { MarketDetails } from "./market";

export interface Object {
    id: string;
    dataType: string;
}

export interface DeploymentObjects extends Object {
    owner: OBJECT_OWNERSHIP_STATUS;
}

export interface DeploymentObjectMap {
    [dataType: string]: DeploymentObjects;
}

export interface DeploymentData {
    deployer: string;
    objects: DeploymentObjectMap;
    markets: MarketsMap;
}

export interface MarketDeploymentData {
    Objects: DeploymentObjectMap;
    Config: MarketDetails;
}

export interface MarketsMap {
    [marketName: string]: MarketDeploymentData;
}

export interface DeploymentConfig {
    network: Network;
    deployer: string;
    filePath: string;
    markets: MarketDetails[];
}

export interface Network {
    name: string;
    rpc: string;
    faucet: string;
}
