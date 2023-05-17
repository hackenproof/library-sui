import { Client } from "../src";
import path from "path";

async function main() {
    const dir = path.resolve(__dirname);
    const pkgDir = path.join(dir, "../bluefin_foundation");
    Client.buildPackage(pkgDir);
}

main();
