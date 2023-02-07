import { Script, StakeAddress, StakeAddressBech32 } from "@harmoniclabs/plu-ts"
import { CanBeData } from "../../../utils/CanBeData"
import { OrPath } from "../../../utils/path/withPath"
import { CanBeUTxORef } from "./CanBeUTxORef"

export interface ICliTxBuildWithdrawal {
    withdrawal: {
        rewardAccount: StakeAddress | StakeAddressBech32
        amount: number | bigint
    },
    script?: {
        inline: OrPath<Script>
        redeemer: CanBeData
    } | {
        ref: CanBeUTxORef
        redeemer: CanBeData
    }
};