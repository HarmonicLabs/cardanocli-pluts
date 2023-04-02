import { Address, AddressStr, CanBeData, Hash32, Script, Value, dataToCbor, forceData } from "@harmoniclabs/plu-ts"
import { ICliCmdConfig } from "../../CliCmd"
import { OrPath } from "../../../../utils/path/withPath"
import ObjectUtils from "../../../../utils/ObjectUtils"
import { ensurePath } from "../../../../utils/path/ensurePath"
import { writeCborFile } from "../tx_build_utils"

export interface ICliTxBuildOut {
    address: Address | AddressStr,
    value: Value,
    datum?: Hash32 | CanBeData
    refScript?: OrPath<Script>
}


export function toOutputBuildOptions(
    cfg: Readonly<ICliCmdConfig>
): (inputOptions: ICliTxBuildOut) => Promise<string>
{
    return async function ({
        address,
        value,
        datum,
        refScript
    }: ICliTxBuildOut): Promise<string>
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
                result += ` --tx-out-inline-datum-cbor-file ${
                    await writeCborFile(
                        dataToCbor( forceData( datum ) ),
                        cfg.tmpDirPath,
                        "data"
                    )
                } `
            }
        }

        if( refScript !== undefined )
        {
            if( !ObjectUtils.hasOwn( refScript, "path" ) )
            {
                await ensurePath(
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

export function valueToString( value: Value, includeLovelaces = true ): string
{
    let valueStr = "";
    const valueMap = value.map;

    if( includeLovelaces )
    valueStr +=`+${value.lovelaces.toString()}`;

    if( Value.isAdaOnly( value ) ) return valueStr;

    valueStr += includeLovelaces ? '+"' : '"' ;

    for(const { policy, assets } of valueMap)
    {
        if( policy === "" ) continue;

        for(const assetNameAscii in assets)
        {
            valueStr += `${
                value.get(policy,assetNameAscii)
                .toString()
            } ${
                policy.toString()
            }.${
                Buffer.from( assetNameAscii, "ascii" ).toString("hex")
            }+`;
        }
    }

    valueStr = valueStr.slice( 0, valueStr.length - 1 ) + '"';

    return valueStr;
}
