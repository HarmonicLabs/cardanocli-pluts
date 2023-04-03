import { Hash32 } from "@harmoniclabs/plu-ts";

export interface CliQueryTipResult {
    block: number,
    epoch: number,
    era: string,
    hash: Hash32,
    slot: number,
    syncProgress: number
}