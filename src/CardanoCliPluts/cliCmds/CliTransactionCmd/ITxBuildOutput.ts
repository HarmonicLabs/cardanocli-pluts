import { Address, AddressStr, Hash32, Script, Value } from "@harmoniclabs/plu-ts"
import { CanBeData, forceData } from "../../../utils/CanBeData"
import { ICliCmdConfig } from "../CliCmd"
import { OrPath } from "../../../utils/path/withPath"
import ObjectUtils from "../../../utils/ObjectUtils"
import { ensurePath } from "../../../utils/path/ensurePath"

export interface ICliTxBuildOut {
    address: Address | AddressStr,
    value: Value,
    datum?: Hash32 | CanBeData
    refScript?: OrPath<Script>
}


export function toOutputBuildOptions(
    cfg: Readonly<ICliCmdConfig>
): (inputOptions: ICliTxBuildOut) => string
{
    return function ({
        address,
        value,
        datum,
        refScript
    }: ICliTxBuildOut): string
    {
        let result = " --tx-out " +
        address.toString() +
        valueToString( value );

        if( datum !== undefined )
        {
            if( datum instanceof Hash32 )
            result += ` --tx-out-datum-hash ${datum.asString} `;
            else
            {
                result += ` --tx-out-inline-datum-value ${
                    JSON.stringify(
                        forceData( datum )
                        .toJson()
                    )
                } `
            }
        }

        if( refScript !== undefined )
        {
            if( !ObjectUtils.hasOwn( refScript, "path" ) )
            {
                ensurePath(
                    Script,
                    refScript,
                    {
                        postfix: "script",
                        tmpDirPath: cfg.tmpDirPath,
                        jsonType: refScript.type
                    }
                );
            }

            result += ` --tx-out-reference-script-file ${(refScript as any).path} `
        }

        return result;
    }
}

export function toReturnCollateralOpt( collRet: {
    address: Address | AddressStr,
    value: Value
} | undefined ): string
{
    return collRet === undefined ? "" : ` --tx-out-return-collateral ${collRet.address.toString()} ${valueToString(collRet.value)} `;
}

export function valueToString( value: Value ): string
{
    return value.map.map( ({ policy, assets }) =>

        Object.keys( assets )
        .map( assetNameAscii =>

            policy === "" ? `+${(assets as any)[assetNameAscii].toString()}` :
            
            (assets as any)[assetNameAscii].toString() + 
            `${policy.asString}.` + 
            Buffer.from( assetNameAscii, "ascii" )
            .toString("hex")
            
        )
        .join(" + ")

    ).join(" + ");
}