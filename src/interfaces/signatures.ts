import { address } from "../types";

export interface WithdrawMargin{
    package: string,
    method: string,
    bank:address,
    src: address,
    dest: address,
    amount: string,
    salt: number,
}