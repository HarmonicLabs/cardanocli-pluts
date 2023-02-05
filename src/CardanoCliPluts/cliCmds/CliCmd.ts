import ObjectUtils from "../../utils/ObjectUtils"

export interface ICliCmdConfig {
    readonly network: "mainnet" | `testnet ${number}`
    readonly cliPath: string,
    readonly tmpDirPath: string
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