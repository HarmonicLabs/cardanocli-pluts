import { Hash32, Script, Value } from "@harmoniclabs/plu-ts"
import { CanBeData } from "../../../utils/CanBeData"
import { CanBeUTxORef } from "./CanBeUTxORef"

export interface ICliTxBuildMint {
    value: Value
    script: {
        inline: Script
        redeemer: CanBeData
    } | {
        ref: CanBeUTxORef
        policyId: Hash32 | string
        redeemer: CanBeData
    }
};