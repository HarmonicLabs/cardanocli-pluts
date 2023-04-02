import { CanBeData, Hash32, Script, Value } from "@harmoniclabs/plu-ts"
import { CanBeUTxORef } from "../CanBeUTxORef"
import { OrPath } from "../../../../utils/path/withPath"

export interface ICliTxBuildMint {
    value: Value
    script: {
        inline: OrPath<Script>
        redeemer: CanBeData
    } | {
        ref: CanBeUTxORef
        policyId: Hash32 | string
        redeemer: CanBeData
    }
};