import { CanBeData, Script, ScriptType, forceData } from "@harmoniclabs/plu-ts"
import { CanBeUTxORef, forceUTxORefString } from "../CanBeUTxORef"
import { CardanoCliPlutsBaseError } from "../../../../errors/ CardanoCliPlutsBaseError"
import { ICliCmdConfig } from "../../CliCmd"
import { OrPath } from "../../../../utils/path/withPath"
import ObjectUtils from "../../../../utils/ObjectUtils"
import { ensurePath } from "../../../../utils/path/ensurePath"
import { writeDataAsCbor } from "../tx_build_utils"

export interface ICliTxBuildIn {
    utxo: CanBeUTxORef,
    referenceScriptV2?: {
        refUtxo: CanBeUTxORef,
        datum: CanBeData | "inline",
        redeemer: CanBeData,
    }
    inputScript?: {
        script: OrPath<Script>,
        datum: CanBeData | "inline",
        redeemer: CanBeData
    }
}

export function toInputBuildOptions(
    cfg: Readonly<ICliCmdConfig>
): (inputOptions: ICliTxBuildIn) => Promise<string>
{
    return async function ({
        utxo,
        referenceScriptV2,
        inputScript
    }: ICliTxBuildIn): Promise<string>
    {
        const utxoRefStr = forceUTxORefString( utxo );
        let result = ` --tx-in ${utxoRefStr} `;

        if( referenceScriptV2 !== undefined )
        {
            if( inputScript !== undefined )
            throw new CardanoCliPlutsBaseError(
                "multiple spending scripts specified for " + utxoRefStr
            );

            result +=
            ` --spending-tx-in-reference ${forceUTxORefString( referenceScriptV2.refUtxo )} \
            --spending-plutus-script-v2 `;

            if( referenceScriptV2.datum === "inline" )
            result += " --spending-reference-tx-in-inline-datum-present ";
            else
            {
                result += ` --spending-reference-tx-in-datum-cbor-file ${
                    await writeDataAsCbor(
                        forceData( referenceScriptV2.datum ),
                        cfg.tmpDirPath
                    )
                } `;
            }

            result += ` --spending-reference-tx-in-redeemer-cbor-file ${
                await writeDataAsCbor(
                    forceData( referenceScriptV2.redeemer ),
                    cfg.tmpDirPath
                )
            } `;

        }
        else if( inputScript !== undefined )
        {
            if( !ObjectUtils.hasOwn( inputScript.script, "path" ) || inputScript.script.path === undefined )
            {
                await ensurePath(
                    Script,
                    inputScript.script,
                    {
                        postfix: "script",
                        tmpDirPath: cfg.tmpDirPath,
                        jsonType: (inputScript?.script as any).type ?? ScriptType.PlutusV2
                    }
                );
            }

            result += ` --tx-in-script-file ${(inputScript.script as any).path} `;

            if( inputScript.datum === "inline" )
            result += " --tx-in-inline-datum-present ";
            else
            {
                result += ` --tx-in-datum-cbor-file ${
                    await writeDataAsCbor(
                        forceData( inputScript.datum ),
                        cfg.tmpDirPath
                    )
                } `;
            }

            result += ` --tx-in-redeemer-cbor-file ${
                await writeDataAsCbor(
                    forceData( inputScript.redeemer ),
                    cfg.tmpDirPath
                )
            } `;

        }

        return result;
    }
}