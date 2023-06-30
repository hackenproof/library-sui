import { config, DotenvParseOutput } from "dotenv";
import * as dotenvParseVariables from "dotenv-parse-variables";

export function parseEnv<T>(path: string): T {
    const _env = config({ path });
    return {
        ...process.env,
        ...dotenvParseVariables["default"](
            Object.keys(_env?.parsed || {}).reduce((a, b) => {
                return {
                    ...a,
                    [b]: process.env[b] || (_env.parsed as DotenvParseOutput)[b]
                };
            }, {}),
            {
                assignToProcessEnv: true,
                overrideProcessEnv: false
            }
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as T;
}
