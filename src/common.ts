import { config, DotenvParseOutput } from "dotenv";
import { pino } from "pino";
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

/**
 * log - will be used with following methods to record the events
 ** trace - all the steps during the application execution
 ** debug - most of the steps'
 ** info - for each completed functional transaction/task.
 ** warn - out of regular events but not an error.
 ** error - when logic is broken, but it does not affect the whole application
 ** fatal - when the application is halted
 */
const pinoLogger = pino({
    enabled: true,
    base: undefined,
    level: "info",
    formatters: {
        level: label => {
            return { level: label };
        }
    }
});

export const log = pinoLogger;
