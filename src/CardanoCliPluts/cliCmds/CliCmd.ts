import { ProtocolParamters } from "@harmoniclabs/plu-ts"
import ObjectUtils from "../../utils/ObjectUtils"

export interface ICliCmdConfig {
    readonly network: "mainnet" | `testnet-magic ${number}`
    readonly cliPath: string,
    readonly tmpDirPath: string,
    readonly socketPath: string,
    readonly getProtocolParamsPath: () => Promise<string>
}

export class CliCmd
{
    readonly cfg!: ICliCmdConfig

    constructor( cfg: ICliCmdConfig )
    {
        ObjectUtils.defineReadOnlyProperty(
            this, "cfg", ObjectUtils.freezeAll( cfg )
        )
    }
}