import { AnyCertificate, Script } from "@harmoniclabs/plu-ts"
import { CanBeData } from "../../../../utils/CanBeData"
import { OrPath } from "../../../../utils/path/withPath"
import { CanBeUTxORef } from "../CanBeUTxORef"

export interface ICliTxBuildCert {
    cert: OrPath<AnyCertificate>
    script?: {
        inline: OrPath<Script>
        redeemer: CanBeData
    } | {
        ref: CanBeUTxORef
        redeemer: CanBeData
    }
};