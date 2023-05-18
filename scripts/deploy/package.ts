import {
    writeFile,
    getGenesisMap,
    getSignerFromSeed,
    getProvider,
    publishPackageUsingClient,
    getDeploymentData
} from "../../src/utils";
import { DeploymentConfigs } from "../../src/DeploymentConfig";
import { Client, Transaction } from "../../src/classes";

const provider = getProvider(
    DeploymentConfigs.network.rpc,
    DeploymentConfigs.network.faucet
);
const signer = getSignerFromSeed(DeploymentConfigs.deployer, provider);
async function main() {
    // info
    console.log(`Publishing package on: ${DeploymentConfigs.network.rpc}`);

    const deployerAddress = await signer.getAddress();
    console.log(`Deployer SUI address: ${deployerAddress}`);

    if (!Client.switchEnv(DeploymentConfigs.network.name)) {
        process.exit(1);
    }

    if (!Client.switchAccount(deployerAddress)) {
        process.exit(1);
    }

    // public package
    const publishTxn = await publishPackageUsingClient();

    console.log("Package published");

    const status = Transaction.getStatus(publishTxn);
    console.log("Status:", status);

    if (status == "success") {
        // fetch created objects
        const objects = await getGenesisMap(provider, publishTxn);

        const deploymentData = getDeploymentData(deployerAddress, objects);

        await writeFile(DeploymentConfigs.filePath, deploymentData);
        console.log(`Object details written to file: ${DeploymentConfigs.filePath}`);
    }
}

main();
